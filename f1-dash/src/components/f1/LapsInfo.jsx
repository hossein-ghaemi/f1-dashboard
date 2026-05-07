"use client"
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {getLaps} from "../services/api";

export default function LapChart({sessionKey, sessionData}) {
    const [laps, setLaps] = useState([]);
    const router = useRouter();

    useEffect(() => {
        if (!sessionKey) return;
        getLaps(sessionKey).then(setLaps);
    }, [sessionKey]);

    let laps_len = laps.length;
    if (laps_len > 0) {
        laps_len = `Loaded ${laps_len} laps for session ${sessionKey}`;
    } else {
        laps_len = `No laps found for session ${sessionKey}`;
    }

    const handleMoreInfo = () => {
        router.push(`/f1/sessionDetails?sessionKey=${sessionKey}&position=20`);
    };

    return (
        <div className="border rounded-lg p-4 dark:border-gray-700 mb-2 text-gray-300">
            <h2>Lap Data (Session {sessionKey})</h2>
            <p>{laps_len}</p>
            {laps.length > 0 && (
                <button onClick={handleMoreInfo}
                        className="text-left rounded-md border px-3 py-2 text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                    More Info
                </button>)}
        </div>
    );
}