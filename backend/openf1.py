"""Rate-limited OpenF1 REST client with optional sponsor authentication.

Historical OpenF1 data is free. Real-time data (from 30 minutes before a
session until 30 minutes after it) needs a sponsor account, enabled by setting
OPENF1_USERNAME and OPENF1_PASSWORD.
"""
import asyncio
from collections import deque
import logging
import time

import httpx

API_URL = "https://api.openf1.org/v1"
TOKEN_URL = "https://api.openf1.org/token"
MULTIVIEWER_URL = "https://api.multiviewer.app/api/v1/circuits"

logger = logging.getLogger(__name__)


class LiveDataError(Exception):
    """Upstream data is missing or not accessible with the configured account."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


class RateLimiter:
    """Sliding-window limiter covering both per-second and per-minute quotas."""

    def __init__(self, per_second, per_minute, clock=time.monotonic, sleep=asyncio.sleep):
        self.windows = [(1.0, per_second, deque()), (60.0, per_minute, deque())]
        self.clock, self.sleep = clock, sleep
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            while True:
                now = self.clock()
                wait = 0.0
                for span, limit, stamps in self.windows:
                    while stamps and now - stamps[0] >= span:
                        stamps.popleft()
                    if len(stamps) >= limit:
                        wait = max(wait, span - (now - stamps[0]))
                if wait <= 0:
                    for _, _, stamps in self.windows:
                        stamps.append(now)
                    return
                await self.sleep(wait)


class OpenF1Client:
    def __init__(self, username=None, password=None, transport=None):
        self.username, self.password = username, password
        self.authenticated = bool(username and password)
        # Free tier: 3 req/s and 30 req/min; sponsors get double.
        self.limiter = RateLimiter(6, 60) if self.authenticated else RateLimiter(3, 30)
        self._client = httpx.AsyncClient(timeout=20, transport=transport)
        self._token, self._token_expiry = None, 0.0
        self._token_lock = asyncio.Lock()

    async def _auth_headers(self):
        if not self.authenticated:
            return {}
        async with self._token_lock:
            if self._token is None or time.monotonic() > self._token_expiry:
                response = await self._client.post(
                    TOKEN_URL, data={"username": self.username, "password": self.password})
                if response.status_code != 200:
                    raise LiveDataError("OpenF1 rejected the configured credentials.", 502)
                body = response.json()
                self._token = body["access_token"]
                # Refresh a minute early; tokens last an hour.
                self._token_expiry = time.monotonic() + int(body.get("expires_in", 3600)) - 60
            return {"Authorization": f"Bearer {self._token}"}

    async def get(self, endpoint, **params):
        """GET /v1/<endpoint>. Filter keys may carry operators, e.g. {"date>": iso}."""
        for attempt in range(3):
            await self.limiter.acquire()
            try:
                response = await self._client.get(f"{API_URL}/{endpoint}", params=params,
                                                  headers=await self._auth_headers())
            except httpx.HTTPError as exc:
                raise LiveDataError("OpenF1 is unreachable.") from exc
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(float(response.headers.get("Retry-After", 2)))
                continue
            if response.status_code in (401, 403):
                raise LiveDataError(
                    "Live OpenF1 data needs a sponsor account (OPENF1_USERNAME/OPENF1_PASSWORD).", 403)
            if response.status_code == 404:
                # OpenF1 answers 404 for filters that match nothing.
                return []
            if response.status_code >= 400:
                raise LiveDataError(f"OpenF1 returned HTTP {response.status_code}.")
            data = response.json()
            return data if isinstance(data, list) else []
        raise LiveDataError("OpenF1 rate limit exceeded; try again shortly.", 503)

    async def circuit(self, circuit_key, year):
        """Circuit outline/rotation/corners from MultiViewer; None when unavailable."""
        for season in (year, year - 1):
            try:
                response = await self._client.get(f"{MULTIVIEWER_URL}/{circuit_key}/{season}",
                                                  headers={"User-Agent": "f1-dashboard"})
            except httpx.HTTPError:
                return None
            if response.status_code == 200:
                return response.json()
        return None

    async def aclose(self):
        await self._client.aclose()
