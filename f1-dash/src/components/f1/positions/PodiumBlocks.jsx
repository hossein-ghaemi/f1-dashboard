import PodiumBlock from "./PodiumBlock";

export default function PodiumBlocks({ results}) {

    const p1 = results.find(
        r => Number(r.Position) === 1
    );

    const p2 = results.find(
        r => Number(r.Position) === 2
    );

    const p3 = results.find(
        r => Number(r.Position) === 3
    );

    return (
        <div className="flex items-end justify-center gap-6 mt-10">

            <PodiumBlock
                data={p2}
                height="h-40"
                label="2nd"
            />

            <PodiumBlock
                data={p1}
                height="h-56"
                label="1st"
                highlight
            />

            <PodiumBlock
                data={p3}
                height="h-32"
                label="3rd"
            />

        </div>
    );
}