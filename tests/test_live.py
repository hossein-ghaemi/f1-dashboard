import asyncio
from datetime import datetime, timezone

from fastapi.testclient import TestClient
import httpx
import pytest

from backend.live import LiveService
from backend.openf1 import LiveDataError, OpenF1Client, RateLimiter
import main

START = datetime(2026, 10, 4, 8, 0, tzinfo=timezone.utc).timestamp()


def at(seconds):
    return datetime.fromtimestamp(START + seconds, timezone.utc).isoformat()


SESSION = {"session_key": 7, "session_type": "Race", "session_name": "Race", "year": 2026,
           "circuit_key": 12, "date_start": at(0), "date_end": at(7200), "is_cancelled": False}
FEEDS = {
    "sessions": [SESSION],
    "drivers": [{"driver_number": 1, "name_acronym": "NOR", "full_name": "Lando NORRIS",
                 "team_name": "McLaren", "team_colour": "F47600"},
                {"driver_number": 12, "name_acronym": "ANT", "full_name": "Kimi ANTONELLI",
                 "team_name": "Mercedes", "team_colour": "00D7B6"}],
    "position": [{"date": at(0), "driver_number": 1, "position": 1},
                 {"date": at(0), "driver_number": 12, "position": 2},
                 {"date": at(150), "driver_number": 12, "position": 1},
                 {"date": at(150), "driver_number": 1, "position": 2}],
    "intervals": [{"date": at(160), "driver_number": 1, "gap_to_leader": 1.5, "interval": 1.5},
                  {"date": at(160), "driver_number": 12, "gap_to_leader": 0.0, "interval": 0.0}],
    "laps": [{"date_start": at(0), "driver_number": d, "lap_number": 1, "lap_duration": 100.0}
             for d in (1, 12)] +
            [{"date_start": at(100), "driver_number": d, "lap_number": 2, "lap_duration": 95.0}
             for d in (1, 12)] +
            [{"date_start": at(195), "driver_number": d, "lap_number": 3, "lap_duration": None}
             for d in (1, 12)],
    "stints": [{"driver_number": 1, "stint_number": 1, "lap_start": 1, "lap_end": 2,
                "compound": "SOFT", "tyre_age_at_start": 3},
               {"driver_number": 1, "stint_number": 2, "lap_start": 3, "lap_end": 30,
                "compound": "HARD", "tyre_age_at_start": 0},
               {"driver_number": 12, "stint_number": 1, "lap_start": 1, "lap_end": 30,
                "compound": "MEDIUM", "tyre_age_at_start": 0}],
    "pit": [{"date": at(190), "driver_number": 1, "lane_duration": 22.0}],
    "race_control": [{"date": at(5), "category": "Flag", "flag": "GREEN", "scope": "Track",
                      "message": "GREEN LIGHT"},
                     {"date": at(120), "category": "SafetyCar", "flag": None, "scope": None,
                      "message": "SAFETY CAR DEPLOYED"},
                     {"date": at(130), "category": "Other", "flag": None, "scope": None,
                      "message": "TRACK LIMITS"},
                     {"date": at(400), "category": "Flag", "flag": "CHEQUERED", "scope": "Track",
                      "message": "CHEQUERED FLAG"}],
    "weather": [{"date": at(0), "air_temperature": 30.0, "rainfall": 0}],
    "championship_drivers": [{"driver_number": 12, "position_current": 1, "points_current": 320.0}],
}


class Upstream:
    def __init__(self):
        self.requests = []

    def __call__(self, request):
        path = request.url.path
        self.requests.append(request.url)
        if "multiviewer" in request.url.host:
            return httpx.Response(200, json={"x": [0, 10], "y": [0, 10], "rotation": 90,
                                             "corners": [{"number": 1, "trackPosition": {"x": 1, "y": 2}}]})
        feed = path.rsplit("/", 1)[-1]
        if feed == "location":
            lo, hi = request.url.params["date>"], request.url.params["date<"]
            rows = [{"date": at(s), "driver_number": d, "x": s * d, "y": 1}
                    for s in range(0, 400, 2) for d in (1, 12)]
            return httpx.Response(200, json=[r for r in rows if lo < r["date"] < hi])
        return httpx.Response(200, json=FEEDS[feed])


def service(upstream, clock):
    client = OpenF1Client(transport=httpx.MockTransport(upstream))
    client.limiter = RateLimiter(1000, 1000)
    return LiveService(client, clock=lambda: clock)


def test_snapshot_reconstructs_race_state_at_time():
    upstream = Upstream()
    live = service(upstream, START + 86400)
    snap = asyncio.run(live.snapshot(7, START + 200))
    leader, second = snap["leaderboard"]
    assert (leader["acronym"], second["acronym"]) == ("ANT", "NOR")
    assert second["gap_to_leader"] == 1.5
    assert second["lap"] == 3 and second["last_lap"] == 95.0 and second["best_lap"] == 95.0
    assert (second["compound"], second["tyre_age"], second["pit_stops"]) == ("HARD", 0, 1)
    assert second["in_pit"] is True
    assert snap["status"]["message"] == "SAFETY CAR DEPLOYED"
    assert snap["race_control"][0]["message"] == "TRACK LIMITS"
    assert {c["driver_number"]: c["x"] for c in snap["cars"]} == {1: 200, 12: 2400}
    nor = next(d for d in snap["strategy"]["drivers"] if d["driver"] == "NOR")
    assert [(s["compound"], s["start_lap"], s["end_lap"]) for s in nor["stints"]] == [
        ("SOFT", 1, 2), ("HARD", 3, 3)]
    assert snap["championship"][0]["acronym"] == "ANT"


def test_replay_loads_feeds_once_and_clamps_time():
    upstream = Upstream()
    live = service(upstream, START + 86400)
    early = asyncio.run(live.snapshot(7, START - 9999))
    assert early["t"] == at(0)
    feed_requests = [u for u in upstream.requests if u.path.rsplit("/", 1)[-1] in FEEDS]
    asyncio.run(live.snapshot(7, START + 50))
    assert [u for u in upstream.requests if u.path.rsplit("/", 1)[-1] in FEEDS] == feed_requests


def test_live_session_needs_sponsor_account():
    live = service(Upstream(), START + 600)  # Mid-session: OpenF1 treats it as live.
    with pytest.raises(LiveDataError) as exc:
        asyncio.run(live.resolve(7))
    assert exc.value.status == 403
    sessions = asyncio.run(live.available_sessions(2026))
    assert sessions == []


def test_rate_limiter_waits_for_minute_quota():
    now = [0.0]
    slept = []
    async def sleep(seconds):
        slept.append(seconds)
        now[0] += seconds
    limiter = RateLimiter(10, 2, clock=lambda: now[0], sleep=sleep)
    async def run():
        for _ in range(3):
            await limiter.acquire()
    asyncio.run(run())
    assert slept == [60.0]


def test_live_routes_map_errors(monkeypatch):
    class Broken:
        async def info(self, key):
            raise LiveDataError("Live OpenF1 data needs a sponsor account.", 403)
    monkeypatch.setattr(main, "live_service", Broken())
    response = TestClient(main.app).get("/live/session", params={"session_key": 7})
    assert response.status_code == 403
    assert "sponsor" in response.json()["detail"]
    assert TestClient(main.app).get("/live/snapshot", params={"t": "nope"}).status_code == 422
