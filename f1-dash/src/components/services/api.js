// src/services/api.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

export const getSessions = async (year = (new Date().getFullYear())) => {
    const res = await axios.get(`${API_BASE}/sessions?year=${year}`);
    return res.data;
};

export const getSessionDetails = async (sessionKey, positionRange) => {
    const res = await axios.get(`${API_BASE}/sessionDetails?session_key=${sessionKey}&position=${positionRange}`);
    return res.data;
};

export const getLaps = async (sessionKey) => {
    const res = await axios.get(
        `${API_BASE}/laps?session_key=${sessionKey}`
    );
    return res.data;
};
export const getDrivers = async (sessionKey, driverNumber) => {
    const res = await axios.get(
        `${API_BASE}/drivers?session_key=${sessionKey}&driver_number=${driverNumber}`
    );
    return res.data;
};