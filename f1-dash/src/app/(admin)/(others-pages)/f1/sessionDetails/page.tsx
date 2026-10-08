"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import { compareDrivers, getSessionDetails, lapTimeDistribution } from "@/components/services/api";
import PodiumBlocks from "@/components/f1/positions/PodiumBlocks";
import OtherPositions from "@/components/f1/positions/OtherPositions";
import TrackMap from "@/components/f1/TrackMap";
import RaceStrategy from "@/components/f1/RaceStrategy";
type Driver = {
    Abbreviation: string;
    Position: number | null;
    DriverNumber: string;
    FullName: string;
    Team: string;
    Time: number | null;
};

type SessionDetailsData = {
    event_name: string;
    country: string;
    country_lowercase: string;
    total_laps: number;
    session_info: {
        Type: string;
        SessionStatus: string;
        [key: string]: unknown; // for any additional fields
    };
    round_number: number;
    drivers: Record<string, Driver>;
};

type CompareResponse = {
    image: string; // base64 encoded image
};

function SessionDetails() {
    const searchParams = useSearchParams();

    const year = searchParams.get("year");
    const round = searchParams.get("round");
    const session = searchParams.get("session");

    const [compareImg, setCompareImg] = useState<string | null>(null);
    const [lapDistributionImg, setLapDistributionImg] = useState<string | null>(null);
    const [sessionDetails, setSession] = useState<SessionDetailsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // ---------------- FETCH SESSION ----------------
    useEffect(() => {
        if (!year || !round || !session) return;

        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSession(null);
            setCompareImg(null);
            setLapDistributionImg(null);
            try {
                const data = await getSessionDetails(year, round, session);
                if (!cancelled) setSession(data);
            } catch {
                if (!cancelled) setError("Unable to load session details. Please try again later.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => {
            cancelled = true;
        };
    }, [year, round, session]);

    // ---------------- DERIVED DATA (SAFE) ----------------
    const sortedDrivers = useMemo(() => {
        // Unclassified drivers (null Position, e.g. practice) go last.
        const pos = (d: Driver) => (d.Position == null ? Infinity : Number(d.Position));
        return Object.values(sessionDetails?.drivers || {}).sort(
            (a, b) => pos(a) - pos(b)
        );
    }, [sessionDetails]);

    const podium = sortedDrivers.slice(0, 3);
    const others = sortedDrivers.slice(3);

    const driversString = podium.map(d => d.Abbreviation).join(",");

    // ---------------- COMPARE LAP Time Distribution ----------------
    useEffect(() => {
        if (!sessionDetails || !driversString) return;

        let cancelled = false;
        lapTimeDistribution(year, round, session)
            .then((res: CompareResponse) => {
                if (!cancelled) setLapDistributionImg(res.image);
            })
            .catch(() => {
                if (!cancelled) setLapDistributionImg(null);
            });
        return () => {
            cancelled = true;
        };
    }, [year, round, session, sessionDetails, driversString]);

    // ---------------- COMPARE PLOT ----------------
    useEffect(() => {
        if (!sessionDetails || !driversString) return;

        let cancelled = false;
        compareDrivers(year, round, driversString, session)
            .then((res: CompareResponse) => {
                if (!cancelled) setCompareImg(res.image);
            })
            .catch(() => {
                if (!cancelled) setCompareImg(null);
            });
        return () => {
            cancelled = true;
        };
    }, [year, round, session, sessionDetails, driversString]);

    // ---------------- LOADING STATES ----------------
    if (loading) {
        return <div className="p-6 text-white">Loading session details...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-400">{error}</div>;
    }

    if (!sessionDetails) {
        return <div className="p-6">No session data found</div>;
    }

    // ---------------- UI ----------------
    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 text-gray-900 dark:text-gray-100">
            <div className="text-white text-5xl border-b-2 py-3 mb-4"><h2>Session Details</h2></div>

            {/* Header */}
            <div className="relative border rounded-xl p-5 shadow-sm overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(/images/flags/${sessionDetails.country_lowercase}.jpeg)`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

                <div className="relative z-10">
                    <h1 className="text-2xl font-bold">
                        {sessionDetails.event_name}
                    </h1>
                    <p className="text-sm text-white mt-1">
                        {sessionDetails.country}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 bg-white dark:bg-gray-900">
                    <p className="text-sm text-white">Total Laps</p>
                    <p className="text-xl font-semibold text-gray-400">
                        {sessionDetails.total_laps}
                    </p>
                </div>

                <div className="border rounded-xl p-4 bg-white dark:bg-gray-900">
                    <p className="text-sm text-white">Drivers</p>
                    <p className="text-xl font-semibold text-gray-400">
                        {Object.values(sessionDetails.drivers || {}).length}
                    </p>
                </div>

                <div className="border rounded-xl p-4 bg-white dark:bg-gray-900">
                    <p className="text-sm text-white">Session Status</p>
                    <p className="text-xl font-semibold text-gray-400">
                        {sessionDetails.session_info?.SessionStatus}
                    </p>
                </div>
            </div>

            {/* Drivers */}
            <div className="border rounded-xl p-5 bg-white dark:bg-gray-900">
                <div className="flex items-">
                    <h2 className="text-lg font-semibold mb-3">Drivers</h2>
                </div>
                <PodiumBlocks results={podium} />
                <button
                    className="w-50 rounded-lg  text-left font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-300 bg-center bg-cover background-blend-mode" >
                    <div className="p-2 text-center" style={{ background: "linear-gradient(45deg, #00000061, transparent)" }}>Compare Top 3 Drivers</div>
                </button>
                <TrackMap />
                {compareImg && (
                    <img
                        src={`data:image/png;base64,${compareImg}`}
                        alt="Driver Comparison"
                        width="600"
                        className="mx-auto rounded-lg mb-4"
                    />
                )}
                {lapDistributionImg && (
                    <img
                        src={`data:image/png;base64,${lapDistributionImg}`}
                        alt="Lap Time Distribution"
                        width="600"
                        className="mx-auto rounded-lg mb-4"
                    />
                )}
                <OtherPositions results={others} />
            </div>

            {/* More info */}
            <details open className="border rounded-xl p-5 bg-white dark:bg-gray-900">
                <summary className="cursor-pointer text-lg font-semibold">More info</summary>
                <div className="mt-4 space-y-3">
                    <h3 className="font-semibold text-white">Tyre strategy</h3>
                    <RaceStrategy year={year} round={round} session={session} />
                </div>
            </details>

            {/* Debug */}
            <div className="border rounded-xl p-5 bg-white dark:bg-gray-900">
                <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    {JSON.stringify(sessionDetails.session_info, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export default function SessionDetailsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading session details...</div>}>
            <SessionDetails />
        </Suspense>
    );
}
