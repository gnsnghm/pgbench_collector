import { Router } from "express";
import pg from "pg";

const router = Router();
const pool = new pg.Pool({ connectionString: process.env.PG_URL });

/* 進行中ジョブ = returncode が NULL の行 */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT agent_id AS id, job_id FROM bench_result WHERE returncode IS NULL"
    );
    // [{id:'pg112',job_id:'uuid'}, …]
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
