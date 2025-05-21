// ui/components/AgentSelector.tsx
import { useState, useEffect } from "react";

type Props = {
  onSelect: (ids: string[]) => void;
  selected: string[];
};

export default function AgentSelector({ onSelect, selected }: Props) {
  const [agents, setAgents] = useState<{ id: string; host?: string }[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents)
      .catch(console.error);
  }, []);

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onSelect(next);
  };

  return (
    <>
      <h3>接続中エージェント ({agents.length})</h3>
      {agents.map((a) => (
        <label key={a.id} style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={selected.includes(a.id)}
            onChange={() => toggle(a.id)}
          />
          {a.id}
        </label>
      ))}
    </>
  );
}
