// src/components/SessionList.jsx
import { useEffect, useState } from "react";
import { getSessions } from "../services/api";

export default function SessionList({ onSelect }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  return (
    <div>
      <h2>Sessions</h2>
      <ul>
        {sessions.map((s) => (
          <li key={s.session_key}>
            <button onClick={() => onSelect(s.session_key)}>
              {s.session_name} ({s.country_name} - {s.location} - {s.circuit_short_name})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}