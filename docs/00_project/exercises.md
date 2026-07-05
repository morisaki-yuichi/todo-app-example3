# 演習編（exercises）

「考えて書く → 模範解答（折りたたみ）と解説で答え合わせ」の演習集です。

- **写経前ドリル（1〜3）**: このリポジトリに依存しない、言語・ライブラリの基礎ドリル。
  [キャッチアップ集](catch-up.md) を読んだ直後に取り組めます
- **写経後演習（4〜6）**: 完成したアプリに機能を足す演習。
  [開発トレースガイド](dev-walkthrough.md) を完走してから取り組んでください
- 答え合わせは模範解答が主です（テストを書くのは任意。書けたら加点）

---

## 写経前ドリル

### 演習1: Pydantic のバリデーションを予想する

次のスキーマに対し、(a)〜(c) の入力それぞれで「通る / 422」を予想し、
422 の場合は `detail[].loc` と `type` も予想してください。

```python
from pydantic import BaseModel, Field

class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    pages: int = Field(gt=0)
    isbn: str | None = None
```

- (a) `{"title": "本", "pages": 100}`
- (b) `{"title": "本", "pages": "たくさん"}`
- (c) `{"pages": 0, "isbn": null}`

<details>
<summary>模範解答と解説</summary>

- (a) **通る**。isbn は省略可（既定 None）
- (b) **422**。`loc: ["pages"]`（FastAPI 経由なら `["body", "pages"]`）、
  `type: "int_parsing"`。"100" のような数字文字列は int に変換されて通るが、
  変換不能な文字列は落ちる
- (c) **422 が2件**。`title` が `missing`、`pages` が `greater_than`（gt=0 違反）。
  Pydantic は**全フィールドを検証してからまとめて返す**ので、detail は配列になる。
  isbn の null は「省略可 + None 許容」なので問題ない

**解説**: 422 の detail が配列である理由（複数エラーの同時報告）と、
loc → type → msg の読み方は本編 S3 実験③で使う知識です。

</details>

### 演習2: 判別可能なユニオン型で3状態を表現する

「ユーザー取得画面」の状態を TypeScript の型で設計してください。
要件: ①読み込み中、②成功（User を持つ）、③失敗（メッセージを持つ）の3状態。
「読み込み中かつ失敗」のようなありえない状態が**型の上で作れない**こと。

```typescript
type User = { id: number; name: string }
// ここに State 型を書く
```

<details>
<summary>模範解答と解説</summary>

```typescript
type State =
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; message: string }
```

**解説**: `loading: boolean` と `error: string | null` を並べる設計だと、
`{loading: true, error: 'x'}` のような矛盾状態が作れてしまいます。
判別可能なユニオン（discriminated union）は `status` の値で型が絞り込まれ、
`state.status === 'success'` の分岐内でだけ `state.user` に触れます。
本編では S5 の Home、S6 の一覧で同じ設計を使います。

</details>

### 演習3: ページネーションの SQL を書く

`todos(id, title, created_at)` から「作成日時の新しい順に、3ページ目
（1ページ10件）」を取る SQL を書いてください。同時刻の行があっても
結果が揺れないようにすること。

<details>
<summary>模範解答と解説</summary>

```sql
SELECT id, title, created_at
FROM todos
ORDER BY created_at DESC, id DESC
OFFSET 20 LIMIT 10;
```

**解説**: ポイントは2つ。①OFFSET は「(ページ番号 - 1) × 件数」= 20。
②`id DESC` のタイブレーカー。created_at が同時刻の行の順序は SQL では不定なので、
一意な列で順序を固定しないと「ページをまたいで同じ行が2回出る / 出ない」という
再現しにくいバグ（テストのフレーク）になります。本編 S2 の設計判断そのものです。

</details>

---

## 写経後演習

### 演習4: 期限日ソートを API に追加する（バックエンド）

`GET /todos` に `sort=due_date` クエリパラメータを追加してください。
仕様: ①省略時は従来どおり created_at 降順、②`sort=due_date` で期限日の**昇順**
（近い順）、③期限なし（NULL）は**末尾**に回す、④不正な値は 422。

<details>
<summary>模範解答と解説</summary>

`app/routers/todos.py` の list_todos に追加:

```python
from typing import Literal
from sqlalchemy import nulls_last

def list_todos(
    ...,
    sort: Literal["created_at", "due_date"] = "created_at",
):
    ...
    if sort == "due_date":
        order = (nulls_last(col(Todo.due_date).asc()), col(Todo.id).asc())
    else:
        order = (col(Todo.created_at).desc(), col(Todo.id).desc())
    todos = session.exec(
        statement.order_by(*order).offset((page - 1) * per_page).limit(per_page)
    ).all()
```

**解説**: ①`Literal` 型にすると不正値の 422 が自動になる（if で弾かない）。
②PostgreSQL の既定では ASC のとき NULL が末尾に来るが、**明示の `nulls_last` が
意図を語る**（DBMS によって既定が違う）。③タイブレーカー（id）は忘れずに。
テストを書くなら「期限なしが末尾」「同日 の順序が安定」の2観点を。

</details>

### 演習5: 期限切れの TODO を目立たせる（フロントエンド）

一覧で「期限日が今日より前 かつ 未完了」の TODO に「期限切れ」バッジを
表示してください。CSS Modules でスタイルも当てること。

<details>
<summary>模範解答と解説</summary>

```tsx
// Todos.tsx（リスト描画内）
const isOverdue = (todo: Todo) =>
  !todo.completed &&
  todo.due_date !== null &&
  todo.due_date < new Date().toISOString().slice(0, 10)

{isOverdue(todo) && <span className={styles.badgeOverdue}>期限切れ</span>}
```

```css
/* Todos.module.css */
.badgeOverdue {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background-color: #ffe3e3;
  color: #ab091e;
}
```

**解説**: due_date は "YYYY-MM-DD" の文字列なので、**同じ形式の文字列同士なら
辞書順比較が日付順比較と一致**します（Date への変換はタイムゾーンの罠があるため、
日付だけの比較ならむしろ文字列比較が安全）。テストを書くなら「昨日 + 未完了 = 出る」
「昨日 + 完了 = 出ない」「今日 = 出ない」の境界3点を。

</details>

### 演習6: 削除確認をカスタムモーダルにする（フロントエンド・発展）

`window.confirm` を自作の確認モーダルコンポーネントに置き換えてください。
要件: ①「削除する / キャンセル」の2ボタン、②Escape キーでキャンセル、
③モーダル表示中は背面を操作できない、④既存の削除テストを書き換えて通す。

<details>
<summary>模範解答と解説（設計方針）</summary>

方針だけ示します（実装は自由度が高いため）:

```tsx
type ConfirmDialogProps = {
  message: string
  onConfirm: () => void
  onCancel: () => void
}
// <dialog> 要素 + showModal() を使うと ②③（Esc・モーダル化）を
// ブラウザが担ってくれる。自前 div で作る場合は role="dialog"、
// フォーカストラップ、Esc ハンドラを自分で書くことになる
```

呼び出し側（TodoDetail）は `const [confirming, setConfirming] = useState(false)` を
持ち、削除ボタンで true → モーダルの onConfirm で mutation 実行。

**解説**: テストは `vi.spyOn(window, 'confirm')` が不要になる代わりに、
「削除ボタン → モーダルが出る → 削除するボタン → deleteTodo が呼ばれる」という
**ユーザー操作の連鎖**を RTL で書くことになります。confirm 方式よりテストが
「見たままを検証する」形に近づく——UI 部品を自作する対価と対になる利点です。
E2E（e2e/todo-flow.spec.ts）の `page.once('dialog', ...)` も不要になるので
書き換えを忘れずに。

</details>

---

## さらに先へ（発展課題・答えなし）

- **OpenAPI からの型自動生成**: 手写しの `frontend/src/api/types.ts` を
  openapi-typescript 等の生成に置き換える（契約のズレを機械的に排除）
- **リフレッシュトークン**: アクセストークン15分 + リフレッシュトークンで
  「短命 JWT の不便」と「即時失効できない問題」の折衷を設計する
- **E2E の CI 組み込み**: GitHub Actions で DB + API + フロント + ブラウザを
  組み立てる（S10 で見送った理由を確認してから挑戦）
- **楽観的更新**: TanStack Query の onMutate / ロールバックで、トグルの
  体感速度を上げる（失敗時に巻き戻す責任とセットで）
