"use client";

export type Stint = {
    stint: number;
    compound: string;
    start_lap: number;
    end_lap: number;
    laps: number;
    fresh_tyre: boolean | null;
    start_tyre_age: number | null;
};

export type DriverStrategy = {
    driver: string;
    pit_stops: number;
    stints: Stint[];
};

export type StrategyData = {
    total_laps: number;
    drivers: DriverStrategy[];
};

// Pirelli compound colours; unknown compounds fall back to grey.
const COMPOUND_COLORS: Record<string, string> = {
    SOFT: "#DA291C",
    MEDIUM: "#FFD12E",
    HARD: "#F0F0F0",
    INTERMEDIATE: "#43B02A",
    WET: "#0067AD",
};

export const compoundColor = (compound: string) => COMPOUND_COLORS[compound] ?? "#71717A";

export default function StrategyChart({ strategy }: { strategy: StrategyData }) {
    const total = Math.max(strategy.total_laps, 1);
    const compounds = Array.from(
        new Set(strategy.drivers.flatMap(d => d.stints.map(s => s.compound)))
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs text-zinc-300">
                {compounds.map(compound => (
                    <span key={compound} className="flex items-center gap-1.5">
                        <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: compoundColor(compound) }}
                        />
                        {compound}
                    </span>
                ))}
                <span className="text-zinc-500">Striped = used tyres</span>
            </div>

            <div className="space-y-1.5">
                {strategy.drivers.map(driver => (
                    <div key={driver.driver} className="flex items-center gap-3">
                        <span className="w-10 shrink-0 font-mono text-sm font-semibold text-white">
                            {driver.driver}
                        </span>
                        <div className="relative h-6 flex-1 overflow-hidden rounded bg-zinc-800">
                            {driver.stints.map(stint => (
                                <div
                                    key={stint.stint}
                                    title={`Stint ${stint.stint}: ${stint.compound}, laps ${stint.start_lap}-${stint.end_lap}` +
                                        (stint.start_tyre_age != null ? `, tyre age at start ${stint.start_tyre_age}` : "")}
                                    className="absolute top-0 flex h-full items-center justify-center border-r-2 border-zinc-950 text-[10px] font-bold text-zinc-900"
                                    style={{
                                        left: `${((stint.start_lap - 1) / total) * 100}%`,
                                        width: `${(stint.laps / total) * 100}%`,
                                        backgroundColor: compoundColor(stint.compound),
                                        backgroundImage: stint.fresh_tyre === false
                                            ? "repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.25) 4px 8px)"
                                            : undefined,
                                    }}
                                >
                                    {stint.laps >= 4 ? stint.laps : ""}
                                </div>
                            ))}
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs text-zinc-400">
                            {driver.pit_stops} {driver.pit_stops === 1 ? "stop" : "stops"}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex justify-between pl-[3.25rem] pr-[4.25rem] text-xs text-zinc-500">
                <span>Lap 1</span>
                <span>Lap {strategy.total_laps}</span>
            </div>
        </div>
    );
}
