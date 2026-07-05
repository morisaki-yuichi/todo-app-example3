# キャッチアップ集（catch-up）

他のフレームワーク経験者が、写経を始める**前に**このスタックの土地勘をつけるための
対応表集です。本アプリのコードには依存しない自己完結の内容なので、
リポジトリをクローンする前でも読めます。各節末に理解確認クイズがあります
（答えは折りたたみ）。

対象: Rails / Laravel / Express / Django / Vue などの経験がある中級エンジニア。

---

## 1. FastAPI ↔ Express / Flask / Rails / Laravel

| やりたいこと | FastAPI | Express | Flask | Rails / Laravel |
|---|---|---|---|---|
| ルート定義 | `@app.get("/todos")` デコレータ | `app.get('/todos', fn)` | `@app.route(...)` | ルートファイル + コントローラ |
| パスパラメータ | `def get(todo_id: int)` **型で宣言** | `req.params.id`（文字列） | `<int:todo_id>` | パラメータ + 手動変換 |
| リクエスト検証 | Pydantic スキーマ（型 = 検証） | express-validator 等を後付け | marshmallow 等を後付け | FormRequest / strong parameters |
| 検証エラー応答 | **422 を自動生成** | 手書き | 手書き | フレームワークの規約 |
| API ドキュメント | **/docs を自動生成** | swagger-jsdoc 等を後付け | 後付け | 後付け |
| 依存の注入 | `Depends`（引数に書く） | ミドルウェア / 手動 | before_request / 手動 | コンテナ / サービスプロバイダ |

**一番の違い**: FastAPI は「型ヒントが仕様」。引数の型宣言がそのまま
バリデーション・変換・ドキュメントになる。Rails / Laravel の「規約優先」と違い、
FastAPI は最小のコアに必要な部品を**自分で選んで足す**（組み立て式）。

<details>
<summary>クイズ（3問・クリックで答え）</summary>

**Q1. FastAPI で `def get_todo(todo_id: int)` に `/todos/abc` が来たら何が起きる？**
A. Pydantic が変換に失敗し、422 が自動で返る（ハンドラは実行されない）。

**Q2. Express の `req.params.id` と FastAPI のパスパラメータの最大の違いは？**
A. Express は常に文字列で手動検証が要る。FastAPI は型宣言により検証・変換済みの値が届く。

**Q3. FastAPI の /docs は誰が書いている？**
A. 誰も書いていない。ルータの型情報から OpenAPI 仕様が自動生成され、Swagger UI が表示する。

</details>

---

## 2. SQLModel / SQLAlchemy ↔ ActiveRecord / Eloquent / Prisma

| やりたいこと | SQLModel | ActiveRecord (Rails) | Eloquent (Laravel) | Prisma |
|---|---|---|---|---|
| モデル定義 | Python クラス（型つき） | DB スキーマから自動推定 | クラス + マイグレーション | schema.prisma（独自 DSL） |
| 主キー取得 | `session.get(Todo, 1)` | `Todo.find(1)` | `Todo::find(1)` | `prisma.todo.findUnique` |
| 条件検索 | `select(Todo).where(Todo.done == True)` | `Todo.where(done: true)` | `Todo::where('done', true)` | `findMany({ where: ... })` |
| 保存 | `session.add(x)` → `session.commit()` | `x.save` | `$x->save()` | `create()` / `update()` |
| セッション/接続 | **明示的に Session を扱う** | 暗黙（クラスメソッド） | 暗黙 | クライアント経由 |

**一番の違い**: ActiveRecord / Eloquent は「モデルクラスが保存も検索も知っている」
（暗黙のグローバル接続）。SQLModel（SQLAlchemy）は **Session という作業単位を
明示的に持ち回る**。冗長に感じるが、トランザクション境界とテスト時の差し替え
（依存性注入）が構造的に扱いやすい。

<details>
<summary>クイズ（2問）</summary>

**Q1. ActiveRecord の `Todo.find(1)` に相当する SQLModel の書き方は？**
A. `session.get(Todo, 1)`。見つからないとき ActiveRecord は例外、SQLModel は None を返す点も違う。

**Q2. `session.add(todo)` しただけでは DB に何も起きないことがある。なぜ？**
A. add はセッション（作業単位）への登録で、SQL の発行と確定は commit 時。
トランザクションの境界を人間が握るための設計。

</details>

---

## 3. Alembic ↔ Rails マイグレーション / Prisma Migrate

| やりたいこと | Alembic | Rails | Prisma |
|---|---|---|---|
| マイグレーション生成 | `alembic revision --autogenerate` | `rails g migration` | `prisma migrate dev` |
| 差分の検出元 | **モデル（メタデータ）と実 DB の比較** | 手書き（生成はガワのみ） | schema.prisma と実 DB |
| 適用 | `alembic upgrade head` | `rails db:migrate` | `migrate deploy` |
| 巻き戻し | `alembic downgrade -1` | `rails db:rollback` | 基本サポートなし（前方修正） |
| 適用状態の記録 | `alembic_version` テーブル | `schema_migrations` テーブル | `_prisma_migrations` テーブル |

**注意点**: autogenerate は「提案」。データが入ったテーブルへの NOT NULL 追加のような
**データ移行は検出できない**ため、人間が3段階（nullable 追加 → 埋める → 締める）に
書き換える必要がある（本教材 S4 の山場）。

<details>
<summary>クイズ（2問）</summary>

**Q1. Rails 経験者が Alembic で一番戸惑う「Target database is not up to date」とは？**
A. 未適用のリビジョンがある状態で autogenerate しようとした、の意味。
Alembic は「現在の DB」と「モデル」の差分を計算するため、DB が最新でないと拒否する。

**Q2. `--autogenerate` が生成したファイルをそのまま適用してはいけない典型例は？**
A. 既存データのあるテーブルへの NOT NULL カラム追加（既存行を埋める手段がなく失敗する）。
インデックスや制約名の欠落もある。生成物は必ず目視レビューする。

</details>

---

## 4. React ↔ Vue

| やりたいこと | React | Vue（Composition API） |
|---|---|---|
| 状態 | `const [x, setX] = useState(0)` | `const x = ref(0)` |
| 状態の更新 | `setX(1)`（再代入は無効） | `x.value = 1` |
| 算出値 | 毎レンダリングで計算 / `useMemo` | `computed()` |
| 副作用 | `useEffect(fn, [deps])` **依存は手書き** | `watchEffect`（依存は自動追跡） |
| 入力フォーム | `value` + `onChange`（制御コンポーネント） | `v-model`（糖衣構文） |
| 条件・繰り返し | JS の式（`&&`・`map`） | ディレクティブ（`v-if`・`v-for`） |
| テンプレート | JSX（JS の中に HTML） | SFC（HTML の中に JS） |

**一番の違い**: Vue はリアクティビティ（依存の自動追跡）をフレームワークが担う。
React は「状態が変わったら関数を丸ごと再実行する」だけの素朴なモデルで、
その分 **useEffect の依存配列を人間が正しく書く責任**が生じる
（書き漏らすと「変えたのに画面が変わらない」— 本教材 S6 の実験⑦）。

<details>
<summary>クイズ（3問）</summary>

**Q1. Vue の `v-model="title"` を React で書くと？**
A. `<input value={title} onChange={(e) => setTitle(e.target.value)} />`（制御コンポーネント）。

**Q2. React の関数コンポーネントは再レンダリングのたびに何が起きる？**
A. 関数全体が再実行される。ローカル変数は毎回作り直され、state（useState）だけが
レンダリングをまたいで保持される。

**Q3. `useEffect(fn, [])` の空配列の意味と、Vue との違いは？**
A. 「依存なし = 初回マウント時のみ実行」。Vue の watchEffect は使った値を
自動追跡するので、この「依存の書き漏らし」というバグの類型自体が存在しない。

</details>

---

## 5. ツールまわり（uv / npm / pytest / Vitest）

| 役割 | Python 側 | JS 側 | 他言語の類似 |
|---|---|---|---|
| パッケージ管理 | uv（pyproject.toml） | npm（package.json） | bundler / composer |
| ロックファイル | uv.lock | package-lock.json | Gemfile.lock / composer.lock |
| ロック厳守の復元 | `uv sync --locked` | `npm ci` | `bundle install --frozen` |
| 実行ラッパ | `uv run <cmd>` | `npx <cmd>` / npm scripts | `bundle exec` |
| テスト | pytest（fixture が特徴） | Vitest（Jest 互換 API） | RSpec / PHPUnit |
| テストの前処理 | fixture（引数に書くと注入される） | beforeEach / setupFiles | let / setUp |

**共通原則**: 「欲しい範囲」（pyproject / package.json）と「実際に入った版」（lock）を
分けて管理し、**lock をコミットして CI では厳守モードで復元する**。
これで「自分のマシンでは動く」問題の大半が消える。

<details>
<summary>クイズ（2問）</summary>

**Q1. CI で `npm install` でなく `npm ci` を使う理由は？**
A. lock と完全一致でインストールし、不一致なら失敗するため、
「lock のコミット忘れ」や環境ごとの版ズレを機械的に検出できる。

**Q2. pytest の fixture が Jest の beforeEach と違う点は？**
A. テスト関数の**引数に書いたものだけ**が注入される（必要な前処理を選んで使う）。
fixture 同士も依存し合え、スコープ（テスト単位・セッション単位）を選べる。

</details>

---

## 次の一歩

土地勘がついたら [開発トレースガイド](dev-walkthrough.md) の Step 1-1 から
写経を始めてください。概念の深掘りは [概念解説集](concepts.md) にあります。
写経を終えたら [演習編](exercises.md) へ。
