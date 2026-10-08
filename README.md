# F1 Dashboard

A Formula 1 session explorer with a Next.js/React frontend and a FastAPI backend. FastF1 provides schedules, classifications, lap data, and circuit telemetry. Matplotlib and Seaborn render analytics images. No application database or account system is required for the current read-only dashboard.

## Repository

- `main.py`: FastAPI routes.
- `backend/`: serialization and session caching helpers.
- `f1-dash/`: Next.js frontend, TypeScript, Tailwind CSS, and SVG circuit views.
- `tests/`: offline backend regression tests.

## Setup

Use Python 3.12 and Node.js 20.9 or later with npm. Run backend commands from the repository root. Create a fresh environment rather than reusing an unrelated Python installation.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip check
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal:

```sh
cd f1-dash
npm ci
npm run dev
```

Open http://localhost:3000/f1. Backend API documentation is at http://localhost:8000/docs.

## Configuration

Export backend environment variables before starting Uvicorn:

| Variable | Purpose |
| --- | --- |
| `F1_CACHE_DIR` | Writable directory for downloaded FastF1 data. |
| `F1_SESSION_CACHE_SIZE` | Maximum number of loaded sessions retained in memory. |
| `F1_SESSION_CACHE_TTL_SECONDS` | Loaded-session cache lifetime. |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins. |

The frontend uses `NEXT_PUBLIC_API_BASE_URL` for its browser-facing API URL, defaulting to `http://localhost:8000`. Set it in `f1-dash/.env.local` and restart development or rebuild production assets when changing it. This value is public and must not contain secrets.

Initial session downloads can take time and require access to external data providers. Availability differs by year and session. Disk cache reduces repeat downloads; the bounded in-memory cache reuses parsed sessions within one backend process. Multiple workers do not share in-memory sessions.

## Checks

```sh
python -m pytest -q
python -m pip check
cd f1-dash
npm run lint
npm run typecheck
npm run build
```

Backend tests use synthetic fixtures and do not fetch live F1 data. They cover JSON conversion, session metadata, cache behavior, and request responsiveness. Live data smoke checks remain a separate manual check.

## Production notes

Use `npm run build` followed by `npm start` for the frontend, and run Uvicorn without `--reload` for the backend. Configure the browser-accessible API URL, explicit CORS origins, and a persistent writable FastF1 cache. `/health` provides a lightweight process check; it does not prove upstream data availability.

This repository does not yet prescribe a hosting provider, container setup, database, or authentication system. The experimental live WebSocket is separate from historical session browsing; complete live telemetry/replay behavior requires further product work.
