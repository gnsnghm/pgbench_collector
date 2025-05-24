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
    created_at timestamptz DEFAULT now(),
    ts         timestamptz DEFAULT now()
  );
`);
console.log("bench_result table ready");
// ------------------------------------------------------

const io = getIO();

io.on("connection", (socket) => {
  socket.on("result", async (row) => {
    try {
      await pool.query(
        `UPDATE bench_result
         SET returncode=$3, output=$4, created_at=now()
       WHERE agent_id=$1 AND job_id=$2`,
        [row.agentId, row.jobId, row.returncode, row.output]
      );
      console.log(`inserted result job=${row.jobId}`);
    } catch (err) {
      console.error("insert error:", err);
    }
  });
});
