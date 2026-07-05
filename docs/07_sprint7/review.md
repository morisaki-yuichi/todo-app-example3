# スプリント7 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: ブラウザだけで TODO の全操作が完結し、バリデーションエラーは
  フィールドの近くに表示され、削除には確認ステップがある
- PR: [#7 スプリント7: CRUD UI の完成](https://github.com/morisaki-yuichi/todo-app-example3/pull/7)

## 動くものの確認結果

自動テスト: **25 passed**（validation 3・TodoDetail 5・TodoNew 3・TodoEdit 2・
Todos +1 を追加）。lint 警告ゼロ。

プロキシ越しの CRUD 一巡（curl・コピペ可。cookie は S6 の手順で取得済みの前提）:

```bash
B=http://localhost:5176/api
curl -s -b /tmp/front.jar -X POST "$B/todos" -H "Content-Type: application/json" \
  -d '{"title":"S7手動確認"}'                        # [201] id を控える
curl -s -b /tmp/front.jar -X PATCH "$B/todos/<ID>" -H "Content-Type: application/json" \
  -d '{"completed":true}' -w " [%{http_code}]"       # [200]
curl -s -b /tmp/front.jar -X DELETE "$B/todos/<ID>" -w "[%{http_code}]"   # [204]
```

ブラウザでの確認項目:

| 確認項目 | 結果 |
|---|---|
| 一覧タイトル → 詳細（全項目表示） | ✅ |
| 存在しない ID の URL → 「見つかりません」 | ✅ |
| 新規作成 → 詳細へ遷移。101文字タイトル → タイトル欄下にエラー | ✅ |
| 編集フォームに既存値が入り、保存で反映 | ✅ |
| 一覧チェックボックスで完了切替（絞り込み中は項目が消える） | ✅ |
| 削除: 確認キャンセルで何も起きない / OK で一覧へ | ✅ |
| CI 2ジョブ | 緑 ✅ |

## 実験

### 実験⑧: リスト描画の key を外すとどうなるか

- **予想（実行前に記録）**: アプリは一見正常に動くが、コンソール（テストでは stderr）に
  `Each child in a list should have a unique "key" prop` の警告が出る。
  テストは落ちない（振る舞い自体は変わらないため）
- **実際**: **予想と一部違った**。テストは予想どおり全部通ったが、テスト出力に
  React の実行時警告は観測できなかった。一方 **lint（oxlint の react/jsx-key）は
  `Missing "key" prop for element in iterator` を確実に検出**した
- **学び**: 実行時のコンソール警告は「人間がそのとき見ている」ことが前提で、
  実行環境やバージョンによって見え方も変わる。**CI で毎回回る静的検査（lint）を
  網にする**方が確実。実験⑦（依存配列）に続き、react 系 lint ルールの価値を再確認

## トラブル記録

### Link 追加で既存の一覧テストが4本失敗

- **症状**: 一覧アイテムのタイトルを `<Link>` にした途端、既存の Todos テストが
  「Unable to find an element」で4本失敗
- **調査**: Link は Router の文脈（コンテキスト）を必要とするため、Router なしの
  `render(<Todos />)` では成功状態の描画が失敗していた
- **解決**: `render(<Todos />, { wrapper: MemoryRouter })` に変更
- **学び**: コンポーネントに Router / Context 由来の部品を足したら、テストのラッパーも
  それに追随する。**そして「テストを緑にしてからコミット」**——今回この失敗に気づかず
  一度コミットしてしまい、push 前だったため amend で回復した（レトロの Problem 参照）

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテストがローカル緑 | ✅ フロント 25 passed / バックエンド 55 passed / lint 警告ゼロ |
| CI 緑でマージ | ✅ PR #7 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 7-1〜7-5）/ concepts（3概念）/ 本記録 |
| クローン直後の再現性 | ✅ 新規手順なし |

**判定: スプリントゴール達成。PBI-14 / PBI-15 完了。
US-03 / 05 / 06 / 07 のフロント編受け入れ条件を満たした。**

## マージ後の main での動作確認（マージ作業の一部）

（マージ後にこの節へ結果を追記する）
