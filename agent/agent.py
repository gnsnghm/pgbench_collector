import asyncio
import json
import os
import subprocess
import websockets
import uuid

WS_URL = os.getenv('WS_URL', 'ws://192.168.100.7:4000')
ID = os.getenv('AGENT_ID', uuid.uuid4().hex)


async def run_pgbench(cmd):
    proc = await asyncio.create_subprocess_shell(cmd, stdout=subprocess.PIPE, text=True)
    async for line in proc.stdout:
        if line.startswith('progress'):
            yield json.loads(line[8:])
    await proc.wait()


async def main():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({'hello': ID}))
        while True:
            cfg = json.loads(await ws.recv())
            cmd = f"pgbench -h 127.0.0.1 -c {cfg['clients']} -T {cfg['time']} --json"
            async for row in run_pgbench(cmd):
                row['host'] = ID
                await ws.send(json.dumps(row))

asyncio.run(main())
