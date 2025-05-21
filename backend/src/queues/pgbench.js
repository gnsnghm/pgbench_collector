// src/queues/pgbench.js
import { Queue } from "bullmq";
import dotenv from "dotenv";
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const pgbenchQueue = new Queue("pgbench", { connection });
export default pgbenchQueue;
