// backend/src/server.js
const { app, httpServer } = require("./app");
require("./ws/agent-handler"); // 上で作ったハンドラを読み込む
app.use("/api/scenario", require("./routes/scenario"));
httpServer.listen(4000, () => console.log("API listen on :4000"));
