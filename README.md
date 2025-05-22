# pgbench_collector（日本語版）

PostgreSQL に負荷を掛けてベンチマーク結果を TimescaleDB に蓄積し、Grafana で可視化する軽量フレームワークです。

- **コントロールプレーン**（Docker Compose スタック）

  - Express + Socket.IO バックエンド
  - TimescaleDB / Redis / Grafana / Prometheus
  - Next.js 製フロントエンド（UI）

- **エージェント**

  - Python 3 + pgbench
  - Socket.IO でリアルタイムに TPS／レイテンシを送信
  - systemd サービスとして常駐

---

## 0. 全体構成

```mermaid
graph TD
  subgraph Control-Plane
    UI[UI / Next.js]
    API[backend / Socket.IO]
    DB[(TimescaleDB)]
    Grafana[Grafana]
    UI -- REST+WebSocket --> API
    API -- INSERT progress/result --> DB
    Grafana -- SELECT --> DB
  end
  Agent[pgbench Agents] -- WebSocket --> API
```

---

## 1. 前提条件

| 役割                     | 必要環境                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **コントロールプレーン** | Docker 20+, Docker Compose v2 以上, ポート 3000/3001/4000 を使用                                                                                                    |
| **エージェント**         | Python ≥ 3.8<br>`pgbench` (postgresql-contrib パッケージ)<br>ポート 4000 へアウトバウンド通信可能<br>Openssh インストール済<br>ssh ログインユーザが `sudo` 利用可能 |

---

## 2. コントロールプレーンの起動

```bash
# リポジトリ取得
$ git clone https://github.com/gnsnghm/pgbench_collector
$ cd pgbench_collector

# 環境変数設定
$ cp .env.sample .env       # PG_URL / POSTGRES_PASSWORD / GF_GRAFANA_PASS を編集

# ビルド & 起動
$ docker compose build
$ docker compose up -d

# 動作確認
UI       : http://localhost:3000
Grafana  : http://localhost:3001 (admin / $GF_GRAFANA_PASS)
```

**proxy が必要な環境でコンテナを起動する場合、 `docker-compose-proxy.ymd` をリネームしてお使いください**

```bash
$ mv docker-compose.yml dokcer-compose-org.yml
$ mv docker-compose-proxy.yml docker-compose.yml
```

`init/00_create_lab.sh` が自動で `lab` データベースと TimescaleDB 拡張を作成します。  
postgres の init スクリプトがどうしても起動しない場合、`docker compose exec postgres psql -U postgres -c "CREATE DATABASE lab` を実行して lab を作成してください。

.env sample

```env
PG_URL=postgres://postgres:secret@postgres:5432/postgres?sslmode=disable
POSTGRES_PASSWORD=secret
GF_GRAFANA_PASS=admin
```

proxy を利用している場合、以下の環境変数も追加するようにしてください。

```env
HTTP_PROXY=http://<YOUR-PROXY-FQDN>:8080
HTTPS_PROXY=http://<YOUR-PROXY-FQDN>:8080
NO_PROXY=localhost,127.0.0.1
```

---

## 3. エージェントの配布・起動

### 3.1 wheel ビルド（開発 PC）

```bash
$ pip wheel ./agent -w dist
```

### 3.2 エージェントホストでのインストール

proxy が必要な場合は適宜対応してください

```bash
# 事前インストール(今回は OpenSUSE の例)
$ ssh agent sudo zypper refresh
$ ssh agent sudo zypper update
$ ssh agent sudo zypper install postgresql17-contrib
$ ssh agent sudo zypper install python3x
# コピー & 展開
$ scp dist/pgbench_agent-*.whl user@agent:/tmp/
$ ssh agent sudo mkdir -p /opt/pgbench-agent
$ ssh agent sudo pip install /tmp/pgbench_agent-*.whl --target /opt/pgbench-agent

# もしインストールした python のバスが通らない場合、以下のように対応する
$ ssh agent sudo python3.x -m pip install /tmp/pgbench_agent-*.whl --target /opt/pgbench-agent

# systemd ユニット
# もし上部で python のパスが通らなかった場合、 ExecStart の python のパスを変更すること
# 例：python3x をインストールした場合、 /usr/bin/python3.x
$ ssh agent 'sudo tee /etc/systemd/system/pgbench-agent.service > /dev/null <<"EOF"
[Unit]
Description=pgbench agent
After=network-online.target
[Service]
User=postgres
ExecStart=/usr/bin/python3 -u /opt/pgbench-agent/agent.py
Environment=AGENT_ID=%H
Restart=always
StandardOutput=journal
[Install]
WantedBy=multi-user.target
EOF'
```

### 3.3 接続先 URL の設定

接続先の URL を設定する場合、様々な方法がありますが、今回は 2 種類紹介します。

a. `/etc/pgbench-agent.conf` を作成してそこに WS_URL を記載する

この場合、全てサーバ側からの命令で対応できるので楽です。

```bash
# 接続先 URL を設定
$ ssh agent 'echo WS_URL=http://CONTROL_IP:4000 > /etc/pgbench-agent.conf'
$ ssh agent 'sudo systemctl daemon-reload && sudo systemctl enable --now pgbench-agent'
```

b. `systemctl edit` を使って環境変数を追加する

場合によってはエージェントにログインして対応する必要があります。

```bash
# エージェント側にログインしている想定
# systemctl edit を起動 nano の場合、 ctrl+O -> Enter -> ctrl+x で保存して終了
# 編集内容下記参照
$ sudo systemctl edit pgbench-agent
# 編集後、reload して再起動
$ sudo systemctl daemon-reload && sudo systemctl start pgbench-agent
```

`### Edits below this comment will be discarded` よりも上に書かないと反映されないことに注意してください。

```text
[Service]
Environment="WS_URL=http://<CONTROL_IP>:4000"
```

---

## 4. UI の使い方

1. ブラウザで **http\://[control-plane]:3000** を開く。
2. 「接続中エージェント」にチェックボックスで一覧表示。
3. `clients` / `time(sec)` を入力して **Run pgbench** を押す。
4. Grafana ダッシュボード「Bench › TPS/live」でリアルタイムの TPS/レイテンシが確認可能。

---

## 5. データベーススキーマ

```sql
-- 進捗 (1 秒ごと)
CREATE TABLE bench_progress (
  agent_id   text,
  job_id     uuid,
  tps        numeric,
  latency_ms numeric,
  ts         timestamptz DEFAULT now()
);

-- 実行結果 (ジョブ単位)
CREATE TABLE bench_result (
  agent_id   text,
  job_id     uuid,
  returncode int,
  output     text,
  created_at timestamptz DEFAULT now()
);
```

TimescaleDB が有効な場合は両テーブルとも自動でハイパーテーブル化されます。

---

## 6. Grafana 用サンプルクエリ

### TPS (1 秒バケット)

```sql
SELECT time_bucket('1s', ts) AS time, agent_id, avg(tps) AS avg_tps
FROM bench_progress
WHERE $__timeFilter(ts)
GROUP BY 1, agent_id
ORDER BY 1;
```

### レイテンシ P95 (5 秒バケット)

```sql
SELECT time_bucket('5s', ts) AS time,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
FROM bench_progress
WHERE $__timeFilter(ts)
GROUP BY 1
ORDER BY 1;
```

---

## 7. トラブルシューティング

| 症状                            | 対処                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `database "lab" does not exist` | Postgres 再起動 (`docker compose restart postgres`) で init スクリプトを再実行 |
| Agent が無限再起動              | `WS_URL`／`WS_PATH` が正しいか確認 (`/ws`)                                     |
| backend `ERR_HTTP_HEADERS_SENT` | `res.json()` を 1 回だけ呼ぶ                                                   |
| Grafana SQL の `$agent` エラー  | ダッシュボード変数 `agent` を作成                                              |
| `pgbench-agent`が起動しない     | python のバージョンを確認(3.8>=)                                               |

---

## 8. 既知のバグ

- bench_result には現状 tps および latency_ms が入りません。(実装していないため)
