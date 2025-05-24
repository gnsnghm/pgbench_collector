#!/usr/bin/env python3
"""
agent.py – pgbench エージェント（Socket.IO 版 + progress 送信）

* run イベントを受けたら
    pgbench -c <clients> -T <time> -P 1 <db>
  を実行。
* pgbench の '-P 1' で 1 秒おきに出る
    progress: 5.0 s, 750.0 tps, lat 1.33 ms stddev 0.10
  をパースして progress イベントで送る。
* 終了後に stdout / returncode をまとめて result イベント。
"""

import asyncio
import logging
import os
import re
import signal
import socket
import uuid

import socketio

# ── グローバル変数 ──────────────────────────────────────────────
current_job = None

# ── 環境変数 ──────────────────────────────────────────────
WS_URL = os.getenv("WS_URL", "http://localhost:4000")
WS_PATH = os.getenv("WS_PATH", "/ws")
AGENT_ID = os.getenv(
    "AGENT_ID") or f"{socket.gethostname()}-{uuid.uuid4().hex[:6]}"
PGBENCH_BIN = os.getenv("PGBENCH_BIN", "pgbench")
PGBENCH_DB = os.getenv("PGBENCH_DB", "bench")
PROG_INTVAL = int(os.getenv("PGBENCH_P", "1"))      # -P の秒数

# ── ログ ────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")

# ── Socket.IO クライアント ─────────────────────────────
sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=5)

# ── 接続イベント ───────────────────────────────────────


@sio.event
async def connect():
    logging.info("connected → hello(%s)", AGENT_ID)
    await sio.emit("hello", AGENT_ID)


@sio.event
async def disconnect():
    logging.warning("disconnected")

# ── run イベント ───────────────────────────────────────


@sio.on("run")
async def on_run(data):
    try:
        clients = int(data["clients"])
        duration = int(data["time"])
        job_id = data.get("jobId") or str(uuid.uuid4())
    except (KeyError, ValueError):
        return logging.error("invalid run payload: %s", data)

    logging.info("job=%s start  c=%s T=%s", job_id, clients, duration)

    cmd = [
        PGBENCH_BIN,
        "-c", str(clients),
        "-T", str(duration),
        "-P", str(PROG_INTVAL),
        PGBENCH_DB,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    global current_job
    current_job = (job_id, proc)

    stdout_lines = []
    async for raw in proc.stdout:
        line = raw.decode().strip()
        stdout_lines.append(line)

        if line.startswith("progress:"):
            # progress: 1.0 s, 679.5 tps, lat 1.47 ms ...
            parts = line.split(",")
            try:
                tps = float(parts[1].strip().split()[0])      # 679.5
                lat = float(parts[2].strip().split()[1])      # 1.47
            except (IndexError, ValueError):
                logging.warning("progress parse failed: %s", line)
                return
            await sio.emit("progress", {
                "agentId":  AGENT_ID,
                "jobId":    job_id,
                "tps":      tps,
                "latency_ms": lat,
            })

    await proc.wait()

    await sio.emit("result", {
        "agentId":    AGENT_ID,
        "jobId":      job_id,
        "returncode": proc.returncode,
        "stdout":     "\n".join(stdout_lines),
    })
    logging.info("job=%s end code=%s", job_id, proc.returncode)


async def graceful_shutdown(stop_event):
    """SIGTERM/SIGINT を受けたら実行される"""
    stop_event.set()
    if sio.connected:
        try:
            await sio.disconnect()
        except Exception as e:
            logging.warning("disconnect error: %s", e)

# ── cancel イベント ───────────────────────────────────────


@sio.on("cancel")
async def on_cancel(msg):
    job_id = msg.get("jobId")
    global current_job
    if current_job and current_job[0] == job_id:
        proc = current_job[1]
        if proc.returncode is None:
            proc.terminate()               # SIGTERM
            await proc.wait()
            logging.info("job %s cancelled", job_id)
            await sio.emit("result", {
                "agentId": AGENT_ID,
                "jobId":   job_id,
                "returncode": -15,         # 独自コード (SIGTERM)
                "stdout":  "cancelled by user"
            })
    current_job = None

# ── メインループ ──────────────────────────────────────


async def main():
    loop = asyncio.get_running_loop()
    stop = asyncio.Event()

    # ★ シグナルハンドラを登録
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(
            sig,
            lambda s=sig: asyncio.create_task(graceful_shutdown(stop))
        )

    # 接続＆再接続ループ
    while not stop.is_set():
        try:
            await sio.connect(WS_URL, socketio_path=WS_PATH)
            await sio.wait()           # 切断されるまでブロック
        except (socketio.exceptions.ConnectionError, OSError) as exc:
            logging.error("connect error: %s – retry in 5s", exc)
            await asyncio.sleep(5)

    # ここに来たら stop.is_set() == True
    logging.info("agent shutdown complete")

if __name__ == "__main__":
    asyncio.run(main())
