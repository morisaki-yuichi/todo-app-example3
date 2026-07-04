# スプリント3 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: 作成・編集・削除 API が、バリデーション（422）・境界値・404 を含めて
  pytest で検証され、curl でも再現確認できる
- PR: [#3 スプリント3: Create / Update / Delete](https://github.com/morisaki-yuichi/todo-app-example3/pull/3)

## 動くものの確認結果

自動テスト: **32 passed**（作成9・編集7・削除4を追加。境界値 100/101・1000/1001 を含む）。

手動確認（コピペ再現可能な形で記録 = 前スプリントの Try T-3）:

```bash
B=http://localhost:8002

# 1) 作成 → 201（id と created_at は環境ごとに異なる）
curl -s -w "\n[%{http_code}]" -X POST "$B/todos" \
  -H "Content-Type: application/json" \
  -d '{"title": "curlで作成", "description": "手動確認用", "due_date": "2026-07-08"}'

# 2) 完了に変更 → 200・completed: true・updated_at が進む
curl -s -w "\n[%{http_code}]" -X PATCH "$B/todos/<ID>" \
  -H "Content-Type: application/json" -d '{"completed": true}'

# 3) title に null → 422（value_error / "title cannot be null"）
curl -s -w "\n[%{http_code}]" -X PATCH "$B/todos/<ID>" \
  -H "Content-Type: application/json" -d '{"title": null}'

# 4) 削除 → 204（本文なし）
curl -s -w "[%{http_code}]" -X DELETE "$B/todos/<ID>"

# 5) 再取得 → 404
curl -s -w "\n[%{http_code}]" "$B/todos/<ID>"
```

| 確認項目 | 結果 |
|---|---|
| POST 正常系 | 201・本文に採番済み id ✅ |
| PATCH 部分更新 | 200・completed のみ変化・updated_at 更新 ✅ |
| PATCH title=null | 422・field_validator のメッセージ ✅ |
| DELETE | 204・本文なし → 再取得 404 ✅ |
| 自動テスト | 32 passed ✅ |
| CI | PR #3 の backend-test 緑 ✅ |

## 実験

### 実験③: title を欠いた POST → 422 レスポンスの読み方

- **予想（実行前に記録）**: ルータ関数の実行前に Pydantic が拒否して 422。
  `detail` は配列で、`loc` は `["body", "title"]`、`type` は `"missing"`。
  DB には何も書き込まれない
- **実際**:
  ```json
  {"detail": [{"type": "missing", "loc": ["body", "title"],
               "msg": "Field required", "input": {"description": "タイトルを忘れた"}}]}
  ```
  一覧の total は 15 のまま（書き込みなし）。**予想との差分は `input` の存在**——
  受け取った本文そのものが入るため、「クライアントが実際に何を送ったか」を
  サーバの応答だけで確認できる
- **学び**: 422 は「どこが（loc）→ なぜ（type）→ 説明（msg）→ 何を受け取ったか（input）」
  の順で読む。フロント実装（S7）では `loc` を使って「どの入力欄にエラーを出すか」を
  決められる構造になっている

## トラブル記録

このスプリントで予定外のトラブルはなし。
（PATCH の「null と未送信の区別」は設計段階で扱いを決めたため、実装での手戻りが
出なかった。プランニングで仕様の曖昧さを潰しておく効果を確認）

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテスト（正常系・異常系 404/422・境界値）がローカル緑 | ✅ 32 passed |
| CI 緑でマージ | ✅ PR #3 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 3-1〜3-3）/ concepts（4概念）/ 本記録 |
| クローン直後の再現性 | ✅ 新規手順の追加なし（既存手順のまま動く） |

**判定: スプリントゴール達成。PBI-06 / PBI-07 / PBI-08 完了。**
（US-03 / 06 / 07 の API編受け入れ条件のうち、認可（401/403）は S4 で満たす）

## マージ後の main での動作確認（マージ作業の一部）

（マージ後にこの節へ結果を追記する）
