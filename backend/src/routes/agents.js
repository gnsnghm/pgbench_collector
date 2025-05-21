// backend/src/routes/agents.js
import { Router } from "express";
import { getIO } from "../io.js";

const router = Router();

router.get("/", (req, res) => {
  const io = getIO();
  const list = [];

  for (const [, socket] of io.of("/").sockets) {
    if (socket.data.agentId) {
      list.push({
        id: socket.data.agentId,
      });
    }
  }

  res.json(list); // 例: [ { id:"pgbench112-abcd12", host:"192.168.0.12" } ]
});

export default router;
