// src/services/api.js
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const getSessions = async (year = (new Date().getFullYear())) => {
    const res = await axios.get(`${API_BASE}/f1Sessions`, { params: { year } });
    return res.data;
};

export const getSessionDetails = async (year, round_number, identifier) => {
    const res = await axios.get(`${API_BASE}/sessionDetails`, {
        params: { year, round_number, identifier },
    });
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

export const compareDrivers = async (year, round_number, drivers, identifier) => {
    const res = await axios.get(`${API_BASE}/compare-drivers`, {
        params: {
            year,
            round_number,
            drivers, // "NOR,VER,LEC"
            identifier
        },
    });
    return res.data;
};

export const lapTimeDistribution = async (year, round_number, identifier) => {
    const res = await axios.get(`${API_BASE}/lapTimeDistribution`, {
        params: {
            year,
            round_number,
            identifier
        },
    });
    return res.data;
};

export const trackMap = async (year, round_number, identifier) => {
    const res = await axios.get(`${API_BASE}/track-map`, {
        params: {
            year,
            round_number,
            identifier
        },
    });
    return res.data;
};
export const driverStandings = async (year, round_number) => {
    const res = await axios.get(`${API_BASE}/driverStandings`, {
        params: { year, round_number },
    });
    return res.data;
};

export const raceStrategy = async (year, round_number, identifier) => {
    const res = await axios.get(`${API_BASE}/raceStrategy`, {
        params: { year, round_number, identifier },
    });
    return res.data;
};

export const liveSessions = async (year) => {
    const res = await axios.get(`${API_BASE}/live/sessions`, { params: { year } });
    return res.data;
};

export const liveSession = async (session_key) => {
    const res = await axios.get(`${API_BASE}/live/session`, { params: { session_key } });
    return res.data;
};

export const liveSnapshot = async (session_key, t) => {
    const res = await axios.get(`${API_BASE}/live/snapshot`, { params: { session_key, t } });
    return res.data;
};
