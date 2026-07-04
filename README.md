# todo-app-example3 — FastAPI + React で作る TODO アプリ教材

CRUD 機能を持つマルチユーザー TODO アプリを、スクラム開発の流れに沿って作りながら、
**中級エンジニアが一人で写経・追体験できる教材**としてドキュメント化するプロジェクトです。

姉妹プロジェクト（Laravel + Plain HTML/CSS 版）と同じ題材をモダンな SPA 構成で
作り直すことで、「サーバレンダリング vs SPA」「規約優先 vs 組み立て式」を
対比学習できることを目指しています。

## 技術スタック

- バックエンド: Python 3.12 / FastAPI / SQLModel / Alembic / PostgreSQL（uv で依存管理）
- フロントエンド: React + Vite + TypeScript / React Router / CSS Modules
- テスト: pytest + httpx / Vitest + React Testing Library / Playwright
- インフラ: Docker + Docker Compose / GitHub Actions

## クイックスタート

必要なもの: Docker（Compose 含む）、[uv](https://docs.astral.sh/uv/)、Git

```bash
git clone https://github.com/morisaki-yuichi/todo-app-example3.git
cd todo-app-example3
cp .env.example .env        # ポート等は必要に応じて .env で変更
docker compose up -d --build
```

- API: http://localhost:8002/health が `{"status":"ok"}` を返せば起動成功
- API ドキュメント（Swagger UI）: http://localhost:8002/docs

バックエンドのテスト:

```bash
cd backend
uv sync             # 初回のみ（ロックファイルから依存を復元）
uv run pytest
```

## ドキュメント

### プロジェクト全体

- [初期プロンプト（教材の要件定義）](docs/initial-prompt.md)
- [プロダクトロードマップ](docs/00_project/roadmap.md)
- [QAログ（仕様決定の記録）](docs/00_project/qa-log.md)
- [ユーザーストーリー](docs/00_project/user-stories.md)
- [プロダクトバックログ（DoD つき）](docs/00_project/product-backlog.md)

### 教材

- [開発トレースガイド（dev-walkthrough.md）](docs/00_project/dev-walkthrough.md) —
  コミット履歴を目次に、写経で追体験するためのガイド
- [概念解説集（concepts.md）](docs/00_project/concepts.md) —
  登場した概念を「定義 / なぜ必要か / このリポジトリでの実例」で整理
- キャッチアップ集（catch-up.md）・演習編（exercises.md）は開発に合わせて整備予定

### スプリント記録

各スプリントのバックログ・レビュー・レトロスペクティブは `docs/01_sprintN/` 配下に
スプリント終了ごとに追加します。

- [スプリント1: 環境構築](docs/01_sprint1/backlog.md)
  （[レビュー](docs/01_sprint1/review.md) / [レトロ](docs/01_sprint1/retrospective.md)）
