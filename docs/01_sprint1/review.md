# スプリント1 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: クローン直後から手順どおりで、Docker Compose 上の FastAPI が起動して
  `/docs` が見え、pytest と CI が最小構成で回る
- PR: [#1 スプリント1: 環境構築](https://github.com/morisaki-yuichi/todo-app-example3/pull/1)

## 動くものの確認結果

| 確認項目 | コマンド / 手順 | 結果 |
|---|---|---|
| API 起動（Docker） | `cp .env.example .env && docker compose up -d --build` → `curl -s -w " [%{http_code}]" http://localhost:8002/health` | `{"status":"ok"} [200]` ✅ |
| ポートマッピング | `docker compose ps` | `8002->8000`（api）、`5433->5432`（db）✅ |
| Postgres 起動 | `docker compose exec db pg_isready -U todo` | `accepting connections` ✅ |
| OpenAPI 自動生成 | `/docs` と `/openapi.json` を取得 | Swagger UI 表示・スキーマに `/health` が型つきで出力 ✅ |
| 自動テスト | `uv run pytest`（backend/） | 1 passed・警告なし ✅ |
| CI | PR #1 の `backend-test` ジョブ | 緑（マージ前に確認）✅ |

## 実験

### 実験①: compose の `ports:` を外すとどうなるか

- **予想（実行前に記録）**: コンテナ内の uvicorn は無傷で動き続けるが、ホストからの
  `curl http://localhost:8002/health` は HTTP エラー以前に TCP 接続が拒否される
  （`%{http_code}` は `000`、curl の終了コードは 7）。コンテナ内から
  `localhost:8000` を叩けば 200 が返るはず
- **実際**:
  - ホストから: `[000] (curl exit: 7)` — connection refused
  - `docker compose ps`: api は `Up`、ただし PORTS 欄が空
  - コンテナ内から: `200 {"status":"ok"}`
- **予想との差分**: なし（予想どおり）
- **学び**: アプリのログには何のエラーも出ない。「アプリは健康なのに届かない」ときは、
  **1段外側（コンテナ / ネットワーク / ポートマッピング）を疑う**。
  `docker compose ps` の PORTS 欄は、その切り分けの最初の観察ポイントになる

## トラブル記録

### starlette の非推奨警告: `httpx` → `httpx2`

- **症状**: `uv add --dev pytest httpx` の後、`uv run pytest` は 1 passed だが
  `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
  install httpx2 instead.` という警告が出た
- **調査**: 警告メッセージの1行目をそのまま読む（調査の型どおり）。starlette が
  TestClient の内部 HTTP クライアントとして後継の `httpx2` を推奨していると分かる
- **解決**: `uv remove --dev httpx && uv add --dev httpx2` → 1 passed・警告消滅
- **学び**: 警告は「将来壊れる予告」。出た時点で対処する方針とし、教材にも
  「非推奨警告を放置しない」を残す。トレースガイドは最初から `httpx2` を
  入れる手順にし、経緯はこの記録に残す

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテストが揃いローカルで全テスト緑 | ✅（正常系のみ。異常系のあるエンドポイントは未実装のため対象外） |
| CI 緑でマージ | ✅ PR #1 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough / concepts / 本記録 |
| クローン直後の再現性 | ✅ README のクイックスタート手順で確認 |

**判定: スプリントゴール達成。PBI-01 / PBI-02 完了。**

## マージ後の main での動作確認（マージ作業の一部）

2026-07-05、マージコミット `37b15fe` を pull した main 上で実施:

- `docker compose up -d --build` → `curl -s -w " [%{http_code}]" http://localhost:8002/health`
  → `{"status":"ok"} [200]` ✅
- `uv run pytest` → `1 passed` ✅

（この節はマージ後に追記した。レビュー記録のうちマージに依存する項目は、
マージ作業の完了をもって確定とする運用）
