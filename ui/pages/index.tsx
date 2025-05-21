// ui/pages/index.tsx
import { useState, FormEvent } from "react";
import AgentSelector from "../components/AgentSelector";

export default function Home() {
  // AgentSelector から返してもらう ID 配列
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // フォーム入力
  const [clients, setClients] = useState(10);
  const [time, setTime] = useState(60);

  async function submit(e: FormEvent) {
    e.preventDefault();

    // agentIds が空なら何もしない
    if (selectedIds.length === 0)
      return alert("エージェントを選択してください");

    await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentIds: selectedIds,
        clients: Number(clients),
        time: Number(time),
      }),
    });

    alert("queued!");
  }

  return (
    <form onSubmit={submit} style={{ padding: 32 }}>
      {/* --- エージェント一覧 --- */}
      <AgentSelector onSelect={setSelectedIds} selected={selectedIds} />

      {/* --- パラメータ入力 --- */}
      <div>
        <label>
          clients:
          <input
            type="number"
            value={clients}
            min={1}
            onChange={(e) => setClients(Number(e.target.value))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>
      <div>
        <label>
          time(sec):
          <input
            type="number"
            value={time}
            min={1}
            onChange={(e) => setTime(Number(e.target.value))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>

      <button type="submit" disabled={selectedIds.length === 0}>
        Run pgbench
      </button>
    </form>
  );
}
