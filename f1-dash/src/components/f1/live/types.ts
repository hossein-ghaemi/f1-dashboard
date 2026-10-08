import type { StrategyData } from "@/components/f1/StrategyChart";

export type LiveSessionMeta = {
    session_key: number;
    session_name: string;
    session_type: string;
    circuit_short_name: string;
    country_name: string;
    location: string;
    date_start: string;
    date_end: string;
    year: number;
    live?: boolean;
};

export type LiveDriver = {
    driver_number: number;
    name_acronym: string;
    full_name: string;
    team_name: string;
    team_colour: string | null;
};

export type TrackOutline = {
    x: number[];
    y: number[];
    rotation: number;
    corners: { number: number; x: number; y: number }[];
};

export type LiveInfo = {
    session: LiveSessionMeta;
    mode: "live" | "replay";
    timeline: { start: string; end: string; race_start: string | null };
    track: TrackOutline | null;
    drivers: LiveDriver[];
};

export type BoardEntry = {
    driver_number: number;
    acronym: string;
    name: string;
    team: string;
    team_colour: string | null;
    position: number | null;
    gap_to_leader: number | string | null;
    interval: number | string | null;
    lap: number;
    last_lap: number | null;
    best_lap: number | null;
    compound: string | null;
    tyre_age: number | null;
    pit_stops: number;
    in_pit: boolean;
};

export type RaceControlMessage = {
    date: string;
    category: string;
    flag: string | null;
    message: string;
    lap_number: number | null;
};

export type Weather = {
    air_temperature: number;
    track_temperature: number;
    humidity: number;
    rainfall: number;
    wind_speed: number;
};

export type ChampionshipEntry = {
    driver_number: number;
    acronym: string | null;
    name: string | null;
    team_colour: string | null;
    position_start: number | null;
    position_current: number | null;
    points_start: number | null;
    points_current: number | null;
};

export type Snapshot = {
    t: string;
    lap: number;
    status: { flag: string | null; message: string } | null;
    weather: Weather | null;
    leaderboard: BoardEntry[];
    cars: { driver_number: number; x: number; y: number }[];
    race_control: RaceControlMessage[];
    strategy: StrategyData;
    championship: ChampionshipEntry[];
};

export const teamColour = (colour: string | null | undefined) => (colour ? `#${colour}` : "#71717A");

export const formatLapTime = (seconds: number | null) => {
    if (seconds == null) return "-";
    const minutes = Math.floor(seconds / 60);
    const rest = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
    return minutes ? `${minutes}:${rest}` : rest;
};

export const formatGap = (gap: number | string | null, isLeader: boolean) => {
    if (isLeader) return "Leader";
    if (gap == null) return "-";
    return typeof gap === "number" ? `+${gap.toFixed(3)}` : gap;
};
