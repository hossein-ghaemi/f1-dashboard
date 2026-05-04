import { useEffect, useState, useMemo } from "react";
import { getSessions } from "../services/api";

export default function SessionList({ year, onSelect }) {
  const [sessions, setSessions] = useState([]);
  const [openCountry, setOpenCountry] = useState(null);

  useEffect(() => {
    if (!year) return;
    getSessions(year).then(setSessions);
  }, [year]);

  // group sessions by country
  const grouped = useMemo(() => {
    return sessions.reduce((acc, s) => {
      if (!acc[s.country_name]) {
        acc[s.country_name] = [];
      }
      acc[s.country_name].push(s);
      return acc;
    }, {});
  }, [sessions]);

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([country, countrySessions]) => (
        <div
          key={country}
          className="border rounded-lg dark:border-gray-700"
        >
          {/* Country header */}
          <button
            onClick={() =>
              setOpenCountry(openCountry === country ? null : country)
            }
            className="w-full text-left px-4 py-3 font-medium bg-gray-100 text-gray-300 dark:bg-gray-800"
          >
            {country}
          </button>

          {/* Dropdown content */}
          {openCountry === country && (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {countrySessions.map((s) => (
                <button
                  key={s.session_key}
                  onClick={() => onSelect(s.session_key)}
                  className="
                    text-left rounded-md border px-3 py-2 text-gray-300
                    text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                  "
                >
                  {s.session_name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}