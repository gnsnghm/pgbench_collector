// backend/src/ws/agent-handler.js
import { getIO } from "../io.js"; // ★ io.js から取得
const io = getIO();

io.on("connection", (socket) => {
  // エージェントが最初に 'hello' を emit してくる想定
  socket.on("hello", (agentId) => {
    socket.data.agentId = agentId;
    console.log(`Agent ${agentId} connected`);
  });

  socket.on("disconnect", () => {
    if (socket.data.agentId) {
      console.log(`Agent ${socket.data.agentId} disconnected`);
    }
  });
});
