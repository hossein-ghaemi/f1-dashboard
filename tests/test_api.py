import asyncio
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
import threading

from fastapi.testclient import TestClient
import httpx
import pandas as pd
import pytest

import main

PARAMS = {"year": 2024, "round_number": 1, "identifier": "Race"}


@pytest.fixture
def session():
    return SimpleNamespace(
        event={"Country": "Bahrain", "RoundNumber": 1, "EventName": "Bahrain Grand Prix"},
        session_info={"Meeting": {"Name": "Bahrain"}},
        results=pd.DataFrame([{"DriverNumber": "1", "Position": 1,
                               "Time": pd.Timedelta(seconds=5400), "TeamName": "Team"},
                              {"DriverNumber": "2", "Position": 2, "Time": pd.NaT}]),
        laps=pd.DataFrame({"LapNumber": [1, 2, 1, 2]}),
        track_status=pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Status": ["1"]}),
    )


def test_details_without_meeting_number_and_missing_times(monkeypatch, session):
    monkeypatch.setattr(main, "get_session", lambda *args: session)
    response = TestClient(main.app).get("/sessionDetails", params=PARAMS)
    assert response.status_code == 200
    data = response.json()
    assert data["round_number"] == 1
    assert data["total_laps"] == 2  # Race distance, not four driver-lap records.
    assert data["drivers"]["1"]["Time"] == 5400
    assert data["drivers"]["2"]["Time"] is None
    assert isinstance(data["results"], list)
    assert data["track_status"][0]["Time"] == 0


def test_invalid_inputs_do_not_fetch_data(monkeypatch):
    def forbidden(*args):
        pytest.fail("Invalid input reached FastF1 loader")
    monkeypatch.setattr(main, "get_session", forbidden)
    client = TestClient(main.app)
    for replacement in [{"year": 1800}, {"round_number": -1}, {"identifier": ""}]:
        assert client.get("/sessionDetails", params=PARAMS | replacement).status_code == 422


def test_empty_track_returns_actionable_error(monkeypatch, session):
    session.laps = pd.DataFrame()
    monkeypatch.setattr(main, "get_session", lambda *args: session)
    response = TestClient(main.app).get("/track-map", params=PARAMS)
    assert response.status_code == 404
    assert response.json()["detail"]


def test_upstream_failure_is_controlled(monkeypatch):
    def broken(*args):
        raise RuntimeError("private upstream details")
    monkeypatch.setattr(main, "get_session", broken)
    response = TestClient(main.app).get("/sessionDetails", params=PARAMS)
    assert response.status_code == 502
    assert "private upstream" not in response.text


def test_health_responds_while_session_load_is_blocked(monkeypatch, session):
    entered, release = threading.Event(), threading.Event()
    def slow(*args):
        entered.set()
        if not release.wait(5):
            raise RuntimeError("blocked event loop")
        return session
    monkeypatch.setattr(main, "get_session", slow)
    async def scenario():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://test") as client:
            pending = asyncio.create_task(client.get("/sessionDetails", params=PARAMS))
            try:
                assert await asyncio.to_thread(entered.wait, 2)
                response = await asyncio.wait_for(client.get("/health"), timeout=1)
                assert response.json() == {"status": "ok"}
            finally:
                release.set()
                await pending
    asyncio.run(scenario())


def test_session_without_loaded_data_is_not_found(monkeypatch):
    from fastf1.exceptions import DataNotLoadedError
    class Unloaded(SimpleNamespace):
        @property
        def laps(self):
            raise DataNotLoadedError("not loaded")
    monkeypatch.setattr(main, "get_session", lambda *args: Unloaded())
    response = TestClient(main.app).get("/track-map", params=PARAMS)
    assert response.status_code == 404


def test_live_feed_polls_latest_session_only(monkeypatch):
    requested = []
    def handler(request):
        requested.append(request.url)
        return httpx.Response(200, json=[{"driver_number": 1, "position": 1}])
    real_client = httpx.AsyncClient
    monkeypatch.setattr(main.httpx, "AsyncClient",
                        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw))
    with TestClient(main.app).websocket_connect("/ws/live") as ws:
        assert ws.receive_json() == [{"driver_number": 1, "position": 1}]
    assert requested[0].params["session_key"] == "latest"


def test_race_strategy_groups_stints_in_finishing_order(monkeypatch, session):
    session.results = pd.DataFrame([{"Abbreviation": "LEC", "Position": 2},
                                    {"Abbreviation": "VER", "Position": 1}])
    session.laps = pd.DataFrame({
        "Driver": ["VER", "VER", "VER", "LEC", "LEC", "LEC"],
        "LapNumber": [1, 2, 3, 1, 2, 3],
        "Stint": [1, 1, 2, 1, 1, 1],
        "Compound": ["SOFT", "SOFT", "HARD", "MEDIUM", "MEDIUM", "MEDIUM"],
        "TyreLife": [1, 2, 1, 3, 4, 5],
        "FreshTyre": [True, True, True, False, False, False],
    })
    monkeypatch.setattr(main, "get_session", lambda *args: session)
    response = TestClient(main.app).get("/raceStrategy", params=PARAMS)
    assert response.status_code == 200
    data = response.json()
    assert data["total_laps"] == 3
    assert [d["driver"] for d in data["drivers"]] == ["VER", "LEC"]
    ver, lec = data["drivers"]
    assert ver["pit_stops"] == 1
    assert ver["stints"][1] == {"stint": 2, "compound": "HARD", "start_lap": 3, "end_lap": 3,
                                     "laps": 1, "fresh_tyre": True, "start_tyre_age": 1}
    assert lec["pit_stops"] == 0 and lec["stints"][0]["start_tyre_age"] == 3


def test_race_strategy_without_laps_is_not_found(monkeypatch, session):
    session.laps = pd.DataFrame()
    monkeypatch.setattr(main, "get_session", lambda *args: session)
    assert TestClient(main.app).get("/raceStrategy", params=PARAMS).status_code == 404


class FakeErgast:
    def __init__(self, content):
        self.content = content

    def __call__(self):
        return self

    def get_driver_standings(self, season, round):
        self.requested = (season, round)
        return SimpleNamespace(description=pd.DataFrame({"season": [season], "round": [5]}),
                               content=self.content)


def test_driver_standings(monkeypatch):
    fake = FakeErgast([pd.DataFrame([{
        "position": 1, "points": 110.0, "wins": 4, "driverId": "max_verstappen",
        "driverNumber": 33, "driverCode": "VER", "givenName": "Max", "familyName": "Verstappen",
        "driverNationality": "Dutch", "constructorNames": ["Red Bull"],
    }])])
    monkeypatch.setattr(main, "Ergast", fake)
    response = TestClient(main.app).get("/driverStandings", params={"year": 2024, "round_number": 5})
    assert response.status_code == 200
    assert fake.requested == (2024, 5)
    data = response.json()
    assert data["round"] == 5
    assert data["standings"][0]["code"] == "VER" and data["standings"][0]["teams"] == ["Red Bull"]


def test_driver_standings_empty_season_is_not_found(monkeypatch):
    monkeypatch.setattr(main, "Ergast", FakeErgast([]))
    assert TestClient(main.app).get("/driverStandings", params={"year": 2100}).status_code == 404
