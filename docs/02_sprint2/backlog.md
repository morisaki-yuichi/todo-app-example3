# スプリント2 バックログ — Read（一覧・詳細）

- 期間の目安: 3〜4時間（写経者の学習時間）
- 対応 PBI: PBI-03（DB 基盤）、PBI-04（一覧 API）、PBI-05（詳細 API）
- 前スプリントの Try（今回実際に使う）:
  - **T-1**: 生成コマンドの直後に `git status` で生成物を確認する（Alembic の init /
    autogenerate で使う）
  - **T-2**: プロセス操作は対象をポート番号などで特定してから行う

## スプリントゴール

**「TODO の一覧・詳細 API が PostgreSQL 上の実データで動き、ソート・絞り込み・
ページネーションを含めて pytest で検証されている」状態を作る。**

認証はまだ入れない（S4）。この時点の TODO は所有者なしで、S4 で `user_id` を
データ移行つきで追加する（設計意図は [user-stories.md](../00_project/user-stories.md) 参照）。

## タスク一覧（実施順）

| # | タスク | 完了条件 |
|---|---|---|
| T1 | DB 接続基盤: pydantic-settings による設定（`config.py`）、エンジンとセッション依存（`db.py`）、compose に DB 接続の環境変数と healthcheck を追加 | ホスト（localhost:5433）とコンテナ内（db:5432）の両方から同じ設定コードで DB に届く |
| T2 | Alembic 導入: `uv run alembic init migrations` + env.py を SQLModel / 設定と接続 | `uv run alembic current` がエラーなく動く |
| T3 | Todo モデル定義と初期マイグレーション: `models.py` → autogenerate → upgrade | `todos` テーブルが実 DB にでき、`alembic current` が head を指す |
| T4 | わざと失敗を見る実験②: upgrade **前に** 2度目の autogenerate を実行 → `Target database is not up to date` を観察 | 予想 → 実験 → 結果の差分がレビュー記録に残っている |
| T5 | テスト用 DB 基盤: conftest（テスト専用 DB の自動作成・セッション差し替え）+ モデルの保存/読込テスト | `uv run pytest` が実 Postgres（todo_test）に対して緑 |
| T6 | 一覧 API `GET /todos`: created_at 降順、`page` / `per_page`（既定10・上限100）、`completed` / `q` 絞り込み、`total` 返却 + テスト | 正常系・絞り込み・ページ境界・422（範囲外パラメータ）のテストが緑 |
| T7 | 詳細 API `GET /todos/{id}` + テスト | 200 と 404 のテストが緑 |
| T8 | シードスクリプトと手動確認: `scripts/seed.py` 投入 → curl で一覧・絞り込み・404・422 を `-w "%{http_code}"` つきで確認、`/docs` でスキーマ確認 | curl の結果が期待どおり（レビュー記録に記載） |
| T9 | CI に PostgreSQL サービスコンテナを追加 | PR の CI がテスト込みで緑 |
| T10 | 教材ドキュメント: dev-walkthrough に Step 2-x を追記、concepts に SQLModel / Alembic / 依存性注入 / サービス名の名前解決 / 設定の env 駆動 / テスト用 DB を追記 | 相互リンクつきでコミット済み |
| T11 | レビュー + レトロ（Try の使用結果も記録） | `review.md` / `retrospective.md` がコミット済み |

## 設計上の主な選択（プランニングで合意した理由つき）

- **同期 SQLAlchemy（psycopg v3）で始める**: FastAPI は同期関数もスレッドプールで
  捌けるため、まず概念数を抑えて動かす。非同期 DB アクセスは概念解説で触れ、
  必要になった時点（負荷・ストリーミング等の要件）で移行を検討する
- **テストは実 Postgres に対して行う**（SQLite で代用しない）: 本番と同じ DBMS で
  テストするほうが、方言差（型・ソート・NULL の扱い）による「テストは通るのに本番で
  壊れる」を防げる。テスト専用 DB `todo_test` は conftest が自動作成する
- **一覧の並びは `created_at DESC, id DESC`**: created_at が同時刻のとき順序が
  不定にならないよう、一意なタイブレーカーを付ける（順序不定はテストの
  フレーク=たまに落ちる原因の定番）

## スコープ外（やらないこと）

- Create / Update / Delete（S3）
- 認証・認可・user_id（S4）
- フロントエンド

## DoD の確認先

[プロダクトバックログの DoD](../00_project/product-backlog.md#完了の定義dod全項目共通) に従う。
