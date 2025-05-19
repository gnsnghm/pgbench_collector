// backend/src/routes/agents.js
import express from "express";
import { agentRegistry } from "../ws-registry.js";

const router = express.Router();

// GET /api/agents   → ["vm-001","vm-002", ...]
router.get("/", (req, res) => {
  res.json([...agentRegistry.keys()]);
});

export default router;
