import { Router } from "express";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { getIO } from "../io.js";
import queue from "../queues/pgbench.js";
import dayjs from "dayjs";

const pgPool = new pg.Pool({ connectionString: process.env.PG_URL });
const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { agentIds, clients, time, runId } = req.body;
    const run_id = runId?.trim() || `run_${dayjs().format("YYYYMMDD_HHmmss")}`;

    // ── バリデーション ──────────────────────
    if (
      !Array.isArray(agentIds) ||
      !Number.isInteger(clients) ||
      clients <= 0 ||
      !Number.isInteger(time) ||
      time <= 0
    ) {
      return res.status(400).json({ error: "bad request" });
    }

    // ── エージェントへ run イベント送信 ────
    const io = getIO();
    const jobs = {};

    for (const id of agentIds) {
      const jobId = randomUUID();
      jobs[id] = jobId;

      // bench_result へ仮行を INSERT
      await pgPool.query(
        `INSERT INTO bench_result(agent_id, job_id, run_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [id, jobId, run_id]
      );

      // Socket.IO へ
      for (const [, sock] of io.of("/").sockets) {
        if (sock.data.agentId === id) {
          sock.emit("run", { jobId, runId: run_id, clients, time });
          break;
        }
      }

      // BullMQ へ
      await queue.add(
        `run-${id}-${Date.now()}`, // job name
        { id, jobId, clients, time }
      );
    }

    // ── ★ レスポンスはここで 1 回だけ ─────
    return res.status(202).json({
      queued: true,
      runId: run_id,
      jobs,
    });
  } catch (err) {
    return next(err); // エラーハンドラへ
  }
});

export default router;
