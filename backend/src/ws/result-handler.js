// backend/src/ws/result-handler.js
import { getIO } from "../io.js";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.PG_URL || "postgres://postgres:postgres@postgres:5432/lab",
});

// ----------- スキーマ準備 ----------------------------
await pool.query(`
  CREATE TABLE IF NOT EXISTS bench_result (
    agent_id   text,
    job_id     uuid,
    returncode int,
    output     text,
    created_at timestamptz DEFAULT now()
  );

  -- 既存テーブルに不足列があれば追加
  ALTER TABLE bench_result
    ADD COLUMN IF NOT EXISTS agent_id   text,
    ADD COLUMN IF NOT EXISTS job_id     uuid,
    ADD COLUMN IF NOT EXISTS returncode int,
    ADD COLUMN IF NOT EXISTS output     text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
`);
console.log("bench_result table ready");
// ------------------------------------------------------

const io = getIO();

io.on("connection", (socket) => {
  socket.on("result", async (row) => {
    try {
      await pool.query(
        `INSERT INTO bench_result(agent_id, job_id, returncode, output)
         VALUES ($1,$2,$3,$4)`,
        [row.agentId, row.jobId, row.returncode, row.output]
      );
      console.log(`inserted result job=${row.jobId}`);
    } catch (err) {
      console.error("insert error:", err);
    }
  });
});
