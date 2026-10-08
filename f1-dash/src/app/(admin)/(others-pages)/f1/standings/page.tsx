"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { driverStandings } from "@/components/services/api";

type Standing = {
    position: number | null;
    points: number;
    wins: number;
    driver_id: string;
    code: string | null;
    given_name: string;
    family_name: string;
    nationality: string;
    teams: string[];
};

type StandingsData = {
    year: number;
    round: number;
    standings: Standing[];
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i);

function DriverStandings() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedYear = Number(searchParams.get("year"));
    const year = YEARS.includes(requestedYear) ? requestedYear : CURRENT_YEAR;

    // Results are tagged with their year so switching seasons never shows stale data.
    const [result, setResult] = useState<{ year: number; data?: StandingsData; error?: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        driverStandings(year)
            .then((res: StandingsData) => {
                if (!cancelled) setResult({ year, data: res });
            })
            .catch(() => {
                if (!cancelled) setResult({ year, error: `Driver standings for ${year} are unavailable.` });
            });
        return () => {
            cancelled = true;
        };
    }, [year]);

    const current = result?.year === year ? result : null;
    const data = current?.data;
    const error = current?.error;

    const leaderPoints = data?.standings[0]?.points || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 py-3">
                <h2 className="text-5xl text-white">Driver Standings</h2>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    Season
                    <select
                        value={year}
                        onChange={e => router.push(`/f1/standings?year=${e.target.value}`)}
                        className="rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                    >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </label>
            </div>

            {error && <p className="text-red-400">{error}</p>}
            {!error && !data && <p className="text-zinc-400">Loading standings...</p>}

            {data && (
                <>
                    <p className="text-sm text-zinc-400">After round {data.round} of the {data.year} season</p>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                                <tr>
                                    <th className="px-4 py-3">Pos</th>
                                    <th className="px-4 py-3">Driver</th>
                                    <th className="hidden px-4 py-3 sm:table-cell">Team</th>
                                    <th className="px-4 py-3 text-right">Wins</th>
                                    <th className="px-4 py-3 text-right">Points</th>
                                    <th className="hidden px-4 py-3 md:table-cell">Gap</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.standings.map((s, i) => (
                                    <tr key={s.driver_id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 font-bold text-white">{s.position ?? "-"}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-white">{s.given_name} {s.family_name}</span>
                                            {s.code && <span className="ml-2 font-mono text-xs text-zinc-500">{s.code}</span>}
                                            <div className="text-xs text-zinc-500 sm:hidden">{s.teams.join(" / ")}</div>
                                        </td>
                                        <td className="hidden px-4 py-3 text-zinc-300 sm:table-cell">{s.teams.join(" / ")}</td>
                                        <td className="px-4 py-3 text-right text-zinc-300">{s.wins}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-white">{s.points}</td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-32 overflow-hidden rounded bg-zinc-800">
                                                    <div
                                                        className="h-full bg-red-600"
                                                        style={{ width: `${leaderPoints ? (s.points / leaderPoints) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-500">
                                                    {i === 0 ? "Leader" : `-${leaderPoints - s.points}`}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default function DriverStandingsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading standings...</div>}>
            <DriverStandings />
        </Suspense>
    );
}
