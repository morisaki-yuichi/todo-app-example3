# スプリント5 バックログ — React 環境構築（第2部 開幕）

- 期間の目安: 3〜4時間（写経者の学習時間）
- 対応 PBI: PBI-11（フロント環境の土台）
- 前スプリントの Try（今回実際に使う）:
  - **T-7**: 依存を追加したら実行環境の同期を確認する（バックエンドなら
    `docker compose restart api`。フロントは npm がホスト実行なので同期問題は
    起きにくいが、`package-lock.json` のコミット漏れに同種の注意を払う）
  - **T-8**: スプリントの分量を「画面1〜2枚 + 教材」に抑える
    → 今回は環境構築 + **画面1枚**（API ヘルス表示）のみ。ログイン・一覧は S6

## スプリントゴール

**「`npm install` → `npm run dev` だけで React アプリが起動し、Vite プロキシ経由で
バックエンド API と通信できる（画面に API の接続状態が出る）。Vitest / 型チェック /
ビルドが CI で回る」状態を作る。**

フロント/バック結合は **Vite プロキシ**方式（QAログ #2 の決定どおり）。
ブラウザから見るとフロントと API が同一オリジンになるため、**CORS 設定はまだ不要**。
S8 でプロキシを外して CORS エラーを観察してから、別オリジン構成（JWT + CORS）へ移行する。

## タスク一覧（実施順）

| # | タスク | 完了条件 |
|---|---|---|
| T1 | Vite で雛形生成: `npm create vite@latest frontend -- --template react-ts`（生成物を `git status` で確認 = Try T-1 の定着） | `npm run dev` でテンプレートが起動する |
| T2 | ポートとプロキシの設定: ルート `.env` の `FRONT_PORT=5176` を読み、`/api` を API（8002）へ転送する `vite.config.ts` | `curl http://localhost:5176/api/health` が API の JSON を返す |
| T3 | **わざと失敗を見る実験⑥**: プロキシ設定を外して `/api/health` を叩く → 何が返るかを観察して戻す | 予想 → 実験 → 結果の差分がレビュー記録に残っている |
| T4 | ページ骨格 + 画面1枚: React Router（`/` ルート + ヘッダー）、CSS Modules、Home 画面（`/api/health` を fetch してローディング / 接続OK / エラーの3状態を表示） | ブラウザ（curl）で3状態のうち正常系が確認でき、API 停止時はエラー表示になる |
| T5 | Vitest + React Testing Library 導入: Home の3状態をテスト（fetch はモック） | `npm test` が緑 |
| T6 | CI にフロントジョブ追加: `npm ci` → `npm run build`（型チェック込み）→ `npm test` | PR の CI が backend-test / frontend-test の2ジョブとも緑 |
| T7 | 教材ドキュメント: dev-walkthrough Step 5-x、concepts（SPA と Vite、npm とロックファイル、コンポーネントと JSX、CSS Modules、Vite プロキシと同一オリジン） | 相互リンクつきでコミット済み |
| T8 | レビュー + レトロ（Try T-7 / T-8 の使用結果も記録） | 記録がコミット済み |

## 設計上の主な選択（理由つき）

- **フロントの API 呼び出しは `/api` プレフィックスに統一**し、プロキシで剥がして
  API へ転送する（`/api/health` → `http://localhost:8002/health`）。
  「どこからが API 呼び出しか」がコード上で一目で分かり、S8 で接続先を
  環境変数化するときも置き換えが1箇所で済む
- **フロントは Docker に入れず、ホストの npm で動かす**: Vite の開発サーバは
  HMR（変更の瞬間反映）が要で、コンテナ越しはファイル監視が遅くなりがち。
  バックエンド（DB を含む）は Docker、フロントはホスト、が開発体験のバランス
- **React Router はライブラリモード**（`<Routes>` / `<Route>`）で使う:
  フレームワークモード（ファイルベースルーティング等）は覚えることが多い。
  教材としては「ルーティングとは何か」が見えるライブラリモードから入る
- **テストの fetch はモック**: 環境構築段階では「コンポーネントの3状態」だけを
  検証対象にし、実 API 結合の検証は E2E（S10 の Playwright）に譲る

## スコープ外（やらないこと）

- ログイン画面・TODO 一覧/詳細（S6）、フォーム（S7）
- CORS 設定（S8 まで不要にする、が本スプリントの設計そのもの）
- Playwright（S10）

## DoD の確認先

[プロダクトバックログの DoD](../00_project/product-backlog.md#完了の定義dod全項目共通) に従う。
