"""HTTP API for historical F1 schedules, sessions, and charts."""
import asyncio
import base64
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import io
import logging
import os
from pathlib import Path
import threading

import fastf1
from fastf1.ergast import Ergast
from fastf1.exceptions import DataNotLoadedError
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from backend.runtime import SessionCache, json_safe

logger = logging.getLogger(__name__)
plot_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app):
    cache_dir = Path(os.getenv("F1_CACHE_DIR", ".cache/fastf1"))
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(cache_dir))
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[v.strip() for v in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",") if v.strip()],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def load_session(year, round_number, identifier):
    session = fastf1.get_session(year, round_number, identifier)
    session.load(weather=False)
    return session


session_cache = SessionCache(
    load_session,
    max_entries=int(os.getenv("F1_SESSION_CACHE_SIZE", "3")),
    ttl_seconds=int(os.getenv("F1_SESSION_CACHE_TTL_SECONDS", "300")),
)


def get_session(year, round_number, identifier):
    return session_cache.get(year, round_number, identifier)


@contextmanager
def data_errors():
    try:
        yield
    except HTTPException:
        raise
    except (ValueError, KeyError, IndexError, DataNotLoadedError) as exc:
        logger.info("F1 data unavailable: %s", exc)
        raise HTTPException(404, "Requested F1 data is unavailable.") from exc
    except Exception as exc:
        logger.exception("F1 data operation failed")
        raise HTTPException(502, "Unable to load F1 data. Please try again later.") from exc


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/f1Sessions")
def get_sessions(year: int = Query(datetime.now(timezone.utc).year, ge=1950, le=2100)):
    with data_errors():
        return json_safe(fastf1.get_event_schedule(year))


@app.get("/f1Sessionsx")
def get_sessions_alternative(year: int = Query(datetime.now(timezone.utc).year, ge=1950, le=2100)):
    with data_errors():
        result = []
        for _, row in fastf1.get_event_schedule(year).iterrows():
            event = {
                "round": row["RoundNumber"], "country": row["Country"],
                "location": row["Location"], "event_name": row["EventName"],
                "event_date": row["EventDate"], "official_name": row["OfficialEventName"],
                "event_format": row["EventFormat"],
            }
            for i in range(1, 6):
                event[f"session{i}"] = row.get(f"Session{i}")
                date_key = f"Session{i}Date" if i <= 2 else f"session{i}Date"
                event[date_key] = row.get(f"Session{i}Date")
            result.append(event)
        return json_safe(result)


@app.get("/getEvent")
def get_event(year: int = Query(..., ge=1950, le=2100), round_number: int = Query(..., ge=0)):
    with data_errors():
        return json_safe(fastf1.get_event(year, round_number))


@app.get("/sessionDetails")
def get_session_details(year: int = Query(..., ge=1950, le=2100),
                        round_number: int = Query(..., ge=0),
                        identifier: str = Query(..., min_length=1, max_length=64)):
    with data_errors():
        session = get_session(year, round_number, identifier)
        records = json_safe(session.results)
        laps = session.laps.get("LapNumber", pd.Series(dtype=float)).dropna()
        return json_safe({
            "year": year,
            "identifier": identifier,
            "country": session.event["Country"],
            "country_lowercase": session.event["Country"].lower().replace(" ", ""),
            "round_number": int(session.event["RoundNumber"]),
            "event_name": session.event["EventName"],
            # Maximum completed lap number across drivers; zero if none recorded.
            "total_laps": int(laps.max()) if not laps.empty else 0,
            "drivers": {str(row["DriverNumber"]): row for row in records},
            "results": records,
            "session_info": session.session_info,
            "track_status": session.track_status,
        })


@app.get("/driverStandings")
def driver_standings(year: int = Query(..., ge=1950, le=2100),
                     round_number: int | None = Query(None, ge=1)):
    with data_errors():
        response = Ergast().get_driver_standings(season=year, round=round_number)
        if not response.content or response.content[0].empty:
            raise HTTPException(404, "Driver standings are unavailable.")
        standings = response.content[0]
        return json_safe({
            "year": year,
            "round": int(response.description["round"].iloc[0]),
            "standings": [{
                "position": row["position"], "points": row["points"], "wins": row["wins"],
                "driver_id": row["driverId"], "driver_number": row["driverNumber"],
                "code": row["driverCode"], "given_name": row["givenName"],
                "family_name": row["familyName"], "nationality": row["driverNationality"],
                "teams": list(row["constructorNames"]),
            } for _, row in standings.iterrows()],
        })


def encode_figure(fig):
    with io.BytesIO() as buf:
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        return {"image": base64.b64encode(buf.getvalue()).decode("ascii")}


@app.get("/compare-drivers")
def compare_drivers(year: int = Query(..., ge=1950, le=2100),
                    round_number: int = Query(..., ge=0),
                    drivers: str = Query(..., min_length=1, max_length=200),
                    identifier: str = Query(..., min_length=1, max_length=64)):
    with data_errors():
        session = get_session(year, round_number, identifier)
        selected = list(dict.fromkeys(d.strip() for d in drivers.split(",") if d.strip()))
        if not selected or len(selected) > 20:
            raise HTTPException(422, "Select between 1 and 20 drivers.")
        series = []
        for driver in selected:
            laps = session.laps.pick_drivers(driver)
            valid = laps.dropna(subset=["LapNumber", "LapTime"])
            if valid.empty:
                raise HTTPException(404, f"No lap times available for driver {driver}.")
            series.append((driver, valid))
        with plot_lock:
            fig, ax = plt.subplots(figsize=(10, 6))
            try:
                fig.patch.set_facecolor("#0B0B0B")
                ax.set_facecolor("#0B0B0B")
                ax.tick_params(colors="white")
                ax.set_title("Driver Comparison - Lap Time Analysis", color="white")
                ax.set_xlabel("Lap Number", color="white")
                ax.set_ylabel("Lap Time (seconds)", color="white")
                ax.grid(True, linestyle="--", alpha=0.2, color="white")
                for driver, laps in series:
                    ax.plot(laps["LapNumber"], laps["LapTime"].dt.total_seconds(), label=driver)
                ax.set_xlim(left=1)
                for text in ax.legend(frameon=False).get_texts():
                    text.set_color("white")
                fig.tight_layout()
                return encode_figure(fig)
            finally:
                plt.close(fig)


@app.get("/track-map")
def track_map(year: int = Query(..., ge=1950, le=2100),
              round_number: int = Query(..., ge=0),
              identifier: str = Query(..., min_length=1, max_length=64)):
    with data_errors():
        session = get_session(year, round_number, identifier)
        if session.laps.empty:
            raise HTTPException(404, "No laps available for this session.")
        lap = session.laps.pick_fastest()
        if lap is None or lap.empty or pd.isna(lap.get("LapTime")):
            raise HTTPException(404, "No timed lap available for the track map.")
        positions = lap.get_pos_data()
        if positions.empty:
            raise HTTPException(404, "Track position data is unavailable.")
        track = positions.loc[:, ["X", "Y"]].dropna()
        if track.empty:
            raise HTTPException(404, "Track position data is unavailable.")
        circuit = session.get_circuit_info()
        return json_safe({"rotation": circuit.rotation, "track": track, "corners": circuit.corners})


@app.get("/lapTimeDistribution")
def lap_time_distribution(year: int = Query(..., ge=1950, le=2100),
                          identifier: str = Query(..., min_length=1, max_length=64),
                          round_number: int | None = Query(None, ge=0),
                          country: str | None = Query(None, min_length=1, max_length=200)):
    if round_number is None and country is None:
        raise HTTPException(422, "Provide round_number or country.")
    with data_errors():
        if round_number is None:
            round_number = int(fastf1.get_event(year, country)["RoundNumber"])
        session = get_session(year, round_number, identifier)
        podium = session.results.sort_values("Position").head(3)
        if podium.empty:
            raise HTTPException(404, "Session classification is unavailable.")
        laps = session.laps.pick_drivers(podium["DriverNumber"].tolist()).pick_quicklaps().copy()
        laps["LapTime(s)"] = laps["LapTime"].dt.total_seconds()
        laps = laps.dropna(subset=["LapTime(s)"])
        if laps.empty:
            raise HTTPException(404, "No lap times available for this session.")
        order = podium["Abbreviation"].tolist()
        with plot_lock:
            fig, ax = plt.subplots(figsize=(10, 6))
            try:
                sns.violinplot(data=laps, x="Driver", y="LapTime(s)", hue="Driver",
                               inner=None, density_norm="area", order=order, ax=ax)
                sns.stripplot(data=laps, x="Driver", y="LapTime(s)", hue="Compound",
                              order=order, size=3, ax=ax)
                ax.set_title(f"{year} {session.event['EventName']} Lap Time Distribution")
                ax.set_ylabel("Lap Time (seconds)")
                fig.tight_layout()
                return encode_figure(fig)
            finally:
                plt.close(fig)


@app.websocket("/ws/live")
async def live_feed(ws: WebSocket):
    await ws.accept()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            while True:
                # Unfiltered /position is the full multi-MB history; poll only the latest session.
                response = await client.get("https://api.openf1.org/v1/position",
                                            params={"session_key": "latest"})
                response.raise_for_status()
                await ws.send_json(response.json())
                await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except (httpx.HTTPError, ValueError):
        logger.warning("Live position upstream unavailable", exc_info=True)
        await ws.close(code=1011, reason="Live data unavailable")
