"use client";

import { useEffect, useState } from "react";
import { raceStrategy } from "@/components/services/api";
import StrategyChart, { StrategyData } from "@/components/f1/StrategyChart";

type Props = {
    year: string | null;
    round: string | null;
    session: string | null;
};

export default function RaceStrategy({ year, round, session }: Props) {
    // Results are tagged with their request so a param change never shows stale data.
    const key = `${year}/${round}/${session}`;
    const [result, setResult] = useState<{ key: string; data?: StrategyData; error?: string } | null>(null);

    useEffect(() => {
        if (!year || !round || !session) return;

        let cancelled = false;
        raceStrategy(year, round, session)
            .then((data: StrategyData) => {
                if (!cancelled) setResult({ key, data });
            })
            .catch(() => {
                if (!cancelled) setResult({ key, error: "Tyre strategy is unavailable for this session." });
            });
        return () => {
            cancelled = true;
        };
    }, [key, year, round, session]);

    const current = result?.key === key ? result : null;
    const strategy = current?.data;
    const error = current?.error;

    if (error) return <p className="text-sm text-zinc-400">{error}</p>;
    if (!strategy) return <p className="text-sm text-zinc-400">Loading tyre strategy...</p>;

    return <StrategyChart strategy={strategy} />;
}
