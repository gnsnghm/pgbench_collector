/* ui/components/AgentSelector.tsx */
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

interface Props {
  selected: string[];
  onSelect(ids: string[]): void;
}

export default function AgentSelector({ selected, onSelect }: Props) {
  const [agents, setAgents] = useState<string[]>([]);

  // 5秒ごとに /api/agents を再取得
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/agents");
        const list: { id: string }[] = await res.json();
        if (!mounted) return;
        setAgents(list.map((a) => a.id));
      } catch (e) {
        console.error("agent fetch error", e);
      }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelect(selected.filter((x) => x !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
      <Typography variant="h6">接続中エージェント</Typography>
      <Divider sx={{ my: 1 }} />
      <FormGroup>
        {agents.map((id) => (
          <FormControlLabel
            key={id}
            control={
              <Checkbox
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
                color="primary"
              />
            }
            label={id}
          />
        ))}
      </FormGroup>
    </Box>
  );
}
