"use client";

import { useEffect, useState } from "react";
import { trackMap } from "@/components/services/api";
import { useSearchParams } from "next/navigation";

type Point = {
    X: number;
    Y: number;
};

type Corner = {
    Number: number;
    Letter: string;
    X: number;
    Y: number;
    Angle: number;
};

type TrackData = {
    rotation: number;
    track: Point[];
    corners: Corner[];
};

export default function TrackMap() {
    const searchParams = useSearchParams();

    const year = searchParams.get("year");
    const round = searchParams.get("round");
    const session = searchParams.get("session");

    const [circuit_info, setCircuitInfo] = useState(null);
    const [openCircuit, setOpenCircuit] = useState(Boolean);
    useEffect(() => {
        if (!year || !round || !session) return;

        const fetchData = async () => {
            const data = await trackMap(year, round, session);
            setCircuitInfo(data);
        };
        fetchData();
    }, [year, round, session]);

    if (!circuit_info) {
        return <div>Loading...</div>;
    }

    const points = circuit_info.track
        .map((p: Point) => `${p.X},${p.Y}`)
        .join(" ");

    return (
        <div className="bg-gray-900 p-4 rounded-lg">
            <button
                onClick={() => setOpenCircuit(openCircuit ? false : true)}
                className="w-50 rounded-lg  text-left font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-300 bg-center bg-cover background-blend-mode">
                <div className="text-center p-2" >{openCircuit ? "Hide" : "Show"} Track</div>
            </button>
            {openCircuit && (
                <svg
                    viewBox="-7000 -5500 20000 7200"
                    className="h-[212px] w-full">

                    {/* Track line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="white"
                        strokeWidth="80"
                    />

                    {/* Corners */}
                    {circuit_info.corners.map((corner, idx) => (
                        <g key={idx}>

                            <circle
                                cx={corner.X}
                                cy={corner.Y}
                                r="180"
                                fill="red"
                            />

                            <text
                                x={corner.X}
                                y={corner.Y}
                                textAnchor="middle"
                                fill="black"
                                fontSize="140"
                                dy="40"
                            >
                                {corner.Number}
                                {corner.Letter}
                            </text>

                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
}