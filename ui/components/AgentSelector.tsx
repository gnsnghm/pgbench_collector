/* ui/components/AgentSelector.tsx */
import { useEffect, useState } from "react";

interface Props {
  selected: string[];
  onSelect(ids: string[]): void;
}

export default function AgentSelector({ selected, onSelect }: Props) {
  const [agents, setAgents] = useState<string[]>([]);

  /* 5 秒ごとに一覧を再取得 */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/agents");
      const list: { id: string }[] = await res.json();
      setAgents(list.map((a) => a.id));
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  /* トグル */
  const toggle = (id: string) =>
    selected.includes(id)
      ? onSelect(selected.filter((x) => x !== id))
      : onSelect([...selected, id]);

  return (
    <div className="space-y-1">
      <h2 className="font-semibold">接続中エージェント</h2>
      {agents.map((id) => (
        <label key={id} className="block">
          <input
            type="checkbox"
            checked={selected.includes(id)}
            onChange={() => toggle(id)}
            className="mr-1"
          />
          {id}
        </label>
      ))}
    </div>
  );
}
