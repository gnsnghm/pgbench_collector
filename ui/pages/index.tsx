// ui/pages/index.tsx
import AgentSelector from "../components/AgentSelector";
import { useState } from "react";

export default function Home() {
  const [host, setHost] = useState("");
  const [clients, setCli] = useState(10);
  const [time, setTime] = useState(60);

  async function submit() {
    const body = { host, clients, time };
    await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <AgentSelector onSelect={setHost} />
      {/* clients/time の入力… */}
      <button type="submit" disabled={!host}>
        Run pgbench
      </button>
    </form>
  );
}
