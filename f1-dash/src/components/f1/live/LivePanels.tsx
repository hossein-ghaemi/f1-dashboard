"use client";

import { ChampionshipEntry, RaceControlMessage, Snapshot, teamColour } from "@/components/f1/live/types";

const FLAG_STYLES: Record<string, string> = {
    GREEN: "bg-green-600",
    CLEAR: "bg-green-600",
    YELLOW: "bg-yellow-400 text-zinc-900",
    "DOUBLE YELLOW": "bg-yellow-400 text-zinc-900",
    RED: "bg-red-600",
    CHEQUERED: "bg-zinc-100 text-zinc-900",
};

export function TrackStatus({ status }: { status: Snapshot["status"] }) {
    if (!status) return <span className="rounded bg-zinc-700 px-2 py-1 text-xs font-bold">NO STATUS</span>;
    const safetyCar = !status.flag && /SAFETY CAR/.test(status.message) && !/ENDING|IN THIS LAP/.test(status.message);
    const style = safetyCar ? "bg-orange-500 text-zinc-900" : FLAG_STYLES[status.flag ?? ""] ?? "bg-zinc-700";
    return <span className={`rounded px-2 py-1 text-xs font-bold ${style}`}>{status.message}</span>;
}

export function WeatherStrip({ weather }: { weather: Snapshot["weather"] }) {
    if (!weather) return null;
    const items = [
        ["Air", `${weather.air_temperature}°C`],
        ["Track", `${weather.track_temperature}°C`],
        ["Humidity", `${weather.humidity}%`],
        ["Wind", `${weather.wind_speed} m/s`],
        ["Rain", weather.rainfall ? "Yes" : "No"],
    ];
    return (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {items.map(([label, value]) => (
                <span key={label}><span className="text-zinc-500">{label}</span> <span className="text-white">{value}</span></span>
            ))}
        </div>
    );
}

export function RaceControlFeed({ messages }: { messages: RaceControlMessage[] }) {
    return (
        <div className="rounded-xl border border-white/10 p-4">
            <h3 className="mb-3 font-semibold text-white">Race control</h3>
            {messages.length === 0 && <p className="text-sm text-zinc-500">No messages yet.</p>}
            <ul className="space-y-2 text-sm">
                {messages.map(m => (
                    <li key={`${m.date}-${m.message}`} className="flex gap-3">
                        <span className="shrink-0 font-mono text-xs text-zinc-500">
                            {new Date(m.date).toISOString().slice(11, 19)}
                        </span>
                        <span className="text-zinc-200">{m.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ChampionshipPanel({ rows }: { rows: ChampionshipEntry[] }) {
    return (
        <div className="rounded-xl border border-white/10 p-4">
            <h3 className="font-semibold text-white">Drivers&apos; championship</h3>
            <p className="mb-3 text-xs text-zinc-500">Projected after this race</p>
            {rows.length === 0 && <p className="text-sm text-zinc-500">Only available for races.</p>}
            <ol className="space-y-1 text-sm">
                {rows.slice(0, 10).map(row => {
                    const moved = (row.position_start ?? 0) - (row.position_current ?? 0);
                    const gained = (row.points_current ?? 0) - (row.points_start ?? 0);
                    return (
                        <li key={row.driver_number} className="flex items-center gap-2">
                            <span className="w-5 text-right font-bold text-white">{row.position_current}</span>
                            <span className="h-4 w-1 rounded" style={{ backgroundColor: teamColour(row.team_colour) }} />
                            <span className="w-10 font-mono text-white">{row.acronym ?? row.driver_number}</span>
                            <span className={`w-6 text-xs ${moved > 0 ? "text-green-400" : moved < 0 ? "text-red-400" : "text-zinc-600"}`}>
                                {moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : "–"}
                            </span>
                            <span className="ml-auto font-semibold text-white">{row.points_current}</span>
                            <span className="w-10 text-right text-xs text-green-400">{gained ? `+${gained}` : ""}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
