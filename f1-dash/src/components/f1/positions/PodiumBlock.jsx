"use client";

import {useEffect, useState} from "react";
import {getDrivers} from "@/components/services/api";
import DriverDetails from "./DriverDetails";

export default function PodiumBlock({
                                        data, height, label, highlight
                                    }) {
    if (!data) return;

    const [openDriverDetails, setOpenDriverDetails] = useState(false);
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
                        #{data.driver_number}
                    </button>

                    <div className="text-xs opacity-70">
                        {label}
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
                        P{data.position}
                    </span>
                </div>

            </div>
        </>);
}