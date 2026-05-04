from fastapi import FastAPI
import httpx
import requests
app = FastAPI()
BASE_URL = 'https://api.openf1.org/v1'
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sessions")
async def get_sessions(year: int = 2026):
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{BASE_URL}/sessions",
            params={"year": year}
        )
        return res.json()

@app.get("/laps")
async def get_laps(session_key: int):
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/laps", params={"session_key": session_key})
        return res.json()