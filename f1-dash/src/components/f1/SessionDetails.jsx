export default function SessionDetails({ params }) {
    const { year, round, session } = params;

    return (
        <div>
            <h1>Session Details</h1>

            <p>Year: {year}</p>
            <p>Round: {round}</p>
            <p>Session: {session}</p>
        </div>
    );
}