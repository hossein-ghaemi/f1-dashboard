// src/services/api.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

export const getSessions = async (year) => {
  const res = await axios.get(`${API_BASE}/sessions?year=${year}`);
  return res.data;
};

export const getLaps = async (sessionKey) => {
  const res = await axios.get(
    `${API_BASE}/laps?session_key=${sessionKey}`
  );
  return res.data;
};