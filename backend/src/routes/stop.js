import { Router } from "express";
import { getIO } from "../io.js";

const router = Router();

router.post("/", (req, res) => {
  const { agentId, jobId } = req.body;
  console.log("[/api/stop request", { agentId, jobId });

  if (!agentId || !jobId) return res.status(400).json({ error: "bad request" });

  const io = getIO();
  let deliverd = false;

  for (const [, sock] of io.of("/").sockets) {
    if (sock.data.agentId === agentId) {
      sock.emit("cancel", { jobId });
      deliverd = true;
      break;
    }
  }
  console.log("[/api/stop] deliverd = ", deliverd);
  res.json({ sent: true });
});

export default router;
