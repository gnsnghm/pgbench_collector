import { useState, useEffect } from "react";
import AgentSelector from "../components/AgentSelector";
import RunningList from "../components/RunningList";

type JobMap = Record<string, string>; // { agentId: jobId }

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [clients, setClients] = useState(10);
  const [time, setTime] = useState(60);
  const [running, setRunning] = useState<JobMap>({});
  const [runIdInput, setRunIdInput] = useState("");

  /* Running */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/running");
      const items: { id: string; job_id: string }[] = await res.json();
      const map: JobMap = {};
      items.forEach((x) => (map[x.id] = x.job_id));
      setRunning(map);
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  /* Run */
  async function handleRun() {
    const res = await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentIds: selected,
        clients,
        time,
        runId: runIdInput.trim() || undefined,
      }),
    });
    const { jobs } = await res.json(); // {agentId: jobId}
    setRunning((prev) => ({ ...prev, ...jobs }));
    setRunIdInput("");
  }

  /* Stop */
  async function handleStop(agentId: string) {
    await fetch("/api/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, jobId: running[agentId] }),
    });
    setRunning((prev) => {
      const cp = { ...prev };
      delete cp[agentId];
      return cp;
    });
  }

  /* --- JSX --- */
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-xl font-bold">pgbench Collector</h1>

      <AgentSelector selected={selected} onSelect={setSelected} />

      <label className="block">
        run id&nbsp;
        <input
          type="text"
          className="border px-1 rounded w-52"
          placeholder="任意ラベル (空 = 自動)"
          value={runIdInput}
          onChange={(e) => setRunIdInput(e.target.value)}
        />
      </label>

      <div className="space-x-4">
        <label>
          clients
          <input
            type="number"
            value={clients}
            onChange={(e) => setClients(Number(e.target.value))}
            className="ml-1 w-20"
          />
        </label>
        <label>
          time(sec)
          <input
            type="number"
            value={time}
            onChange={(e) => setTime(Number(e.target.value))}
            className="ml-1 w-20"
          />
        </label>
        <button
          onClick={handleRun}
          disabled={!selected.length}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Run pgbench
        </button>
      </div>

      {/* ★ 実行中ジョブ一覧 */}
      <RunningList running={running} onStop={handleStop} />
    </main>
  );
}
