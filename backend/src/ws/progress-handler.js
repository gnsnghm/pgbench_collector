// backend/src/ws/progres-handler.js
import { getIO } from "../io.js";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.PG_URL || "postgres://postgres:postgres@postgres:5432/lab",
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS bench_progress (
    agent_id   text,
    job_id     uuid,
    tps        numeric,
    latency_ms numeric,
    ts         timestamptz default now(),
    run_id     text
  );
  
    ALTER TABLE bench_progress
    ADD COLUMN IF NOT EXISTS agent_id   text,
    ADD COLUMN IF NOT EXISTS job_id     uuid,
    ADD COLUMN IF NOT EXISTS tps        numeric,
    ADD COLUMN IF NOT EXISTS latency_ms numeric,
    ADD COLUMN IF NOT EXISTS ts         timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS run_id     text;
  `);

console.log("bench_progress table ready");

const io = getIO();
io.on("connection", (socket) => {
  socket.on("progress", async (row) => {
    try {
      await pool.query(
        `INSERT INTO bench_progress(agent_id, job_id, tps, latency_ms, run_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.agentId, row.jobId, row.tps, row.latency_ms, row.runId]
      );
    } catch (e) {
      console.error("progress insert error:", e);
    }
  });
});
