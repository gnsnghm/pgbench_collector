import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
} from "@mui/material";
import AgentSelector from "../components/AgentSelector";
import RunningList from "../components/RunningList";

type JobMap = Record<string, string>;

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [clients, setClients] = useState(10);
  const [time, setTime] = useState(60);
  const [runIdInput, setRunIdInput] = useState("");
  const [running, setRunning] = useState<JobMap>({});

  /* 5秒ごとに /api/running を取得 */
  useEffect(() => {
    let mounted = true;
    async function load() {
      const res = await fetch("/api/running");
      const items: { id: string; job_id: string }[] = await res.json();
      if (!mounted) return;
      const map: JobMap = {};
      items.forEach((x) => (map[x.id] = x.job_id));
      setRunning(map);
    }
    load();
    const iv = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  /* Run ボタン */
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
    const { jobs }: { jobs: JobMap } = await res.json();
    setRunning((prev) => ({ ...prev, ...jobs }));
    setRunIdInput("");
  }

  /* Stop ボタン */
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

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
      <Typography variant="h4" gutterBottom>
        pgbench Collector
      </Typography>

      <Grid container spacing={4}>
        {/* 左カラム：コントロールパネル */}
        <Grid item component="div" xs={12} md={4}>
          <Card>
            <CardContent>
              <AgentSelector selected={selected} onSelect={setSelected} />

              <TextField
                label="Run ID"
                placeholder="任意ラベル (空 = 自動)"
                value={runIdInput}
                onChange={(e) => setRunIdInput(e.target.value)}
                fullWidth
                margin="normal"
              />

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <TextField
                  label="Clients"
                  type="number"
                  value={clients}
                  onChange={(e) => setClients(Number(e.target.value))}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Duration (sec)"
                  type="number"
                  value={time}
                  onChange={(e) => setTime(Number(e.target.value))}
                  fullWidth
                  size="small"
                />
              </Box>

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleRun}
                disabled={!selected.length}
              >
                Run pgbench
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 右カラム：実行中ジョブ一覧 */}
        <Grid item component="div" xs={12} md={8}>
          <RunningList running={running} onStop={handleStop} />
        </Grid>
      </Grid>
    </Container>
  );
}
