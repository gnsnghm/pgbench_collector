import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { agentRegistry } from "./ws-registry.js"; // ←後述

// キューを消費して WebSocket で agent へ送信
export const worker = new Worker(
  "pgbench.run",
  async (job) => {
    const { host, ...cfg } = job.data;
    const socket = agentRegistry.get(host);
    if (!socket) {
      throw new Error(`agent ${host} not connected`);
    }
    socket.send(JSON.stringify(cfg));
    console.log(`Job ${job.id} sent to agent ${host}`);
    return true;
  },
  { connection }
);
