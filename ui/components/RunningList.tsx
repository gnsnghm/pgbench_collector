type Props = {
  running: Record<string, string>; // agentId -> jobId
  onStop: (agentId: string) => void;
};

export default function RunningList({ running, onStop }: Props) {
  const ids = Object.keys(running);
  if (!ids.length) return null;

  return (
    <section>
      <h2 className="font-semibold">Running Jobs</h2>
      <ul className="space-y-1">
        {ids.map((id) => (
          <li key={id} className="flex items-center gap-2">
            <span className="font-mono">{id}</span>
            <button
              onClick={() => onStop(id)}
              className="px-2 py-0.5 bg-red-600 text-white rounded"
            >
              Stop
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
