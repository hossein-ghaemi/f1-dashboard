"use client";

import { useMemo } from "react";
import { BoardEntry, TrackOutline, teamColour } from "@/components/f1/live/types";

type Props = {
    track: TrackOutline | null;
    cars: { driver_number: number; x: number; y: number }[];
    board: BoardEntry[];
    selected: number | null;
    onSelect: (driverNumber: number | null) => void;
    tickMs: number;
};

const PADDING = 0.08;

export default function LiveTrack({ track, cars, board, selected, onSelect, tickMs }: Props) {
    // Rotate circuit coordinates and flip Y (SVG grows downward) once per track.
    const geometry = useMemo(() => {
        if (!track || track.x.length < 2) return null;
        const angle = (track.rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = (Math.min(...track.x) + Math.max(...track.x)) / 2;
        const cy = (Math.min(...track.y) + Math.max(...track.y)) / 2;
        const project = (x: number, y: number) => {
            const dx = x - cx;
            const dy = y - cy;
            return { x: dx * cos - dy * sin, y: -(dx * sin + dy * cos) };
        };
        const outline = track.x.map((x, i) => project(x, track.y[i]));
        const xs = outline.map(p => p.x);
        const ys = outline.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const width = Math.max(...xs) - minX;
        const height = Math.max(...ys) - minY;
        const pad = Math.max(width, height) * PADDING;
        return {
            project,
            path: outline.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ") + " Z",
            viewBox: `${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`,
            scale: Math.max(width, height),
            corners: track.corners.map(c => ({ number: c.number, ...project(c.x, c.y) })),
        };
    }, [track]);

    const byNumber = useMemo(() => new Map(board.map(d => [d.driver_number, d])), [board]);

    if (!geometry) {
        return (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 text-sm text-zinc-500">
                Track map will appear once a full lap has been timed.
            </div>
        );
    }

    const r = geometry.scale * 0.012;
    return (
        <svg viewBox={geometry.viewBox} className="aspect-[4/3] w-full rounded-xl border border-white/10 bg-zinc-900/60"
             role="img" aria-label="Track map with car positions">
            <path d={geometry.path} fill="none" stroke="#3F3F46" strokeWidth={r * 1.6} strokeLinejoin="round" />
            <path d={geometry.path} fill="none" stroke="#A1A1AA" strokeWidth={r * 0.35} strokeLinejoin="round" />
            {geometry.corners.map(c => (
                <text key={c.number} x={c.x} y={c.y} fontSize={r * 1.3} fill="#52525B" textAnchor="middle"
                      dominantBaseline="middle">{c.number}</text>
            ))}
            {[...cars]
                // Draw the selected car last so it sits on top.
                .sort((a, b) => Number(a.driver_number === selected) - Number(b.driver_number === selected))
                .map(car => {
                    const driver = byNumber.get(car.driver_number);
                    const p = geometry.project(car.x, car.y);
                    const dimmed = selected != null && selected !== car.driver_number;
                    return (
                        <g key={car.driver_number}
                           onClick={() => onSelect(selected === car.driver_number ? null : car.driver_number)}
                           className="cursor-pointer"
                           style={{
                               transform: `translate(${p.x}px, ${p.y}px)`,
                               transition: `transform ${tickMs}ms linear`,
                               opacity: dimmed ? 0.35 : 1,
                           }}>
                            <circle r={r} fill={teamColour(driver?.team_colour)} stroke="#09090B" strokeWidth={r * 0.25} />
                            <text x={r * 1.4} y={r * 0.45} fontSize={r * 1.4} fontWeight={700} fill="#FAFAFA">
                                {driver?.acronym ?? car.driver_number}
                            </text>
                        </g>
                    );
                })}
        </svg>
    );
}
