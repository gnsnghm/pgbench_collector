import { Router } from "express";
import { queue } from "../queue.js";
const router = Router();

function expandScenario(pattern, params, tag) {
  // pattern に応じてジョブ配列を返すダミー実装
  return [
    { name: "job1", data: { host: "pgbench112", clients: 10, time: 60 } },
  ];
}

router.post("/", async (req, res) => {
  const { pattern, params, targetTag } = req.body;
  const jobs = expandScenario(pattern, params, targetTag);
  await queue.addBulk(jobs);
  res.json({ queued: jobs.length });
});

export default router;
