"use client";

import PodiumBlocks from "./PodiumBlocks";
import OtherPositions from "./OtherPositions";

export default function Positions({
    results = []
}) {
    return (
        <div>

            <PodiumBlocks results={results} />
            <OtherPositions results={results} />

        </div>
    );
}