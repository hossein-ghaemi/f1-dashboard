"use client";

import { useEffect, useState } from "react";
import { getDrivers } from "@/components/services/api";

export default function useDriver(sessionKey: number, driverNumber: number) {

    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        if (!sessionKey || !driverNumber) return;

        const fetchDriver = async () => {

            try {

                const res = await getDrivers(
                    sessionKey,
                    driverNumber
                );

                setDriver(res[0]);

            } finally {

                setLoading(false);
            }
        };

        fetchDriver();

    }, [sessionKey, driverNumber]);

    return {
        driver,
        loading
    };
}