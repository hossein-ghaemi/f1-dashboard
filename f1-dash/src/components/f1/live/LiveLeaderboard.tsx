"use client";

import { compoundColor } from "@/components/f1/StrategyChart";
import { BoardEntry, formatGap, formatLapTime, teamColour } from "@/components/f1/live/types";

type Props = {
    board: BoardEntry[];
    selected: number | null;
    onSelect: (driverNumber: number | null) => void;
};

export default function LiveLeaderboard({ board, selected, onSelect }: Props) {
    const fastest = Math.min(...board.map(d => d.best_lap ?? Infinity));
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Driver</th>
                        <th className="px-3 py-2 text-right">Gap</th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">Int</th>
                        <th className="hidden px-3 py-2 text-right md:table-cell">Last</th>
                        <th className="hidden px-3 py-2 text-right xl:table-cell">Best</th>
                        <th className="px-3 py-2">Tyre</th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">Pits</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {board.map((d, i) => (
                        <tr key={d.driver_number}
                            onClick={() => onSelect(selected === d.driver_number ? null : d.driver_number)}
                            className={`cursor-pointer ${selected === d.driver_number ? "bg-white/10" : "hover:bg-white/5"}`}>
                            <td className="px-3 py-1.5 font-bold text-white">{d.position ?? "-"}</td>
                            <td className="px-3 py-1.5">
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-1 rounded" style={{ backgroundColor: teamColour(d.team_colour) }} />
                                    <span className="font-mono font-semibold text-white">{d.acronym}</span>
                                    {d.in_pit && <span className="rounded bg-sky-600 px-1 text-[10px] font-bold">PIT</span>}
                                </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-zinc-300">{formatGap(d.gap_to_leader, i === 0)}</td>
                            <td className="hidden px-3 py-1.5 text-right font-mono text-zinc-400 sm:table-cell">
                                {i === 0 ? "-" : formatGap(d.interval, false)}
                            </td>
                            <td className="hidden px-3 py-1.5 text-right font-mono text-zinc-300 md:table-cell">{formatLapTime(d.last_lap)}</td>
                            <td className={`hidden px-3 py-1.5 text-right font-mono xl:table-cell ${d.best_lap === fastest ? "text-purple-400" : "text-zinc-400"}`}>
                                {formatLapTime(d.best_lap)}
                            </td>
                            <td className="px-3 py-1.5">
                                {d.compound ? (
                                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-zinc-300" title={d.compound}>
                                        <span className="inline-block h-3 w-3 rounded-full"
                                              style={{ backgroundColor: compoundColor(d.compound) }} />
                                        {d.compound[0]} · {d.tyre_age ?? "-"}
                                    </span>
                                ) : "-"}
                            </td>
                            <td className="hidden px-3 py-1.5 text-right text-zinc-400 sm:table-cell">{d.pit_stops}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
