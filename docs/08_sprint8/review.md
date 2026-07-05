# スプリント8 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: フロントと API が別オリジンのまま通信でき、認証は JWT に移行、
  両方式の対比が教材として記録されている
- PR: [#8 スプリント8: JWT + CORS への移行](https://github.com/morisaki-yuichi/todo-app-example3/pull/8)

## 動くものの確認結果

| 確認項目 | 結果 |
|---|---|
| バックエンドテスト | 63 passed（JWT 往復・期限切れ・改ざん・CORS 3本を含む）✅ |
| フロント `npm run check`（lint + test + build） | 25 passed・警告ゼロ・ビルド緑 ✅ |
| プリフライト（実験⑨の再現） | 405 → **200 + access-control-allow-origin** ✅ |
| 別オリジン POST /auth/login（Origin つき） | 200 + 許可ヘッダー ✅ |
| 実トークンで /auth/me | 200 ✅ |
| 改ざんトークン / トークンなし | 401 / 401 ✅ |
| 旧 /api プロキシパス | 廃止済み（HTML フォールバック）✅ |
| sessions テーブル削除マイグレーション | up → down → up 往復成功 ✅ |
| CI 2ジョブ | 緑 ✅ |

ブラウザでの確認項目（写経者向け）: ログイン → CRUD 一巡、Network タブで
接続先が `:8002`（別オリジン）+ `Authorization: Bearer`、Application タブの
Local Storage にトークン、ログアウトでトークン消滅 → /todos がログイン画面へ。

## 実験

### 実験⑨: CORS 未設定のサーバに「ブラウザ相当」のリクエストを送る

- **予想（実行前に記録）**: プリフライト OPTIONS は 405（受ける口がない）。
  通常 GET に Origin を付けても Access-Control-Allow-Origin ヘッダーは付かない
- **実際**: 予想どおり（405 / ヘッダーなし）。**重要な観察**: GET は 200 で
  本文も返っていた。つまりデータはサーバから出ている——それを JS に渡さないのは
  **ブラウザ**である。「CORS エラーはサーバのエラーではない」ことの直接証拠
- **検出網**: CORS 導入後、[tests/test_cors.py](../../backend/tests/test_cors.py) が
  プリフライト許可・許可外オリジンの両方を常時検証する
- **学び**: curl で「CORS エラー」は再現できない（curl は同一オリジンポリシーを
  持たないため）。curl での診断は「ヘッダーの有無」を見る

### 実験⑩: JWT の改ざん・期限切れ

- **予想（実行前に記録）**: 正規トークンは 200。署名部分を4文字書き換えれば 401。
  期限切れ（exp が過去）も 401
- **実際**: 予想どおり（200 / 401 / 401）。エラーメッセージは全ケース同一の
  `Not authenticated`（失敗理由を攻撃者に教えない）
- **検出網**: test_security.py（改ざん・期限切れは例外）と test_auth.py（API として 401）
- **学び**: JWT の守りは署名（改ざん検出）と期限のみ。「鍵なしで中身が読める」
  テストも追加し、**JWT ≠ 暗号化**を機械的な事実として残した

## トラブル記録

### pyjwt の InsecureKeyLengthWarning

- **症状**: JWT テストで警告7件。`The HMAC key is 24 bytes long, which is below
  the minimum recommended length of 32 bytes for SHA256 (RFC 7518)`
- **解決**: 開発用既定鍵を32バイト以上に変更。`.env.example` に鍵の生成例
  （`secrets.token_urlsafe(48)`)を記載
- **学び**: 署名の強さは鍵の長さに依存する。ライブラリの警告が RFC の要求を
  代弁してくれた（「警告は放置しない」方針の成果）

### Node の実験的 WebStorage が jsdom の localStorage を覆い隠す

- **症状**: フロントのテストで `localStorage.getItem is not a function`。
  jsdom には localStorage があるはずなのに落ちる
- **調査**: 最小の探りテストを書いて観察（思い込みでなく実出力で検証）。
  `Warning: --localstorage-file was provided without a valid path` が出ており、
  **Node 25 の実験的 WebStorage 実装**が jsdom のものを覆い隠していると特定
- **解決**: setupTests.ts でメモリ実装の Storage を `window.localStorage` に固定し、
  afterEach で clear（テスト間の独立性も確保）
- **学び**: テストが依存する環境（グローバル）は自前で固定する。
  「実行環境のバージョンアップで壊れるテスト」への一般的な防御でもある

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテストがローカル緑 | ✅ バックエンド 63 / フロント 25・警告ゼロ |
| CI 緑でマージ（マイグレーション往復検証込み） | ✅ PR #8 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 8-1〜8-4）/ concepts（3概念・対比表）/ QAログ / 本記録 |
| クローン直後の再現性 | ✅ .env.example に SECRET_KEY / FRONTEND_ORIGIN / VITE_API_URL を追加 |

**判定: スプリントゴール達成。PBI-16 完了。US-02 の「JWT への移行」条件を満たした。**

## マージ後の main での動作確認（マージ作業の一部）

2026-07-05、PR #8 のマージコミットを pull した main 上で実施（dev サーバ再起動済み）:

- ログイン（Origin つき別オリジン POST）→ トークン取得 → Bearer で一覧 200 ✅
- バックエンド 63 passed / フロント 25 passed ✅
