// src/components/LapChart.jsx
import { useEffect, useState } from "react";
import { getLaps } from "../services/api";

export default function LapChart({ sessionKey }) {
  const [laps, setLaps] = useState([]);

  useEffect(() => {
    if (!sessionKey) return;

    getLaps(sessionKey).then(setLaps);
  }, [sessionKey]);
let laps_len = laps.length
if (laps_len > 0) {
  laps_len = `Loaded ${laps_len} laps for session ${sessionKey}`;
} else {
 laps_len = `No laps found for session ${sessionKey}`;
}
  return (
    <div>
      <h2>Lap Data (Session {sessionKey})</h2>
      <p>{laps_len}</p>
    </div>
  );
}