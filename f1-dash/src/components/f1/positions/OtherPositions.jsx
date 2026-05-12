"use client";

import {useState} from "react";
import DriverDetails from "@/components/f1/positions/DriverDetails";

export default function OtherPositions({results}) {

    const [openDriverDetails, setOpenDriverDetails] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    return (<>
        {/* Modal (ONLY ONCE) */}
        {openDriverDetails && selectedDriver && (<DriverDetails
            data={selectedDriver}
            onClose={() => setOpenDriverDetails(false)}
        />)}

        <div className="mt-10">

            <h2 className="text-xl font-bold mb-4 text-white">
                Other Positions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {results.map(driver => (
                    <div
                        key={driver.DriverNumber}
                        className="bg-gray-800 rounded-lg p-4 text-white border border-gray-700"
                    >

                        <div className="text-lg font-bold">
                            P{driver.Position}
                        </div>

                        <div>
                            <button
                                className="text-lg font-bold text-blue-400"
                                onClick={() => {
                                    setSelectedDriver(driver);
                                    setOpenDriverDetails(true);
                                }}
                            >
                                #{driver.DriverNumber} - {driver.FullName}
                            </button>
                        </div>

                        <div className="text-sm opacity-70">
                            Status: {driver.Status} -
                            Time: {driver.Time ? Number(driver.Time).toFixed(4) : "-"} -


                        </div>

                    </div>
                ))}

            </div>
        </div>
    </>)
        ;
}