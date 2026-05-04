// src/App.jsx or App.js
import { useState } from "react";
import SessionList from "./components/SessionList";
import LapChart from "./components/LapChart";

function App() {
  const [selectedSession, setSelectedSession] = useState(null);

  return (
    <div>
      <h1>F1 Dashboard</h1>

      <SessionList onSelect={setSelectedSession} />

      {selectedSession && (
        <LapChart sessionKey={selectedSession} />
      )}
    </div>
  );
}

export default App;