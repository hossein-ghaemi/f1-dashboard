"use client"
import {useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";
import {getSessionDetails} from "@/components/services/api";
import Positions from "@/components/f1/positions/Positions";
export default function SessionDetails() {
    const searchParams = useSearchParams();
    const sessionKey = searchParams.get("sessionKey");
    const positionRange = searchParams.get("position") ?? 3;
    const [sessionDetails, setResults] = useState([]);
    useEffect(() => {
        if (!sessionKey) return;
        const fetchData = async () => {
            const data = await getSessionDetails(sessionKey, positionRange);
            setResults(data);
        };

        fetchData();
    }, [sessionKey, positionRange]);
    return (
        <div className="p-4 text-gray-300">
            <h1>Session Details</h1>
            <p>Session Key: {sessionKey}</p>
            <Positions results={sessionDetails}/>
        </div>
    );
}