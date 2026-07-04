# スプリント4 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: マルチユーザーの TODO API として完成（登録・ログイン・ログアウト、
  401/403、既存データのデータ移行）。第1部 API編の完了
- PR: [#4 スプリント4: 認証・認可 + CI 固め](https://github.com/morisaki-yuichi/todo-app-example3/pull/4)

## 動くものの確認結果

自動テスト: **55 passed**（認証9・セキュリティ3・認可ペアテスト等11を追加）。

手動確認（コピペ可・シード投入後）:

```bash
B=http://localhost:8002

# alice / bob でログインし cookie を保存（シードのデモユーザー）
curl -s -c /tmp/alice.jar -X POST "$B/auth/login" -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}' -w "\n[%{http_code}]"
curl -s -c /tmp/bob.jar -X POST "$B/auth/login" -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com", "password": "password123"}' -o /dev/null -w "[%{http_code}]"

# 未ログイン → 401 / alice は自分の一覧 / bob が alice の TODO 直叩き → 403
curl -s -w "\n[%{http_code}]" "$B/todos"                       # [401]
curl -s -b /tmp/alice.jar "$B/todos" | head -c 120             # alice の15件
curl -s -b /tmp/bob.jar -w "\n[%{http_code}]" "$B/todos/<aliceのID>"  # [403]
```

| 確認項目 | 結果 |
|---|---|
| 未ログインで全 TODO API | 401 ✅ |
| ログイン（alice/bob） | 200 + httpOnly cookie ✅ |
| alice の一覧に bob の TODO が混ざらない | ✅（15件のみ） |
| bob → alice の TODO 直叩き | 403 `Not the owner of this todo` ✅ |
| 既存17件のデータ移行 | `legacy@example.com` に引き取り ✅ |
| マイグレーション往復（up→down→up） | ローカル・CI とも成功 ✅ |
| 自動テスト / CI | 55 passed / PR #4 緑 ✅ |

## 実験

### 実験④: NOT NULL 列を autogenerate のまま既存テーブルに適用

- **予想（実行前に記録）**: todos には17行の既存データがある。`nullable=False` の
  一発追加は、既存行の user_id を埋める手段がないため NotNullViolation で失敗する。
  トランザクション内 DDL なのでテーブルは無傷のはず
- **実際**: `sqlalchemy.exc.IntegrityError: (psycopg.errors.NotNullViolation)
  column "user_id" of relation "todos" contains null values`。
  `\d todos` に user_id 列は増えておらず、`alembic current` も前のまま（予想どおり）
- **修正**: 「① nullable で追加 → ② legacy@example.com を作って既存行を割り当て →
  ③ NOT NULL 化 + FK + インデックス」の3段階に手で書き換えて成功。
  副産物として、autogenerate が FK を**無名（None）**で生成し downgrade が
  実行不能になる問題も発見し、`fk_todos_user_id_users` と命名して解決
- **学び**: autogenerate はデータのことを何も知らない。データが入ったテーブルの
  制約変更は「追加 → 埋める → 締める」を人間が書く。down も必ず動かして検証する
  （この検証は Step 4-4 で CI に組み込んだ）

### 実験⑤: 認可チェックを外すと何が起きるか

- **予想（実行前に記録）**: `get_owned_todo` の所有チェック2行を外すと、
  bob が alice の TODO を 200 で読めてしまう。ペアテストの「他人は 403」側が落ちるはず
- **実際**: bob で alice の TODO 直叩きが 200 になり、タイトル・説明まで丸ごと取得できた。
  pytest はペアテスト4本が failed（`test_detail_owner_200_other_403` 等）で検出。
  チェックを戻すと 403 と 55 passed に復帰
- **学び**: 認可の欠落は例外もログも出さない「静かな脆弱性」（IDOR）。
  ペアテストを書いておくことが唯一の機械的な検出手段になる。
  「本人側だけ」「他人側だけ」のテストでは、それぞれ逆方向の壊れ方を見逃す

## トラブル記録

### コンテナ内の uvicorn が ImportError でリロード死 → curl がハング

- **症状**: 新依存（bcrypt / email-validator）を追加した直後、ホストからの curl が
  応答なしでハングした。アプリのログを見ると
  `ImportError: email-validator is not installed` がリロードごとに繰り返されていた
- **調査**: 調査の型「アプリのログに出ない問題は1段外側」の逆パターンで、
  今回は**コンテナのログに答えがあった**（`docker compose logs api`）。
  ホストで `uv add` した依存は、コンテナ内の venv（匿名ボリューム）には
  自動では入らない。uvicorn の --reload はコード変更で再 import するが、
  import が失敗し続けてワーカー不在 → リクエストが宙づりになっていた
- **解決**: `docker compose restart api`。起動コマンドの `uv run` が
  マウントされた uv.lock を見て新依存を同期してから uvicorn を起動する
- **学び**: 「ホストの venv」と「コンテナの venv」は別物。**依存を追加したら
  api コンテナを再起動する**を運用ルールにする（トレースガイドにも記載）

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテスト（401/403/404/409/422・境界値・ペア）がローカル緑 | ✅ 55 passed |
| CI 緑でマージ（マイグレーション往復検証込み） | ✅ PR #4 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 4-1〜4-4）/ concepts（4概念）/ QAログ / 本記録 |
| クローン直後の再現性 | ✅ README にログイン込みの手順を更新 |

**判定: スプリントゴール達成。PBI-09 / PBI-10 完了。
持ち越し受け入れ条件（US-03〜07 の 401/403、US-08 のペアテスト）をすべて回収し、
US-01〜08 の API編受け入れ条件が完了 = 第1部 API編 完了（マイルストーン M1 達成）。**

## マージ後の main での動作確認（マージ作業の一部）

（マージ後にこの節へ結果を追記する）
