# スプリント2 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: TODO の一覧・詳細 API が PostgreSQL 上の実データで動き、
  ソート・絞り込み・ページネーションを含めて pytest で検証されている
- PR: [#2 スプリント2: Read（一覧・詳細）](https://github.com/morisaki-yuichi/todo-app-example3/pull/2)

## 動くものの確認結果

シード15件投入後、curl で確認（ステータスは `-w "%{http_code}"` で機械的に判定）:

| 確認項目 | リクエスト | 結果 |
|---|---|---|
| 一覧（既定） | `GET /todos` | 200・total=15・items=10件・created_at 降順 ✅ |
| ページネーション | `GET /todos?page=2` | 200・items=5件（古い側）✅ |
| 状態絞り込み | `GET /todos?completed=true` | 200・total=4 ✅ |
| キーワード絞り込み | `GET /todos --data-urlencode q=牛乳` | 200・total=2（title 一致 + description 一致）✅ |
| 詳細 | `GET /todos/1` | 200・全項目（due_date, created_at 含む）✅ |
| 存在しない ID | `GET /todos/9999` | 404・`{"detail":"Todo not found"}` ✅ |
| バリデーション | `GET /todos?per_page=101` | 422・違反内容が detail 配列に ✅ |
| 自動テスト | `uv run pytest` | 12 passed（実 Postgres / todo_test）✅ |
| CI | PR #2 の `backend-test` | 緑（Postgres サービスコンテナ上で実行）✅ |

## 実験

### 実験②: `upgrade` 前に2度目の `revision --autogenerate` を実行するとどうなるか

- **予想（実行前に記録）**: Alembic は DB が最新リビジョンまで適用済みでないと
  差分計算ができないため、`Target database is not up to date.` のエラーで拒否し、
  2つ目のリビジョンファイルは生成されないはず
- **実際**: `FAILED: Target database is not up to date.` が出力され、
  `versions/` に新ファイルは作られなかった（予想どおり）
- **診断の型**: `alembic current`（DB に適用済み = 空だった）と
  `alembic heads`（コードの最新 = 初期リビジョン）を見比べる。
  **両者の差**がこのエラーの正体で、`upgrade head` で一致させれば解消する
- **学び**: このエラーは「autogenerate は“現在の DB” と“モデル”の差分を計算する」
  という仕組みの裏返し。未適用リビジョンがあると“現在の DB”が信用できないので拒否される

## トラブル記録

### `python scripts/seed.py` の直接実行で ModuleNotFoundError

- **症状**: `uv run python scripts/seed.py` → `ModuleNotFoundError: No module named 'app'`
- **調査**: エラーの1行目から「`app` が import パスにない」ことは明らか。
  Python は「実行したスクリプトのあるディレクトリ」（この場合 `scripts/`）を
  import パスに入れるため、隣の `app/` パッケージが見えない
- **解決**: モジュール実行 `uv run python -m scripts.seed` に変更
  （`-m` はカレントディレクトリを import パスに入れる）。スクリプトの docstring にも明記
- **学び**: 「スクリプト直接実行」と「モジュール実行」で sys.path が違う。
  プロジェクト内ツールは `-m` で統一すると安全

### 日本語クエリの curl が 400 `Invalid HTTP request received`

- **症状**: `curl "http://localhost:8002/todos?q=牛乳"` が空ボディ + 400
- **調査**: アプリのログにリクエストの痕跡がない → アプリより外側の層を疑う（調査の型）。
  ステータスを観察すると 400 で、本文は `Invalid HTTP request received.`。
  HTTP の URL に使える文字は ASCII のみで、未エンコードの UTF-8 バイトを含む
  リクエストラインを uvicorn（の HTTP パーサ）が拒否していた
- **解決**: `curl --get --data-urlencode "q=牛乳" http://localhost:8002/todos` で
  正しくエンコードして送る → 200・期待どおりの絞り込み結果
- **学び**: ブラウザや fetch は URL エンコードを自動でやるため、この問題は
  「curl での手動確認のときだけ」踏む。**アプリのログに出ない問題は1段外側**、の好例

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテスト（正常系・異常系 404/422・境界値）がローカル緑 | ✅ 12 passed |
| CI 緑でマージ | ✅ PR #2 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 2-1〜2-7）/ concepts（6概念）/ 本記録 |
| クローン直後の再現性 | ✅ README に「alembic upgrade head を忘れると /todos が 500」を明記 |

**判定: スプリントゴール達成。PBI-03 / PBI-04 / PBI-05 完了。**
（US-04 / US-05 の API編受け入れ条件のうち、認可に関わる項目は S4 で満たす）

## マージ後の main での動作確認（マージ作業の一部）

2026-07-05、PR #2 のマージコミットを pull した main 上で実施:

- `docker compose up -d --build` → `GET /todos?per_page=3` が 200・total=15 ✅
- `uv run pytest` → 12 passed ✅
