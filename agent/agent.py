import asyncio
import json
import os
import subprocess
import websockets
import uuid

WS_URL = os.getenv('WS_URL', 'ws://192.168.101.122:4000/api/agents')
ID = os.getenv('AGENT_ID', uuid.uuid4().hex)


async def run_pgbench(cmd):
    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    async for line_b in proc.stdout:
        line = line_b.decode().strip()

        if line.startswith("progress:"):
            parts = line.split(",")
            tps = float(parts[1].strip().split()[0])   # 750.0
            latency = float(parts[2].strip().split()[1])  # 1.33
            print(f"tps:{tps}, latency:{latency}")
            yield {"tps": tps, "latency_ms": latency}

    await proc.wait()


async def main():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({'hello': ID}))
        while True:
            cfg = json.loads(await ws.recv())
            # cmd = f"pgbench -h 127.0.0.1 -c {cfg['clients']} -T {cfg['time']} --json"
            # cmd = f"pgbench -c {cfg['clients']} -T {cfg['time']} --json"
            cmd = f"pgbench -c {cfg['clients']} -T {cfg['time']} -P 1 bench"
            async for row in run_pgbench(cmd):
                row["host"] = ID
                await ws.send(json.dumps(row))

asyncio.run(main())
