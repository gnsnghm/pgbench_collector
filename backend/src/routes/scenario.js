import { Router } from "express";
import { getIO } from "../io.js";
import queue from "../queues/pgbench.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { agentIds, clients, time } = req.body;

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
    agentIds.forEach((id) => {
      for (const [, sock] of io.of("/").sockets) {
        if (sock.data.agentId === id) {
          sock.emit("run", { clients, time });
          break;
        }
      }
    });

    // ── BullMQ にジョブ登録（任意）─────────
    await queue.addBulk(
      agentIds.map((id) => ({
        name: `run-${id}-${Date.now()}`,
        data: { id, clients, time },
      }))
    );

    // ── ★ レスポンスはここで 1 回だけ ─────
    return res.status(202).json({
      queued: true,
      targets: agentIds.length,
    });
  } catch (err) {
    return next(err); // エラーハンドラへ
  }
});

export default router;
