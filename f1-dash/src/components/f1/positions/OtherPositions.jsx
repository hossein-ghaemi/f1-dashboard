"use client";

import { useState } from "react";
import DriverDetails from "@/components/f1/positions/DriverDetails";

export default function OtherPositions({ results = [] }) {

    const [openDriverDetails, setOpenDriverDetails] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);

    const otherDrivers = results.filter(
        r => Number(r.position) > 3
    );

    return (
        <>
            {/* Modal (ONLY ONCE) */}
            {openDriverDetails && selectedDriver && (
                <DriverDetails
                    data={selectedDriver}
                    onClose={() => setOpenDriverDetails(false)}
                />
            )}

            <div className="mt-10">

                <h2 className="text-xl font-bold mb-4 text-white">
                    Other Positions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {otherDrivers.map(driver => (
                        <div
                            key={driver.driver_number}
                            className="bg-gray-800 rounded-lg p-4 text-white border border-gray-700"
                        >

                            <div className="text-lg font-bold">
                                P{driver.position}
                            </div>

                            <div>
                                <button
                                    className="text-lg font-bold text-blue-400"
                                    onClick={() => {
                                        setSelectedDriver(driver);
                                        setOpenDriverDetails(true);
                                    }}
                                >
                                    #{driver.driver_number}
                                </button>
                            </div>

                            <div className="text-sm opacity-70">
                                Laps: {driver.number_of_laps}
                            </div>

                        </div>
                    ))}

                </div>
            </div>
        </>
    );
}