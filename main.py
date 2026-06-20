from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import fastf1, fastf1.plotting
import matplotlib.pyplot as plt
import io
import base64
import asyncio
import httpx
import seaborn as sns

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import livef1


# # Get a specific race session
# session = livef1.get_session(
#     season=2026,
#     meeting_identifier="silverstone",
#     session_identifier="Practice 1"
# )
#
# # Load position data
# position_data = session.get_data(
#     dataNames="Position.z"
# )
#
# print(position_data.head())

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


#
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
    valid_values = [v.dropna()
                    for v in all_laps if v is not None and not v.dropna().empty]

    if valid_values:
        y_min = min(v.min() for v in valid_values)
        y_max = max(v.max() for v in valid_values) + 10

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

    return {"image": img}  # @app.get("/sessionDetails")


@app.get("/track-map")
async def track_map(year: int, round_number: int, identifier: str):
    session = fastf1.get_session(year, round_number, identifier)
    session.load()
    lap = session.laps.pick_fastest()  # Because fastest lap is clean and complete
    pos = lap.get_pos_data()
    circuit = session.get_circuit_info()
    track = pos.loc[:, ("X", "Y")].to_dict(orient="records")
    corners = circuit.corners.to_dict(orient="records")
    return {
        "rotation": float(circuit.rotation),
        "track": track,
        "corners": corners
    }


@app.websocket("/ws/live")
async def live_feed(ws: WebSocket):
    await ws.accept()

    while True:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.openf1.org/v1/position"
            )

            data = r.json()

        await ws.send_json(data)

        await asyncio.sleep(1)


@app.get("/lapTimeDistribution")
async def lap_time_distribution(year: int, country: str, identifier: str):
    fastf1.plotting.setup_mpl(mpl_timedelta_support=True, color_scheme='fastf1')
    race = fastf1.get_session(year, country, identifier)
    race.load()

    # derive top 3 finishers from classification (podium), not internal driver order
    classification = race.results.sort_values("Position")
    podium = classification.head(3)

    point_finishers = podium["DriverNumber"].tolist()
    driver_laps = race.laps.pick_drivers(point_finishers).pick_quicklaps()

    driver_laps = driver_laps.reset_index()

    finishing_order = podium["Abbreviation"].tolist()

    # create the figure
    fix, ax = plt.subplots(figsize=(10, 6))

    # Since 'seaborn' doesnt have proper timedelta support, we should convert timedelta to float (in sec)
    driver_laps["LapTime(s)"] = driver_laps["LapTime"].dt.total_seconds()
    sns.violinplot(data=driver_laps,
                   x="Driver",
                   y="LapTime(s)",
                   hue="Driver",
                   inner=None,
                   density_norm="area",
                   order=finishing_order,
                   palette=fastf1.plotting.get_driver_color_mapping(session=race)
                   )

    sns.swarmplot(data=driver_laps,
                  x="Driver",
                  y="LapTime(s)",
                  order=finishing_order,
                  hue="Compound",
                  palette=fastf1.plotting.get_compound_mapping(session=race),
                  hue_order=["SOFT", "MEDIUM", "HARD"],
                  linewidth=0,
                  size=4,
                  )
    ax.set_xlabel("Driver")
    ax.set_ylabel("Lap Time (s)")
    plt.suptitle(f"{year} {country} Grand Prix Lap Time Distribution")
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)

    img = base64.b64encode(buf.read()).decode("utf-8")

    return {"image": img}  # @app.get("/sessionDetails")
