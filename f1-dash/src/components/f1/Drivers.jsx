"use client";
import {useEffect, useState, useMemo} from "react";

function PodiumBlock({ data, height, label, highlight }) {
  if (!data) return null;

  return (
    <div className="flex flex-col items-center">

      {/* Driver info */}
      <div className="mb-2 text-center text-gray-300">
        <button onClick="" className="text-lg font-bold">
          #{data.driver_number}
        </button>
        <div className="text-xs opacity-70">
          {label}
        </div>
      </div>

      {/* Podium block */}
      <div
        className={`
          w-24 ${height}
          flex items-end justify-center
          rounded-t-lg
          ${highlight ? "bg-yellow-500" : "bg-gray-600"}
        `}
      >
        <span className="mb-2 text-sm font-medium">
          P{data.position}
        </span>
      </div>

      {/* Extra info */}
      <div className="mt-2 text-xs text-gray-400">
        {data.gap_to_leader === 0
          ? "Leader"
          : `+${data.gap_to_leader}s`}
      </div>

    </div>
  );
}
export default function Positions({ results }) {
  const p1 = results.find(r => r.position === 1);
  const p2 = results.find(r => r.position === 2);
  const p3 = results.find(r => r.position === 3);

  return (
    <div className="flex items-end justify-center gap-6 mt-10">

      {/* P2 */}
      <PodiumBlock data={p2} height="h-40" label="2nd" />

      {/* P1 */}
      <PodiumBlock data={p1} height="h-56" label="1st" highlight />

      {/* P3 */}
      <PodiumBlock data={p3} height="h-32" label="3rd" />

    </div>
  );
}