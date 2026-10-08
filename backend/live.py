"""Live and replayed session state built from OpenF1 data.

A snapshot is computed for any instant ``t`` inside a session: live mode asks
for "now", replay mode walks a client-side clock through a finished session.
Bulk feeds are loaded once (replay) or refreshed lazily on demand (live); car
locations are fetched in fixed time buckets because a whole session is too big.
"""
import asyncio
from bisect import bisect_right
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
import time

from backend.openf1 import LiveDataError

LIVE_WINDOW = timedelta(minutes=30)  # OpenF1 treats +/-30 min around a session as live.
LIVE_DELAY = 5.0  # Seconds behind real time so upstream data has arrived.
BUCKET = 30.0  # Seconds of car locations per upstream request.
LOCATION_MAX_AGE = 10.0  # Hide cars with no location sample this recent.
PIT_LANE_FALLBACK = 25.0
FEEDS = ("drivers", "position", "intervals", "laps", "stints", "pit", "race_control", "weather")
# Live refresh intervals in seconds; replay sessions load every feed once.
LIVE_TTL = {"position": 6, "intervals": 6, "race_control": 10, "laps": 20, "stints": 20,
            "pit": 20, "weather": 60, "championship_drivers": 60, "drivers": 120}
INCREMENTAL = {"position", "intervals"}  # Fetched with a date> cursor while live.


def ts(value):
    return datetime.fromisoformat(value).timestamp()


def iso(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat()


class DriverSeries:
    """Per-driver time-ordered rows with "latest at or before t" lookup."""

    def __init__(self, rows, key="date"):
        self.times, self.rows = {}, {}
        for row in sorted((r for r in rows if r.get(key)), key=lambda r: r[key]):
            number = row.get("driver_number")
            self.times.setdefault(number, []).append(ts(row[key]))
            self.rows.setdefault(number, []).append(row)

    def latest(self, number, t):
        i = bisect_right(self.times.get(number, []), t)
        return (self.times[number][i - 1], self.rows[number][i - 1]) if i else (None, None)

    def upto(self, number, t):
        return self.rows.get(number, [])[:bisect_right(self.times.get(number, []), t)]


def is_live(session, now=None):
    now = now or datetime.now(timezone.utc)
    start, end = datetime.fromisoformat(session["date_start"]), datetime.fromisoformat(session["date_end"])
    return start - LIVE_WINDOW <= now <= end + LIVE_WINDOW


class LiveSession:
    def __init__(self, client, session, clock=time.time):
        self.client, self.session, self.clock = client, session, clock
        self.key = session["session_key"]
        self.live = is_live(session, datetime.fromtimestamp(clock(), timezone.utc))
        self.feeds = {name: [] for name in (*FEEDS, "championship_drivers")}
        self.fetched_at = {}
        self.track = None
        self._track_checked = 0.0
        self.locations = OrderedDict()  # bucket start -> (fetched_at, DriverSeries)
        self._pending = {}
        self._lock = asyncio.Lock()
        self._index()

    # ---------------- loading ----------------
    def _index(self):
        f = self.feeds
        self.drivers = {d["driver_number"]: d for d in f["drivers"]}
        self.positions = DriverSeries(f["position"])
        self.intervals = DriverSeries(f["intervals"])
        self.laps = DriverSeries(f["laps"], key="date_start")
        self.pits = DriverSeries(f["pit"])
        self.race_control = sorted(f["race_control"], key=lambda r: r["date"])
        self.race_control_times = [ts(r["date"]) for r in self.race_control]
        self.weather = sorted(f["weather"], key=lambda r: r["date"])
        self.weather_times = [ts(r["date"]) for r in self.weather]

    def _stale(self, feed):
        if feed not in self.fetched_at:
            return True
        return self.live and self.clock() - self.fetched_at[feed] >= LIVE_TTL[feed]

    async def _refresh(self, feed):
        params = {"session_key": self.key}
        rows = self.feeds[feed]
        if self.live and feed in INCREMENTAL and rows:
            params["date>"] = max(r["date"] for r in rows)
            new = await self.client.get(feed, **params)
            self.feeds[feed] = rows + new
        elif feed == "championship_drivers" and self.session.get("session_type") != "Race":
            self.feeds[feed] = []
        else:
            self.feeds[feed] = await self.client.get(feed, **params)
        self.fetched_at[feed] = self.clock()

    async def ensure_loaded(self):
        async with self._lock:
            stale = [feed for feed in (*FEEDS, "championship_drivers") if self._stale(feed)]
            for feed in stale:
                await self._refresh(feed)
            if stale:
                self._index()
            if self.track is None and self.clock() - self._track_checked > 30:
                self._track_checked = self.clock()
                self.track = await self._load_track()

    async def _load_track(self):
        circuit = await self.client.circuit(self.session["circuit_key"], self.session["year"])
        if circuit and circuit.get("x"):
            return {"x": circuit["x"], "y": circuit["y"], "rotation": circuit.get("rotation", 0),
                    "corners": [{"number": c["number"], "x": c["trackPosition"]["x"],
                                 "y": c["trackPosition"]["y"]} for c in circuit.get("corners", [])]}
        # Fallback: trace the fastest complete lap from car locations.
        laps = [lap for lap in self.feeds["laps"]
                if lap.get("lap_duration") and lap.get("date_start") and not lap.get("is_pit_out_lap")]
        if not laps:
            return None
        lap = min(laps, key=lambda lap: lap["lap_duration"])
        start = ts(lap["date_start"])
        points = await self.client.get("location", session_key=self.key,
                                       driver_number=lap["driver_number"],
                                       **{"date>": lap["date_start"],
                                          "date<": iso(start + lap["lap_duration"])})
        points = [p for p in points if p.get("x") or p.get("y")]
        if len(points) < 20:
            return None
        return {"x": [p["x"] for p in points], "y": [p["y"] for p in points],
                "rotation": 0, "corners": []}

    async def _location_bucket(self, start):
        # Share one upstream request between the prefetch task and snapshot calls.
        pending = self._pending.get(start)
        if pending is None:
            pending = asyncio.ensure_future(self._fetch_location_bucket(start))
            self._pending[start] = pending
            pending.add_done_callback(lambda _: self._pending.pop(start, None))
        return await asyncio.shield(pending)

    async def _fetch_location_bucket(self, start):
        cached = self.locations.get(start)
        now = self.clock()
        # A live bucket keeps filling until its window has passed.
        if cached and not (self.live and cached[0] < start + BUCKET + LIVE_DELAY
                           and now - cached[0] >= 4):
            self.locations.move_to_end(start)
            return cached[1]
        rows = await self.client.get("location", session_key=self.key,
                                     **{"date>": iso(start), "date<": iso(start + BUCKET)})
        series = DriverSeries([r for r in rows if r.get("x") or r.get("y")])
        self.locations[start] = (now, series)
        while len(self.locations) > 40:
            self.locations.popitem(last=False)
        return series

    async def car_locations(self, t):
        start = t - t % BUCKET
        buckets = [await self._location_bucket(start)]
        if t - start < LOCATION_MAX_AGE:
            buckets.insert(0, await self._location_bucket(start - BUCKET))
        if not self.live and start + BUCKET - t < 10:
            # Warm the next window so replay playback does not stall on it.
            task = asyncio.create_task(self._location_bucket(start + BUCKET))
            task.add_done_callback(lambda done: done.cancelled() or done.exception())
        cars = {}
        for series in buckets:
            for number in series.times:
                when, row = series.latest(number, t)
                if when is not None and t - when <= LOCATION_MAX_AGE:
                    cars[number] = row
        return cars

    # ---------------- snapshot ----------------
    def timeline(self):
        stamps = [ts(self.session["date_start"])]
        for feed, key in (("position", "date"), ("laps", "date_start"), ("race_control", "date")):
            stamps += [ts(r[key]) for r in self.feeds[feed] if r.get(key)]
        first_lap = min((ts(lap["date_start"]) for lap in self.feeds["laps"]
                         if lap.get("date_start") and lap.get("lap_number") == 1), default=None)
        # Replays end with the data, not the schedule: delayed sessions overrun it.
        end = self.clock() - LIVE_DELAY if self.live else max(stamps)
        return {"start": iso(min(stamps)), "end": iso(end),
                "race_start": iso(first_lap) if first_lap else None}

    def _driver_state(self, number, t):
        laps = self.laps.upto(number, t)
        done = [lap for lap in laps if lap.get("lap_duration")
                and ts(lap["date_start"]) + lap["lap_duration"] <= t]
        current_lap = laps[-1]["lap_number"] if laps else 0
        stints = [s for s in self.feeds["stints"] if s["driver_number"] == number
                  and s.get("lap_start") is not None and s["lap_start"] <= max(current_lap, 1)]
        stints.sort(key=lambda s: s["stint_number"])
        stint = stints[-1] if stints else None
        pits = self.pits.upto(number, t)
        in_pit = bool(pits) and t - ts(pits[-1]["date"]) <= (
            pits[-1].get("lane_duration") or PIT_LANE_FALLBACK)
        return {
            "lap": current_lap,
            "last_lap": done[-1]["lap_duration"] if done else None,
            "best_lap": min((lap["lap_duration"] for lap in done), default=None),
            "compound": stint["compound"] if stint else None,
            "tyre_age": (stint.get("tyre_age_at_start") or 0) + max(current_lap - stint["lap_start"], 0)
            if stint else None,
            "pit_stops": len(pits),
            "in_pit": in_pit,
            "stints": stints,
        }

    def _status(self, t):
        messages = self.race_control[:bisect_right(self.race_control_times, t)]
        for message in reversed(messages):
            if message["category"] == "SafetyCar" or (
                    message["category"] == "Flag" and message.get("scope") == "Track"):
                return {"flag": message.get("flag"), "message": message["message"]}
        return None

    def snapshot(self, t, cars):
        board = []
        for number, driver in self.drivers.items():
            _, pos = self.positions.latest(number, t)
            _, gap = self.intervals.latest(number, t)
            state = self._driver_state(number, t)
            board.append({
                "driver_number": number, "acronym": driver.get("name_acronym"),
                "name": driver.get("full_name"), "team": driver.get("team_name"),
                "team_colour": driver.get("team_colour"), "headshot_url": driver.get("headshot_url"),
                "position": pos["position"] if pos else None,
                "gap_to_leader": gap.get("gap_to_leader") if gap else None,
                "interval": gap.get("interval") if gap else None,
                **{k: v for k, v in state.items() if k != "stints"},
                "_stints": state["stints"],
            })
        board.sort(key=lambda d: (d["position"] is None, d["position"] or 0, d["driver_number"]))
        leader_lap = max((d["lap"] for d in board), default=0)
        strategy = []
        for entry in board:
            stints = entry.pop("_stints")
            rows = []
            for s in stints:
                end = min(s.get("lap_end") or entry["lap"], max(entry["lap"], s["lap_start"]))
                rows.append({"stint": s["stint_number"], "compound": s.get("compound") or "UNKNOWN",
                             "start_lap": s["lap_start"], "end_lap": end,
                             "laps": end - s["lap_start"] + 1,
                             "fresh_tyre": (s.get("tyre_age_at_start") or 0) == 0,
                             "start_tyre_age": s.get("tyre_age_at_start")})
            if rows:
                strategy.append({"driver": entry["acronym"], "pit_stops": len(rows) - 1, "stints": rows})
        messages = self.race_control[:bisect_right(self.race_control_times, t)][-10:]
        weather_i = bisect_right(self.weather_times, t)
        return {
            "t": iso(t),
            "lap": leader_lap,
            "status": self._status(t),
            "weather": self.weather[weather_i - 1] if weather_i else None,
            "leaderboard": board,
            "cars": [{"driver_number": n, "x": c["x"], "y": c["y"]} for n, c in cars.items()],
            "race_control": list(reversed(messages)),
            "strategy": {"total_laps": leader_lap, "drivers": strategy},
            "championship": self._championship(),
        }

    def _championship(self):
        rows = []
        for row in sorted(self.feeds["championship_drivers"],
                          key=lambda r: r.get("position_current") or 99):
            driver = self.drivers.get(row["driver_number"], {})
            rows.append({**row, "acronym": driver.get("name_acronym"),
                         "name": driver.get("full_name"), "team_colour": driver.get("team_colour")})
        return rows

    def info(self):
        return {"session": self.session, "mode": "live" if self.live else "replay",
                "timeline": self.timeline(), "track": self.track,
                "drivers": list(self.drivers.values())}


class LiveService:
    """Resolves sessions and keeps a couple of recently viewed ones in memory."""

    def __init__(self, client, clock=time.time, max_sessions=2):
        self.client, self.clock, self.max_sessions = client, clock, max_sessions
        self.sessions = OrderedDict()
        self._schedule = {}  # year -> (fetched_at, sessions)
        self._lock = asyncio.Lock()

    async def schedule(self, year):
        cached = self._schedule.get(year)
        if cached and self.clock() - cached[0] < 300:
            return cached[1]
        sessions = await self.client.get("sessions", year=year)
        self._schedule[year] = (self.clock(), sessions)
        return sessions

    async def available_sessions(self, year):
        """Started, non-cancelled sessions this account can open, newest first."""
        now = datetime.fromtimestamp(self.clock(), timezone.utc)
        result = []
        for s in await self.schedule(year):
            if s.get("is_cancelled") or datetime.fromisoformat(s["date_start"]) > now:
                continue
            live = is_live(s, now)
            if live and not self.client.authenticated:
                continue
            result.append({**s, "live": live})
        return sorted(result, key=lambda s: s["date_start"], reverse=True)

    async def resolve(self, session_key=None):
        if session_key is None:
            year = datetime.fromtimestamp(self.clock(), timezone.utc).year
            options = await self.available_sessions(year) or await self.available_sessions(year - 1)
            if not options:
                raise LiveDataError("No OpenF1 sessions are available yet.", 404)
            session_key = options[0]["session_key"]
        async with self._lock:
            if session_key in self.sessions:
                self.sessions.move_to_end(session_key)
                return self.sessions[session_key]
            found = await self.client.get("sessions", session_key=session_key)
            if not found:
                raise LiveDataError("Unknown session.", 404)
            session = LiveSession(self.client, found[0], clock=self.clock)
            if session.live and not self.client.authenticated:
                raise LiveDataError(
                    "This session is live; live OpenF1 data needs a sponsor account "
                    "(set OPENF1_USERNAME/OPENF1_PASSWORD). Pick a finished session to replay.", 403)
            self.sessions[session_key] = session
            while len(self.sessions) > self.max_sessions:
                self.sessions.popitem(last=False)
            return session

    async def info(self, session_key=None):
        session = await self.resolve(session_key)
        await session.ensure_loaded()
        return session.info()

    async def snapshot(self, session_key, t=None):
        session = await self.resolve(session_key)
        await session.ensure_loaded()
        timeline = session.timeline()
        start, end = ts(timeline["start"]), ts(timeline["end"])
        t = end if t is None or session.live else min(max(t, start), end)
        return session.snapshot(t, await session.car_locations(t))
