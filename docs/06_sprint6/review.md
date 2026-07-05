# スプリント6 レビュー記録

- 日付: 2026-07-05
- スプリントゴール: ブラウザからログイン（登録）でき、自分の TODO 一覧が絞り込み・
  ページネーションつきで見られる。未ログインの一覧アクセスはログイン画面へ誘導
- PR: [#6 スプリント6: ログイン + TODO 一覧](https://github.com/morisaki-yuichi/todo-app-example3/pull/6)

## 動くものの確認結果

自動テスト: **11 passed**（Login 2・Todos 6・Home 3）。バックエンドは 55 passed のまま。

プロキシ越しの全経路確認（curl・コピペ可）:

```bash
J=/tmp && B=http://localhost:5176/api   # フロントのポート経由 = プロキシの検証
curl -s -w " [%{http_code}]" "$B/todos"                                   # [401] 未ログイン
curl -s -c $J/front.jar -X POST "$B/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'             # [200]
curl -s -b $J/front.jar "$B/todos?completed=true"                         # total: 4
curl -s -b $J/front.jar "$B/auth/me"                                      # [200] alice
```

ブラウザでの確認項目（写経者向け・トレースガイド Step 6-2 / 6-3 参照）:

| 確認項目 | 結果 |
|---|---|
| 未ログインで /todos → /login へリダイレクト | ✅ |
| alice でログイン → 一覧へ遷移・ヘッダーにメール表示 | ✅ |
| 誤パスワード → 「メールアドレスまたはパスワードが違います」 | ✅ |
| リロードしてもログイン状態が維持される（/auth/me 復元） | ✅ |
| 一覧15件・「完了」絞り込み4件・「牛乳」検索2件・2ページ目5件 | ✅ |
| API 停止（compose stop api）→ エラー表示 | ✅ |
| CI 2ジョブ | 緑 ✅ |

## 実験

### 実験⑦: useEffect の依存配列から filter を外すとどうなるか

- **予想（実行前に記録）**: 絞り込みセレクトを変えても effect が再実行されず、
  一覧は古い結果のまま。エラーも警告も出ない。絞り込みのテストは落ちるはず
- **実際**: 予想どおり。さらに **lint（oxlint の react-hooks ルール）も
  `missing dependency: 'filter'` を警告**した。検出網は2重
  （テスト: 振る舞いの検証 / lint: コードの静的検査）
- **学び**: 依存配列の書き漏らしは「静かなバグ」の代表格だが、
  ①react-hooks の lint ルールを常時回す、②「操作 → 再取得」の振る舞いをテストに書く、
  の2つで機械的に防げる。「うっかり」を人間の注意力でなく仕組みで受け止める

## トラブル記録

### テストで「Found multiple elements」— RTL の cleanup 漏れ

- **症状**: Login と Todos のテストを追加したら、単体では通るのに一括実行で
  「Found multiple elements」や「前のテストの画面が見える」失敗が5件発生
- **調査**: エラーメッセージが示す「余分な要素」が、**直前のテストで描画した DOM**
  だった。React Testing Library の自動クリーンアップは `globals: true` 構成でしか
  効かず、本リポジトリは explicit import 方針（globals: false）のため、
  テスト間で DOM が積み上がっていた
- **解決**: `setupTests.ts` に `afterEach(() => cleanup())` を明示
- **学び**: 「単体では通るのに一括で落ちる」はテスト間の状態共有を疑う
  （バックエンドのテスト用 DB で学んだ「テストの独立性」のフロント版）

### lint 警告: Context / hook / Provider のファイル分離（Fast Refresh）

- **症状**: oxlint が「Fast refresh only works when a file only exports components」
- **対応**: context.ts（createContext）/ AuthContext.tsx（Provider）/ useAuth.ts（hook）
  の3ファイルに分離。警告ゼロを維持（S1 で決めた「警告は出た時点で対処」の適用）

## スコープ調整の記録

計画どおり **詳細画面を S7 へ移動**（Try T-8 の適用）。S7 は
「詳細 + 作成・編集・削除フォーム」となる。プロダクトバックログの PBI-13 を分割更新した。

## DoD 判定

| DoD 項目 | 判定 |
|---|---|
| 実装とテストがローカル緑 | ✅ フロント 11 passed / バックエンド 55 passed / lint 警告ゼロ |
| CI 緑でマージ | ✅ PR #6 |
| マージ後の main で動作確認 | ✅（結果は下記に追記） |
| 教材ドキュメント追記 | ✅ dev-walkthrough（Step 6-1〜6-3）/ concepts（5概念）/ 本記録 |
| クローン直後の再現性 | ✅ 新規手順なし（npm install に react-router 等が含まれる） |

**判定: スプリントゴール達成。PBI-12 完了、PBI-13 は一覧分を完了（詳細は S7）。
US-01 / 02 / 04 のフロント編受け入れ条件を満たした（US-02 の JWT 移行は S8）。**

## マージ後の main での動作確認（マージ作業の一部）

2026-07-05、PR #6 のマージコミットを pull した main 上で実施
（S5 の学びどおり、**pull 直後に dev サーバを再起動してから**確認）:

- プロキシ越しのログイン → 200、「牛乳」検索 → total=2 ✅
- `npm test` → 11 passed ✅
