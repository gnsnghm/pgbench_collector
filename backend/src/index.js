// index.js – backend entry
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import scenarioRouter from "./routes/scenario.js";
import { registerAgent, unregisterAgent } from "./ws-registry.js";
import "./worker.js"; // start BullMQ worker
import pg from "pg";
import agentsRouter from "./routes/agents.js";
import { httpServer } from "./app.js";

// -------------------------------------------------
// Postgres 接続
// -------------------------------------------------
const pool = new pg.Pool({ connectionString: process.env.PG_URL });

/** 初期起動時に結果テーブルを作成 */
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bench_result (   -- スペース抜けを修正
      host        text,
      ts          timestamptz NOT NULL DEFAULT now(),
      tps         double precision,
      latency_ms  double precision
    );
    SELECT create_hypertable('bench_result','ts', if_not_exists => TRUE);
  `);
  console.log("bench_result table ready");
})();

// -------------------------------------------------
// HTTP & WebSocket Gateway
// -------------------------------------------------
const app = express();
app.use(express.json());
app.use("/api/scenario", scenarioRouter);
app.use("/api/agents", agentsRouter);

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  // 最初の 1 メッセージで agentId を登録
  socket.once("message", (raw) => {
    try {
      const { hello } = JSON.parse(raw.toString());
      if (!hello) throw new Error("hello field required");
      registerAgent(hello, socket);
      console.log("agent connected", hello);

      // メトリクスを受信して TimescaleDB へ INSERT
      socket.on("message", async (rawRow) => {
        try {
          const row = JSON.parse(rawRow.toString());
          const { tps, latency_ms, host = hello } = row;
          if (tps === undefined) return; // progress 以外は無視
          await pool.query(
            "INSERT INTO bench_result(host,tps,latency_ms) VALUES ($1,$2,$3)",
            [host, tps, latency_ms]
          );
        } catch (e) {
          console.error("metric insert error", e.message);
        }
      });

      socket.on("close", () => {
        unregisterAgent(hello);
        console.log("agent disconnected", hello);
      });
    } catch (err) {
      console.error("invalid hello message", err);
      socket.close();
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`API listening on :${PORT}`));
