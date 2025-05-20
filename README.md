# pgbench‑collector

**pgbench‑collector** は、複数エージェントから `pgbench` のメトリクスを収集し、TimescaleDB(PostgreSQL) へ蓄積して Grafana で可視化するサンプル構成です。

```
┌─────────┐      WebSocket      ┌──────────┐  INSERT   ┌────────────┐
│ agent   │───►  backend  ─────►│ Postgres │──────────►│ Grafana UI │
└─────────┘   (BullMQ queue)    │+Timescale│           └────────────┘
                                └──────────┘
```

- **backend** : Node.js / Express / ws / BullMQ
- **agent** : Python 3. 11 or 12, `pgbench` ラッパー
- **ui** : Next.js 15 (開発用ポート **3000**)
- **grafana** : Grafana OSS 10 (公開ポート **3001**)
- **postgres**: PostgreSQL 16 + TimescaleDB 拡張 (ポート **5432**)

---

## 1. 前提

| 要件            | バージョン例                                                            |
| --------------- | ----------------------------------------------------------------------- |
| Docker          | 20.10+                                                                  |
| Docker Compose  | v2+                                                                     |
| Git             | 任意                                                                    |
| VM エージェント | PostgreSQL **15 以上** がインストール済み (`pgbench -P 1` が使えること) |

---

## 2. クローン

```bash
git clone https://github.com/your-name/pgbench-collector.git
cd pgbench-collector
```

---

## 3. `.env` を用意

ルートに `.env` を作成して接続文字列を定義します。

```dotenv
# データベース接続文字列 (TimescaleDB 拡張入り)
PG_URL=postgres://postgres:password@postgres:5432/lab
```

> _`POSTGRES_PASSWORD` と `GF_GRAFANA_PASS` はお好みで変更してください。_

---

## 4. init スクリプトで `lab` DB を自動作成

`docker-entrypoint-initdb.d` へ SQL を置いてあるので **手作業で CREATE DATABASE する必要はありません**。

```
init/
└─ 10_create_lab.sql   # lab DB が無ければ作成
```

---

## 5. 起動

```bash
docker compose up -d --build   # 初回はイメージをビルド
```

| サービス     | URL                                            | 備考                         |
| ------------ | ---------------------------------------------- | ---------------------------- |
| UI (Next.js) | [http://localhost:3000](http://localhost:3000) | シナリオ登録フォーム         |
| Backend API  | [http://localhost:4000](http://localhost:4000) | `/api/scenario` など         |
| Grafana      | [http://localhost:3001](http://localhost:3001) | 初期ユーザ **admin / admin** |
| Postgres     | `localhost:5432`                               | `lab` DB が作成済み          |

---

## 6. Grafana 初期設定

1. ブラウザで [http://localhost:3001](http://localhost:3001) にアクセスし `admin / admin` でログイン。
2. **Connections → Data sources → Add data source → PostgreSQL**。
3. **Host** `postgres` / **Database** `lab` / **User** `postgres` / **Password** `password`。
4. **Secure connection** を `disable` (sslmode=disable) に変更し **Save & Test**。
5. 新規 Dashboard → Panel で以下のクエリ例を入力。

```sql
SELECT $__time(ts), avg(tps) AS tps
FROM bench_result
WHERE $__timeFilter(ts)
GROUP BY 1
ORDER BY 1;
```

---

## 6.5. VM 設定

今回は手順が少し煩雑な OpenSUSE の手順を整理する j

```bash
sudo zypper refresh # パッケージマネージャをリフレッシュ
sudo zypper update # アップデート

# postgres インストール
sudo zypper install postgresql16-contrib

# python 3.11 をインストール
sudo zypper install python311
sudo zypper install python311-websockets
```

pgbench 用の DB を作成

```bash
sudo -u postgres createdb bench
```

## 7. エージェントを VM に配置

```bash
scp agent/agent.py vmuser@<VM_IP>:/opt/agent/
ssh vmuser@<VM_IP>
# PostgreSQL クライアントと pgbench が入っていることを確認
python3 -m pip install websockets

# systemd ユニット
sudo tee /etc/systemd/system/agent.service <<'EOF'
[Unit]
Description=pgbench agent
After=network-online.target

[Service]
User=vmuser
Environment=WS_URL=ws://<HOST_IP>:4000/agent
Environment=AGENT_ID=$(hostname)
ExecStart=/usr/bin/python3 -u /opt/agent/agent.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload && sudo systemctl enable --now agent
```

複数 VM に同じ手順を行えば、バックエンドが自動で WebSocket を受理しメトリクスを収集します。

---

## 8. シナリオ投入 API

```bash
curl -X POST http://localhost:4000/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{
        "pattern":"steady",
        "params":{"clients":10,"time":60},
        "host":"$(hostname)"        # もしくは "targetTag":"all"
      }'
```

`{"queued":1}` が返れば Redis キューに投入済み。Grafana のグラフに TPS がリアルタイムで表示されます。

---

## 9. クリーンアップ

```bash
docker compose down -v   # ボリュームも削除
```

---

## 10. よくあるトラブルシュート

| 症状                                   | 原因                                   | 対処                                                                                 |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `error: database "lab" does not exist` | ボリューム再生成時に init SQL が無効化 | `docker compose down -v` → up -d で init 再適用 or `.env` で PG_URL を既定 DB に変更 |
| `pq: SSL is not enabled`               | Grafana が TLS 必須で接続              | Data source → **Secure connection = disable**                                        |
| progress 行がパースされない            | pgbench < 15 or STDERR 読み漏れ        | agent.py を `-P 1` + `stderr=STDOUT` へ修正                                          |

---

Happy benchmarking! 🎉
