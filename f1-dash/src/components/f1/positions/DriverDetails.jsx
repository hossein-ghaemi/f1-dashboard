"use client";

import useDriver from "@/hooks/useDriver";

export default function DriverDetails({data, onClose}) {


    if (!data) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div className="bg-gray-800 p-6 rounded-lg w-[500px] text-white">

                <div className="grid grid-cols-3 gap-4 items-center">

                    <div className="col-span-1 flex justify-center">
                        <img
                            src={data.HeadshotUrl}
                            className="w-[110px] rounded-lg"
                            alt={data.FullName}
                        />
                    </div>

                    <div className="col-span-2">

                        <h2 className="text-2xl font-bold mb-4">
                            {data.FullName}
                        </h2>

                        <p>
                            <strong>Broadcast name:</strong> {data.BroadcastName}
                        </p>
                        <p>
                            <strong>Team:</strong> {data.Team}
                        </p>

                        <p>
                            <strong>Number:</strong> #{data.DriverNumber}
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