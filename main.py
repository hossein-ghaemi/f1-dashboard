from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import matplotlib.pyplot as plt
import io
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/f1Sessions")
async def get_sessions(year: int = 2026):
    schedule = fastf1.get_event_schedule(year)
    return schedule.to_dict(orient="records")


@app.get("/f1Sessionsx")
async def get_sessions(year: int = 2026):
    schedule = fastf1.get_event_schedule(year)

    result = []

    for _, row in schedule.iterrows():
        sessions = []

        for i in range(1, 6):
            session = row.get(f"Session{i}")
            if session:
                sessions.append(session)

        result.append({
            "round": int(row["RoundNumber"]),
            "country": row["Country"],
            "location": row["Location"],
            "event_name": row["EventName"],
            "event_date": row["EventDate"],
            "official_name": row["OfficialEventName"],
            "event_format": row["EventFormat"],
            "session1": row["Session1"],
            "Session1Date": row["Session1Date"],
            "session2": row["Session2"],
            "Session2Date": row["Session2Date"],
            "session3": row["Session3"],
            "session3Date": row["Session3Date"],
            "session4": row["Session4"],
            "session4Date": row["Session4Date"],
            "session5": row["Session5"],
            "session5Date": row["Session5Date"],
        })
    return result


@app.get("/getEvent")
async def get_event(year: int, round_number: int):
    eventDetails = fastf1.get_event(year, round_number).to_dict()
    if eventDetails:
        return eventDetails
    return {"error": "Event not found"}


@app.get("/sessionDetails")
async def get_session_details(year: int, round_number: int, identifier: str):
    session = fastf1.get_session(year, round_number, identifier)

    # Load data (this triggers data download + parsing)
    session.load()
    drivers = {}
    for index, row in session.results.iterrows():
        drivers[row.DriverNumber] = row

    result = {
        "country": session.event["Country"],
        "country_lowercase": session.event["Country"].lower().replace(" ", ""),
        "round_number": session.session_info['Meeting']["Number"],
        "event_name": session.event["EventName"],
        "total_laps": len(session.laps),
        "drivers": drivers,
        "results": session.results,
        "session_info": session.session_info,
        "track_status": session.track_status,
    }
    #
    return result


@app.get("/compare-drivers")

def compare_drivers(year: int, round_number: int, drivers: str, identifier: str):
    driver_list = drivers.split(",")

    session = fastf1.get_session(year, round_number, identifier)
    session.load()

    fig, ax = plt.subplots(figsize=(10, 6))

    # ---------- BACKGROUND ----------
    fig.patch.set_facecolor("#0B0B0B")
    ax.set_facecolor("#0B0B0B")

    # ---------- COLORS ----------
    ax.tick_params(colors="white")

    ax.set_title(
        "Driver Comparison - Lap Time Analysis",
        fontsize=16,
        fontweight="bold",
        color="white"
    )

    ax.set_xlabel("Lap Number", fontsize=12, color="white")
    ax.set_ylabel("Lap Time (seconds)", fontsize=12, color="white")

    ax.grid(True, linestyle="--", alpha=0.2, color="white")

    colors = ["#FF1801", "#00D2BE", "#DC0000", "#1E41FF"]

    all_laps = []

    # ---------- PLOT ----------
    for i, d in enumerate(driver_list):
        laps = session.laps.pick_driver(d)

        lap_times = laps["LapTime"].dt.total_seconds()

        # store for axis scaling
        all_laps.append(lap_times)

        ax.plot(
            laps["LapNumber"],
            lap_times,
            color=colors[i % len(colors)],
            linewidth=2.5,
            label=d
        )

    # ---------- SAFE AXIS SCALING ----------
    valid_values = [v.dropna() for v in all_laps if v is not None and not v.dropna().empty]

    if valid_values:
        y_min = min(v.min() for v in valid_values)
        y_max = max(v.max() for v in valid_values)+10

        ax.set_ylim(y_min - 1, y_max + 1)

    ax.set_xlim(left=1)

    # ---------- LEGEND ----------
    leg = ax.legend(frameon=False)
    for text in leg.get_texts():
        text.set_color("white")

    plt.tight_layout()

    # ---------- EXPORT ----------
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)

    img = base64.b64encode(buf.read()).decode("utf-8")

    return {"image": img}# @app.get("/sessionDetails")
# async def get_sessions(session_key: int, position: int):
#     async with httpx.AsyncClient() as client:
#         res = await client.get(
#             f"{BASE_URL}/session_result",
#             params={"session_key": session_key,"position<": position }
#         )
#         return res.json()
#
#
# @app.get("/laps")
# async def get_laps(session_key: int):
#     async with httpx.AsyncClient() as client:
#         res = await client.get(f"{BASE_URL}/laps", params={"session_key": session_key})
#         return res.json()
# @app.get("/drivers")
# async def get_laps(session_key: int, driver_number: int):
#     async with httpx.AsyncClient() as client:
#         res = await client.get(f"{BASE_URL}/drivers", params={"session_key": session_key,'driver_number':driver_number})
#         return res.json()
