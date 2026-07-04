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

## ドキュメント

### プロジェクト全体

- [初期プロンプト（教材の要件定義）](docs/initial-prompt.md)
- [プロダクトロードマップ](docs/00_project/roadmap.md)
- [QAログ（仕様決定の記録）](docs/00_project/qa-log.md)
- [ユーザーストーリー](docs/00_project/user-stories.md)
- [プロダクトバックログ（DoD つき）](docs/00_project/product-backlog.md)

### 教材（開発に合わせて整備予定）

- 開発トレースガイド（dev-walkthrough.md）
- 概念解説集（concepts.md）
- キャッチアップ集（catch-up.md）
- 演習編（exercises.md）

### スプリント記録

各スプリントのバックログ・レビュー・レトロスペクティブは `docs/01_sprintN/` 配下に
スプリント終了ごとに追加します。
