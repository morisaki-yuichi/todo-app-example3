# スプリント5 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: `npm install` → `npm run dev` で React アプリが起動し、
  Vite プロキシ経由でバックエンドと通信できる。Vitest / 型チェック / ビルドが CI で回る
- PR: [#5 スプリント5: React 環境構築](https://github.com/morisaki-yuichi/todo-app-example3/pull/5)

## 動くものの確認結果

| 確認項目 | 手順 | 結果 |
|---|---|---|
| 開発サーバ起動 | `npm run dev` → `http://localhost:5176/` | 200・「TODO アプリ」ヘッダーと Home 表示 ✅ |
| プロキシ結合 | `curl http://localhost:5176/api/health` | `{"status":"ok"} [200]`（API の JSON がフロントのポートから返る）✅ |
| 画面の3状態 | ブラウザで Home を表示 / `docker compose stop api` → リロード → `start api` | 接続OK → エラー表示 → 復帰 ✅ |
| ユニットテスト | `npm test` | 3 passed（ローディング / 成功 / エラー）✅ |
| 型チェック + ビルド | `npm run build` | tsc + vite build 緑 ✅ |
| CI 2ジョブ | PR #5 | backend-test / frontend-test とも緑 ✅ |

## 実験

### 実験⑥: Vite プロキシを外して `/api/health` を叩くとどうなるか

- **予想（実行前に記録）**: プロキシがなければ Vite 開発サーバ自身がパスを受けるが、
  知らないパスなので **404** を返すはず。JSON は返らない
- **実際**: **予想と違った**。404 ではなく **200 で index.html（HTML）が返った**。
  SPA の開発サーバは、未知のパスに対して index.html を返す
  （ブラウザの直接アクセスでもルーティングが働くようにする「SPA フォールバック」）
- **学び**: プロキシ漏れ・`/api` の付け忘れの症状は「HTTP エラー」ではなく、
  **fetch の `res.json()` が HTML を食べて `Unexpected token '<'` で落ちる**
  JSON パースエラーとして現れる。「JSON のはずが `<` で始まる」を見たら
  まず「そのリクエスト、本当に API に届いているか」を疑い、curl で実レスポンスを見る

## トラブル記録

### git pull 直後に Vite プロキシが効かなくなる（dev サーバの設定再読込レース）

- **症状**: マージ後確認で `curl :5176/api/health` が JSON でなく index.html を返した
  （実験⑥と同じ症状）。テスト・ビルドはすべて緑
- **調査**: dev サーバのログを読むと、`git pull` でファイルが書き換わった瞬間の
  自動再起動時に `Port 5173 is in use, trying another one...` と出ていた。
  ポートは 5176 を明示しているので本来出ないメッセージ = **その再起動は不完全な
  設定で走った**と分かる（チェックアウト中のファイルを読んだ設定再読込レース）
- **解決**: dev サーバを再起動（ポート 5176 の PID を `ss -ltnp` で特定してから kill
  = S1 レトロの Try T-2 を適用）。プロキシ復活
- **学び**: **ブランチ切り替えや pull の後は dev サーバを再起動する**。
  「起動しっぱなしの開発サーバ」は、ファイルの一斉書き換えに弱いことがある

（このほか、uv で学んだ「ロックファイルの規律」を npm にそのまま適用（npm ci）できたのは
第1部の学びの転用と言える）

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテストがローカル緑 | ✅ Vitest 3 passed + ビルド緑（バックエンドも 55 passed のまま） |
| CI 緑でマージ | ✅ PR #5（backend-test / frontend-test の2ジョブ） |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 5-1〜5-4）/ concepts（5概念）/ 本記録 |
| クローン直後の再現性 | ✅ README にフロント手順追加・package-lock.json コミット済み・FRONT_PORT を .env.example に追加 |

**判定: スプリントゴール達成。PBI-11 完了。**

## マージ後の main での動作確認（マージ作業の一部）

2026-07-05、PR #5 のマージコミットを pull した main 上で実施:

- `npm test` → 3 passed、`npm run build` → 緑 ✅
- `curl :5176/api/health` → 初回は HTML が返り（上記トラブル記録）、
  dev サーバ再起動後に `{"status":"ok"} [200]` ✅
- マージ後確認が実際に問題（dev サーバの設定レース）を1件検出した。
  「マージ後の動作確認まで含めてマージ作業」の運用が機能した実例
