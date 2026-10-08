import { Suspense } from "react";
import TrackMap from "@/components/f1/TrackMap";

export default function TrackMapPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TrackMap />
        </Suspense>
    );
}
