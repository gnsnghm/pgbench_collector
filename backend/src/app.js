// backend/src/app.js
import express from "express";
import http from "http";
import { initIO } from "./io.js";
import scenarioRouter from "./routes/scenario.js";
import agentRouter from "./routes/agents.js";

const app = express();
const httpServer = http.createServer(app);

// Socket.IO を初期化
initIO(httpServer);

await import("./ws/agent-handler.js");
await import("./ws/result-handler.js");
await import("./ws/progress-handler.js");

app.use(express.json());
app.use("/api/scenario", scenarioRouter);
app.use("/api/agents", agentRouter);

// ★ これを必ず追加 ―――――――――――――――――――――――――――
export { app, httpServer };
// ―――――――――――――――――――――――――――――――――――――――――
