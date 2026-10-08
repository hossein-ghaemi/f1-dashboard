"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { liveSession, liveSessions, liveSnapshot } from "@/components/services/api";
import LiveTrack from "@/components/f1/live/LiveTrack";
import LiveLeaderboard from "@/components/f1/live/LiveLeaderboard";
import { ChampionshipPanel, RaceControlFeed, TrackStatus, WeatherStrip } from "@/components/f1/live/LivePanels";
import StrategyChart from "@/components/f1/StrategyChart";
import { LiveInfo, LiveSessionMeta, Snapshot } from "@/components/f1/live/types";

const TICK_MS = 500;
const SPEEDS = [1, 2, 4, 8];
const CURRENT_YEAR = new Date().getFullYear();
// OpenF1 coverage starts in 2023.
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 + 1 }, (_, i) => CURRENT_YEAR - i);

const errorMessage = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" && err.response.data.detail) || fallback;

const clockLabel = (ms: number) => new Date(ms).toISOString().slice(11, 19);

function SessionPicker({ sessionKey, year }: { sessionKey: number | null; year: number }) {
    const router = useRouter();
    const [result, setResult] = useState<{ year: number; sessions: LiveSessionMeta[] } | null>(null);

    useEffect(() => {
        let cancelled = false;
        liveSessions(year)
            .then(data => !cancelled && setResult({ year, sessions: data.sessions }))
            .catch(() => !cancelled && setResult({ year, sessions: [] }));
        return () => {
            cancelled = true;
        };
    }, [year]);

    const sessions = result?.year === year ? result.sessions : [];
    return (
        <div className="flex flex-wrap gap-2">
            <select value={year} aria-label="Season"
                    onChange={e => router.push(`/f1/live?year=${e.target.value}`)}
                    className="rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={sessionKey ?? ""} aria-label="Session"
                    onChange={e => router.push(`/f1/live?year=${year}&session=${e.target.value}`)}
                    className="max-w-xs rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
                {sessionKey == null && <option value="">Latest session</option>}
                {sessions.map(s => (
                    <option key={s.session_key} value={s.session_key}>
                        {s.live ? "● LIVE · " : ""}{s.location} · {s.session_name} ({s.date_start.slice(0, 10)})
                    </option>
                ))}
            </select>
        </div>
    );
}

function LiveView() {
    const searchParams = useSearchParams();
    const requestedKey = Number(searchParams.get("session")) || null;
    const requestedYear = Number(searchParams.get("year"));
    const year = YEARS.includes(requestedYear) ? requestedYear : CURRENT_YEAR;
    // Optional ?t=<ISO time> opens a replay at that moment.
    const requestedT = Date.parse(searchParams.get("t") ?? "");
    const key = String(requestedKey);

    const [infoResult, setInfoResult] = useState<{ key: string; info?: LiveInfo; error?: string } | null>(null);
    const [snapshot, setSnapshot] = useState<{ key: string; data: Snapshot } | null>(null);
    const [snapshotError, setSnapshotError] = useState<string | null>(null);
    const [playing, setPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [selected, setSelected] = useState<number | null>(null);
    const [clockMs, setClockMs] = useState(0);
    const clock = useRef(0);
    const inFlight = useRef(false);

    const current = infoResult?.key === key ? infoResult : null;
    const info = current?.info;
    const snap = snapshot?.key === key ? snapshot.data : null;
    const startMs = info ? Date.parse(info.timeline.start) : 0;
    const endMs = info ? Date.parse(info.timeline.end) : 0;

    useEffect(() => {
        let cancelled = false;
        liveSession(requestedKey ?? undefined)
            .then((data: LiveInfo) => {
                if (cancelled) return;
                const start = Date.parse(data.timeline.start);
                const end = Date.parse(data.timeline.end);
                clock.current = Number.isNaN(requestedT)
                    ? Date.parse(data.timeline.race_start ?? data.timeline.start)
                    : Math.min(Math.max(requestedT, start), end);
                setClockMs(clock.current);
                setInfoResult({ key, info: data });
            })
            .catch(err => {
                if (!cancelled) setInfoResult({ key, error: errorMessage(err, "Unable to load the session.") });
            });
        return () => {
            cancelled = true;
        };
    }, [key, requestedKey, requestedT]);

    const fetchSnapshot = useCallback(async () => {
        if (!info || inFlight.current) return;
        inFlight.current = true;
        try {
            const t = info.mode === "replay" ? new Date(clock.current).toISOString() : undefined;
            const data: Snapshot = await liveSnapshot(info.session.session_key, t);
            setSnapshot({ key, data });
            setSnapshotError(null);
        } catch (err) {
            setSnapshotError(errorMessage(err, "Live data is temporarily unavailable."));
        } finally {
            inFlight.current = false;
        }
    }, [info, key]);

    // Show the opening frame straight away, even when playback is paused.
    useEffect(() => {
        fetchSnapshot();
    }, [fetchSnapshot]);

    useEffect(() => {
        if (!info) return;
        const timer = setInterval(() => {
            if (info.mode === "replay" && playing) {
                clock.current = Math.min(clock.current + TICK_MS * speed, endMs);
                setClockMs(clock.current);
                if (clock.current >= endMs) setPlaying(false);
            }
            if (info.mode === "live" || playing) fetchSnapshot();
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [info, playing, speed, endMs, fetchSnapshot]);

    const seek = (ms: number) => {
        clock.current = ms;
        setClockMs(ms);
        fetchSnapshot();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 py-3">
                <h2 className="text-5xl text-white">Live</h2>
                <SessionPicker sessionKey={info?.session.session_key ?? requestedKey} year={year} />
            </div>

            {current?.error && <p className="text-red-400">{current.error}</p>}
            {!current && <p className="text-zinc-400">Loading session…</p>}

            {info && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <span className={`rounded px-2 py-0.5 text-xs font-black ${info.mode === "live" ? "bg-red-600" : "bg-zinc-700"}`}>
                                    {info.mode === "live" ? "● LIVE" : "REPLAY"}
                                </span>
                                <h3 className="text-xl font-bold text-white">
                                    {info.session.location} · {info.session.session_name}
                                </h3>
                            </div>
                            <p className="text-sm text-zinc-400">{info.session.country_name} · {info.session.date_start.slice(0, 10)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            {snap && <span className="text-2xl font-bold text-white">Lap {snap.lap}</span>}
                            {snap && <TrackStatus status={snap.status} />}
                        </div>
                        {snap && <div className="w-full"><WeatherStrip weather={snap.weather} /></div>}
                    </div>

                    {info.mode === "replay" && (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3">
                            <button onClick={() => setPlaying(p => !p)}
                                    className="w-20 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500">
                                {playing ? "Pause" : "Play"}
                            </button>
                            <div className="flex overflow-hidden rounded-md border border-white/10">
                                {SPEEDS.map(s => (
                                    <button key={s} onClick={() => setSpeed(s)}
                                            className={`px-2.5 py-1.5 text-xs ${speed === s ? "bg-white/15 text-white" : "text-zinc-400 hover:bg-white/5"}`}>
                                        {s}×
                                    </button>
                                ))}
                            </div>
                            <input type="range" min={startMs} max={endMs} step={1000} value={clockMs}
                                   onChange={e => seek(Number(e.target.value))} aria-label="Replay position"
                                   className="min-w-40 flex-1 accent-red-600" />
                            <span className="font-mono text-sm text-zinc-300">{clockLabel(clockMs)} UTC</span>
                        </div>
                    )}

                    {snapshotError && <p className="text-sm text-amber-400">{snapshotError}</p>}

                    {snap ? (
                        <>
                            <div className="grid gap-6 lg:grid-cols-2">
                                <LiveTrack track={info.track} cars={snap.cars} board={snap.leaderboard}
                                           selected={selected} onSelect={setSelected} tickMs={TICK_MS} />
                                <LiveLeaderboard board={snap.leaderboard} selected={selected} onSelect={setSelected} />
                            </div>
                            <div className="rounded-xl border border-white/10 p-4">
                                <h3 className="mb-3 font-semibold text-white">Tyre strategy</h3>
                                {snap.strategy.drivers.length
                                    ? <StrategyChart strategy={snap.strategy} />
                                    : <p className="text-sm text-zinc-500">No stints yet.</p>}
                            </div>
                            <div className="grid gap-6 lg:grid-cols-2">
                                <RaceControlFeed messages={snap.race_control} />
                                <ChampionshipPanel rows={snap.championship} />
                            </div>
                        </>
                    ) : !snapshotError && <p className="text-zinc-400">Loading live data…</p>}
                </>
            )}
        </div>
    );
}

export default function LivePage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading…</div>}>
            <LiveView />
        </Suspense>
    );
}
