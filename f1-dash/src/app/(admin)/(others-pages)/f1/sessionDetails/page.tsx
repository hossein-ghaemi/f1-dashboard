"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { compareDrivers, getSessionDetails } from "@/components/services/api";
import PodiumBlocks from "@/components/f1/positions/PodiumBlocks";
import OtherPositions from "@/components/f1/positions/OtherPositions";
import TrackMap from "../track_map/page";
type Driver = {
    Abbreviation: string;
    Position: string;
    Driver: string;
    Team: string;
    Time: string;
};

type SessionDetailsData = {
    event_name: string;
    country: string;
    country_lowercase: string;
    total_laps: number;
    session_info: {
        Type: string;
        SessionStatus: string;
        [key: string]: any; // for any additional fields
    };
    round_number: string;
    drivers: Record<string, Driver>;
};

type CompareResponse = {
    image: string; // base64 encoded image
};

export default function SessionDetails() {
    const searchParams = useSearchParams();

    const year = searchParams.get("year");
    const round = searchParams.get("round");
    const session = searchParams.get("session");

    const [compareImg, setCompareImg] = useState(null);
    const [sessionDetails, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    // ---------------- FETCH SESSION ----------------
    useEffect(() => {
        if (!year || !round || !session) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getSessionDetails(year, round, session);
                setSession(data);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [year, round, session]);

    // ---------------- DERIVED DATA (SAFE) ----------------
    const sortedDrivers = useMemo(() => {
        return Object.values(sessionDetails?.drivers || {}).sort(
            (a, b) => Number(a.Position) - Number(b.Position)
        );
    }, [sessionDetails]);

    const podium = sortedDrivers.slice(0, 3);
    const others = sortedDrivers.slice(3);

    const driversString = podium.map(d => d.Abbreviation).join(",");

    // ---------------- COMPARE PLOT ----------------
    useEffect(() => {
        if (!sessionDetails || !driversString) return;

        compareDrivers(
            year,
            sessionDetails.round_number,
            driversString,
            sessionDetails.session_info?.Type
        ).then((res) => {
            setCompareImg(res.image);
        });
    }, [year, sessionDetails, driversString]);

    // ---------------- LOADING STATES ----------------
    if (loading) {
        return <div className="p-6 text-white">Loading session details...</div>;
    }

    if (!sessionDetails) {
        return <div className="p-6">No session data found</div>;
    }

    // ---------------- UI ----------------
    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 text-gray-900 dark:text-gray-100">
            <div className="text-white text-5xl border-b-2 py-3 mb-4"><h2>Session Details</h2></div>

            {/* Header */}
            <div
                className="border rounded-xl p-5 bg-white dark:bg-gray-900 shadow-sm bg-cover bg-center"
                style={{
                    backgroundImage: `url(/images/flags/${sessionDetails.country_lowercase}.jpeg)`,
                }}
            >
                <h1 className="text-2xl font-bold">
                    {sessionDetails.event_name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {sessionDetails.country}
                </p>
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

                <OtherPositions results={others} />
            </div>

            {/* Debug */}
            <div className="border rounded-xl p-5 bg-white dark:bg-gray-900">
                <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    {JSON.stringify(sessionDetails.session_info, null, 2)}
                </pre>
            </div>
        </div>
    );
}