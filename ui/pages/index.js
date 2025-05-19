import { useState } from "react";

export default function Home() {
  const [queued, setQueued] = useState(0);
  const submitScenario = async () => {
    const res = await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pattern: "steady",
        params: { clients: 50, time: 60 },
        targetTag: "all",
      }),
    });
    const json = await res.json();
    setQueued(json.queued);
  };
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-2">pgbench シナリオ登録</h1>
      <button
        onClick={submitScenario}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        実行
      </button>
      <p className="mt-4">キュー投入数: {queued}</p>
    </main>
  );
}
