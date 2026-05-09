// src/services/api.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

export const getSessions = async (year = (new Date().getFullYear())) => {
    const res = await axios.get(`${API_BASE}/f1Sessions`);
    console.log(res)
    return res.data;
};

export const getSessionDetails = async (year, round_number, identifier) => {
    const res = await axios.get(`${API_BASE}/sessionDetails?year=${year}&round_number=${round_number}&identifier=${identifier}`);
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

export const compareDrivers =  async (year, round_number, drivers,identifier) => {
    console.log(round_number)
    const res = await axios.get(`${API_BASE}/compare-drivers`, {
        params: {
            year,
            round_number,
            drivers, // "NOR,VER,LEC"
            identifier
        },
    });
    console.log(res)
    return res.data;
};