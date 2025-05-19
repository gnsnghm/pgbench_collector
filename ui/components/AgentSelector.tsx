// ui/components/AgentSelector.tsx
import React, { useEffect, useState } from "react";

/**
 * Props accepted by <AgentSelector />
 * - **onSelect** (optional): コールバックで、選択された agentId を返す。
 */
export type AgentSelectorProps = {
  onSelect?: (agentId: string) => void;
};

/**
 * エージェント一覧をセレクトボックスで選択させるシンプルな UI。
 * 選択が変わるたびに `onSelect` が呼ばれる。
 */
const AgentSelector: React.FC<AgentSelectorProps> = ({ onSelect }) => {
  const [agents, setAgents] = useState<string[]>([]);
  const [sel, setSel] = useState("");

  // TODO: 本来は /api/agents などから fetch する
  useEffect(() => {
    setAgents(["pgbench112", "vm-002"]);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSel(value);
    onSelect?.(value);
  };

  return (
    <select value={sel} onChange={handleChange} className="border p-1 rounded">
      <option value="" disabled>
        Select agent
      </option>
      {agents.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
};

export default AgentSelector;
export { AgentSelector };
