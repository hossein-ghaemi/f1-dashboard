"use client";

import { useEffect, useState } from "react";
import { getDrivers } from "../../services/api";

export default function DriverDetails({ data, onClose }) {

    const [driver, setDriver] = useState({
        full_name: "Loading..."
    });

    useEffect(() => {

        if (!data) return;

        const fetchDriver = async () => {

            const res = await getDrivers(
                data.session_key,
                data.driver_number
            );

            setDriver(res[0]);
        };

        fetchDriver();

    }, [data]);

    if (!data) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div className="bg-gray-800 p-6 rounded-lg w-[500px] text-white">

                <div className="grid grid-cols-3 gap-4 items-center">

                    <div className="col-span-1 flex justify-center">
                        <img
                            src={driver.headshot_url}
                            className="w-[110px] rounded-lg"
                            alt={driver.full_name}
                        />
                    </div>

                    <div className="col-span-2">

                        <h2 className="text-2xl font-bold mb-4">
                            {driver.full_name}
                        </h2>

                        <p>
                            <strong>Broadcast name:</strong> {driver.broadcast_name}
                        </p>
                        <p>
                            <strong>Team:</strong> {driver.team_name}
                        </p>

                        <p>
                            <strong>Number:</strong> #{driver.driver_number}
                        </p>

                    </div>

                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 rounded"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}