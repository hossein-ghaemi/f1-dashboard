"use client";

import {useState} from "react";
import DriverDetails from "./DriverDetails";
import useDriver from "@/hooks/useDriver";


export default function PodiumBlock({data, height, label, highlight}) {

    const [openDriverDetails, setOpenDriverDetails] = useState(false);
    if (!data) return;

    return (<>
        {/* Modal */}
        {openDriverDetails && (<DriverDetails
            data={data}
            onClose={() => setOpenDriverDetails(false)}
        />)}
        {/* Podium */}
        <div className="flex flex-col items-center">

            <div className="mb-2 text-center text-gray-300">

                <button
                    className="text-lg font-bold"
                    onClick={() => setOpenDriverDetails(true)}
                    onClose={() => setOpenDriverDetails(false)}
                >
                    #{`${data.DriverNumber} - ${data.FullName}`}
                </button>

                <div className="text-xs opacity-70">
                    {label} - {data.Time.toFixed(4)}
                </div>

            </div>

            <div
                className={`
                        w-24 ${height}
                        flex items-end justify-center
                        rounded-t-lg
                        ${highlight ? "bg-yellow-500" : "bg-gray-600"}
                    `}
            >
                    <span className="mb-2">
                        P{data.Position}
                    </span>
            </div>
            Points: {data.Points}
        </div>
    </>);
}