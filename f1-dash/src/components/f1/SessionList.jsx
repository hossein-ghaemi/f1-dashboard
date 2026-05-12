import { useEffect, useState, useMemo } from "react";
import { getSessions } from "../services/api";
import { useRouter } from "next/navigation";

export default function SessionList({ year }) {
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [openCountry, setOpenCountry] = useState(null);
    useEffect(() => {
        if (!year) return;

        getSessions(year).then(setSessions);
    }, [year]);

    // Group events by country
    const grouped = useMemo(() => {
        return sessions.reduce((acc, event) => {
            if (!acc[event.Country]) {
                acc[event.Country] = [];
            }

            acc[event.Country].push(event);

            return acc;
        }, {});
    }, [sessions]);

    return (<div className="space-y-3">
        <div className="text-white text-5xl border-b-2 py-3 mb-4"><h2>Sessions</h2></div>
        {Object.entries(grouped).map(([country, events]) => (<div
            key={country}
            className=" dark:border-gray-700">
            {/* Country Header */}
            <button
                onClick={() => setOpenCountry(openCountry === country ? null : country)}
                className="w-full rounded-lg  text-left font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-300 bg-center bg-cover background-blend-mode" style={{
                    backgroundImage: `url(/images/flags/${country.toLocaleLowerCase().replace(" ", "")}.jpeg)`,
                }}>
                <div className="p-7" style={{ background: "linear-gradient(45deg, #00000061, transparent)" }}>{country}</div>
            </button>

            {/* Events */}
            {openCountry === country && (<div className="p-3 space-y-4">
                {events.map((event) => {
                    const eventSessions = [event.Session1, event.Session2, event.Session3, event.Session4, event.Session5,].filter(Boolean);
                    return (<div
                        key={`${event.RoundNumber}-${event.EventName}`}
                        className="border rounded-md p-3 dark:border-gray-600">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-200 mb-2">
                            {event.EventName}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {eventSessions.map((sessionName, index) => (<button
                                key={index}
                                onClick={() =>
                                    router.push(
                                        `/f1/sessionDetails?year=${year}&round=${event.RoundNumber}&session=${encodeURIComponent(sessionName)}`
                                    )
                                }
                                className="text-left rounded-md border px-3 py-2 text-sm text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                {sessionName}
                            </button>))}
                        </div>
                    </div>);
                })}
            </div>)}
        </div>))}
    </div>);
}