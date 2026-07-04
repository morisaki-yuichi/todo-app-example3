# スプリント1 バックログ — 環境構築

- 期間の目安: 3〜4時間（写経者の学習時間）
- 対応 PBI: PBI-01（開発環境の土台）、PBI-02（テストと CI の最小構成）
- 前スプリントの Try: なし（最初のスプリントのため。S2 以降はレトロの Try をここに書く）

## スプリントゴール

**「リポジトリをクローンした直後から、README の手順どおりで Docker Compose 上の
FastAPI が起動して `/docs` が見え、pytest と CI が最小構成で回る」状態を作る。**

アプリの機能はまだ何も作らない（ヘルスチェックのみ）。このスプリントの主役は
「組み立て式スタックの土台を、再現性を保って組むこと」と、それを支える概念
（コンテナ・ポートマッピング・ロックファイル・OpenAPI 自動生成）の理解である。

## タスク一覧（実施順）

| # | タスク | 完了条件 |
|---|---|---|
| T1 | 作業ブランチ + PR 運用の開始: `.gitignore` を整備し、S1 の作業ブランチを切る | `.gitignore` がコミットされ、以降の変更が作業ブランチ上で行われている |
| T2 | backend/ の uv 初期化: `pyproject.toml` 作成、FastAPI / uvicorn を `uv add`、`uv.lock` をコミット対象にする | `uv run uvicorn app.main:app` でローカル起動し、`GET /health` が `{"status":"ok"}` を返す |
| T3 | `/docs` と `/openapi.json` の確認: 型からドキュメントが自動生成されることを体験 | ブラウザで `/docs` が開き、`/health` が Swagger UI 上から実行できる |
| T4 | Docker 化: `backend/Dockerfile` と ルート `compose.yaml`（api + db）、`.env` / `.env.example` 整備 | `cp .env.example .env` → `docker compose up` だけで API がポート 8002 で応答し、Postgres がポート 5433 で起動する |
| T5 | わざと失敗を見る実験①: compose の `ports:` を外して curl → 「コンテナ内では動いているのに外から届かない」を観察して戻す | 予想 → 実験 → 結果の差分がスプリントレビュー記録に残っている |
| T6 | pytest + httpx 導入: TestClient で `/health` のテストを1本書く | `uv run pytest` が緑 |
| T7 | GitHub Actions CI: PR 時に pytest を自動実行するワークフローを追加 | S1 の PR 上で CI が緑になる |
| T8 | 教材ドキュメント整備: dev-walkthrough.md 開始（冒頭に「差分の見方3通り」+ S1 の全ステップ）、concepts.md 開始（Docker 基礎・uv とロックファイル・OpenAPI 自動生成・async の入口）、README の起動手順追記 | 各ドキュメントがコミットされ、相互リンクと README からの導線がある |
| T9 | スプリントレビュー + レトロスペクティブ: 動作確認・DoD 判定・KPT。「学んだことを自分の言葉で要約してみよう」の課題とヒントをレトロに記載 | `docs/01_sprint1/review.md` と `retrospective.md` がコミットされている |

## タスクの順序の理由

- **T2（ローカルで uv 起動）→ T4（Docker 化）の順**にするのは、一度に動かす層を
  1つずつにするため。最初からコンテナで包むと、エラーが「Python の問題」なのか
  「Docker の問題」なのか切り分けられない。まずホストで FastAPI 単体を動かし、
  動くと分かっているものをコンテナに載せる
- **T6（テスト）→ T7（CI）の順**も同じ理由。ローカルで緑と分かっているテストを
  CI に載せれば、CI が赤いときに「テストが悪いのか CI 設定が悪いのか」で迷わない

## このスプリントで扱う「わざと失敗を見る実験」

- **実験①（T5）**: `compose.yaml` から `ports:` マッピングを外すと何が起きるか。
  予想を先に書いてから実行し、`curl -w "%{http_code}"` での観察結果と、
  ポートマッピング（ホスト ↔ コンテナ）の概念整理をレビュー記録に残す

## スコープ外（やらないこと）

- DB への接続コード（SQLModel / Alembic は S2。S1 では Postgres コンテナが
  起動することだけを確認する）
- TODO の機能実装すべて
- フロントエンド（第2部）

## DoD の確認先

完了の定義は [プロダクトバックログの DoD](../00_project/product-backlog.md#完了の定義dod全項目共通) に従う。
