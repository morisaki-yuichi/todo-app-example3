# 概念解説集（concepts）

開発中に登場した概念を、登場順に「①一言定義 → ②なぜ必要か（攻撃例・事故例つき）→
③このリポジトリでの実例」の3点セットでまとめる。
[開発トレースガイド](dev-walkthrough.md) から都度リンクされる。

---

## スプリント1で登場した概念

### コンテナとイメージ

**① 一言定義**: イメージは「アプリと実行環境一式を焼き固めた雛形」、
コンテナは「イメージから起動した実行中のプロセス」。クラスとインスタンスの関係に近い。

**② なぜ必要か**: 「自分のマシンでは動くのに、他人のマシンや本番で動かない」事故を防ぐ。
原因の大半は OS・ランタイム・ライブラリの版差で、コンテナはそれらを丸ごと持ち運ぶことで
差を消す。教材の文脈では「写経者の環境で同じように動く」再現性の要。

**③ 実例**: [backend/Dockerfile](../../backend/Dockerfile)（イメージの作り方）と
[compose.yaml](../../compose.yaml)（起動の仕方）。
→ [Step 1-3](dev-walkthrough.md#step-1-3-docker-compose-構成api--db)

### Docker Compose

**① 一言定義**: 複数コンテナ（本アプリでは api と db）の構成を YAML 1枚で宣言し、
`docker compose up` 一発で起動する道具。

**② なぜ必要か**: `docker run` の長いオプションを人間が毎回打つと、打ち間違いや
「あの人だけオプションが違う」事故が起きる。構成をファイルにしてコミットすれば、
起動手順そのものがレビュー・バージョン管理の対象になる。

**③ 実例**: [compose.yaml](../../compose.yaml)。サービス名 `api` / `db` で定義している。
（サービス名で相互に通信できる「名前解決」は、S2 で DB 接続する際に登場する）

### ポートマッピング

**① 一言定義**: `ホスト側ポート:コンテナ側ポート` の対応づけ。コンテナの閉じた
ネットワークに、ホストから届く「穴」を開ける設定。

**② なぜ必要か**: コンテナはホストとは別のネットワーク空間にいるため、
マッピングなしではホストのブラウザや curl から一切届かない。
「アプリは正常に起動している（ログにエラーなし）のに接続できない」という、
アプリのログを何時間眺めても解けない事故の典型原因。

**③ 実例**: [compose.yaml](../../compose.yaml) の `"${API_PORT:-8002}:8000"`。
コンテナ内は 8000 固定、衝突しうるホスト側だけを `.env` で変える設計。
わざと外して connection refused を観察する実験①も参照
→ [S1 レビュー記録](../01_sprint1/review.md#実験)

### ボリューム

**① 一言定義**: コンテナの外にデータを置く仕組み。コンテナを消しても消えない置き場
（名前つきボリューム）や、ホストのディレクトリをコンテナに重ねる口（バインドマウント）。

**② なぜ必要か**: コンテナ内のファイルはコンテナ削除で消える。DB のデータを
コンテナ内に置いたまま `docker compose down` すると **全データ消失** という事故になる。
逆に開発中のソースコードは、ホストで編集した内容が即コンテナに反映されてほしい。

**③ 実例**: [compose.yaml](../../compose.yaml) に3種類が同居している。
`db_data:/var/lib/postgresql/data`（DB 永続化）、`./backend:/app`（ソースの
バインドマウント + `--reload`）、`/app/.venv`（イメージ内の仮想環境をホストの
`.venv` で隠さないための匿名ボリューム）。

### 仮想環境

**① 一言定義**: プロジェクトごとに独立した Python パッケージの置き場（`.venv/`）。

**② なぜ必要か**: マシン全体で1つのパッケージ置き場を共有すると、プロジェクト A の
ために上げたライブラリがプロジェクト B を壊す（依存地獄）。プロジェクト単位で隔離すれば
影響範囲が閉じる。

**③ 実例**: `backend/.venv/`。uv が自動管理するため、手で `python -m venv` や
`source activate` を打つ場面はない（`uv run` が常に正しい venv で実行してくれる）。
`.venv/` は [.gitignore](../../.gitignore) で除外している（再生成できるものは履歴に入れない）。

### ロックファイル

**① 一言定義**: 依存ライブラリの「実際に解決された正確なバージョン一覧」を
記録したファイル（`uv.lock`）。

**② なぜ必要か**: `pyproject.toml` の `fastapi>=0.139.0` は範囲指定なので、
インストール時期によって入る版が変わる。「先週クローンした人は動くのに、
今日クローンした人は動かない」という再現性の事故は、たいてい依存の版ズレが原因。
ロックファイルをコミットすれば、全員・CI・本番が同じ版で揃う。

**③ 実例**: [backend/uv.lock](../../backend/uv.lock)。復元は `uv sync --locked`
（lock と定義が食い違っていれば失敗してくれるので、コミット忘れも検出できる）。
[Dockerfile](../../backend/Dockerfile) と [CI](../../.github/workflows/ci.yml) の
両方でこのコマンドを使っている。

### uv

**① 一言定義**: Python の依存管理・仮想環境・Python 本体の導入までを1つで担う高速ツール。

**② なぜ必要か**: 従来は pip + venv + pyenv + …と道具を組み合わせる必要があり、
「どの python で・どの venv に・何を入れたか」がずれる事故が頻発した。
uv は `uv run` / `uv add` / `uv sync` に集約し、常にロックファイルと整合する状態を保つ。

**③ 実例**: 本プロジェクトのコマンドはすべて `uv run uvicorn ...` / `uv run pytest` /
`uv add ...` / `uv sync --locked` の形で統一
→ [Step 1-2](dev-walkthrough.md#step-1-2-fastapi-アプリの雛形とヘルスチェック-api)

### 型ヒント

**① 一言定義**: Python の変数・引数・戻り値に型を注記する構文（`-> dict[str, str]`）。

**② なぜ必要か**: 実行するまで型の誤りに気づけないのが動的言語の弱点で、
「本番で初めて `NoneType has no attribute ...` が出る」事故につながる。
型ヒントがあればエディタと CI が実行前に検出できる。さらに FastAPI では型ヒントが
**実行時の仕様**（バリデーション・ドキュメント）としても機能する。

**③ 実例**: [backend/app/main.py](../../backend/app/main.py) の
`def health() -> dict[str, str]:`。この型がそのまま OpenAPI のレスポンススキーマになる。

### OpenAPI 自動生成

**① 一言定義**: API の仕様（パス・パラメータ・スキーマ）を機械可読な JSON で表現する
標準規格 OpenAPI を、FastAPI がコードの型情報から自動生成する仕組み。

**② なぜ必要か**: 手書きの API 仕様書は実装とずれていく（更新漏れ）。
「仕様書には due_date があるのに実装は dueDate」のような食い違いは、
フロントとバックの結合時に時間を溶かす典型事故。コードから生成すれば原理的にずれない。
第2部では、この OpenAPI を TypeScript の型との突き合わせにも使う。

**③ 実例**: `http://localhost:8002/docs`（Swagger UI）と
`http://localhost:8002/openapi.json`。設定は一切書いていない
→ [Step 1-2 の動作確認](dev-walkthrough.md#step-1-2-fastapi-アプリの雛形とヘルスチェック-api)

### async/await（入口だけ）

**① 一言定義**: 「待ち時間（DB 応答・外部 API など）に他の仕事を進める」ための
Python の非同期構文。FastAPI が高速と言われる理由の中核。

**② なぜ必要か**: Web サーバの仕事の大半は「待ち」で、同期処理では待ちの間
ワーカーが1リクエストを占有する。非同期なら1プロセスで多数のリクエストを
さばける。ただし同期・非同期の混在は「イベントループを塞ぐ」事故を生むため、
仕組みの理解が必要（S2 で DB アクセスを書くときに本格的に扱う）。

**③ 実例**: 現時点の `/health` は同期関数（`def`）。FastAPI は同期関数も
スレッドプールで捌いてくれるため、まず動くものを書き、非同期化は必要になった時点で行う。

---

## スプリント2で登場した概念

### SQLModel

**① 一言定義**: SQLAlchemy（ORM）と Pydantic（バリデーション）を1つのクラス定義に
統合したライブラリ。`table=True` のクラスは DB テーブルであり、同時に Pydantic モデル。

**② なぜ必要か**: ORM 用・API 用でモデル定義が二重化すると、片方だけ変えて
ずれる事故が起きる（DB には入るのに API で返らない項目、など）。定義を一元化しつつ、
見せる形は別スキーマ（`TodoRead`）で制御する、が本リポジトリの使い分け。

**③ 実例**: [backend/app/models.py](../../backend/app/models.py) の `Todo`
（テーブル定義）と [backend/app/schemas.py](../../backend/app/schemas.py) の
`TodoRead`（レスポンス用・`table=True` なし）
→ [Step 2-3](dev-walkthrough.md#step-2-3-todo-モデルと初期マイグレーション)

### マイグレーション（Alembic）

**① 一言定義**: DB スキーマの変更を「実行可能なコード（up/down のペア）」として
履歴管理する仕組み。Alembic はその Python 実装。

**② なぜ必要か**: スキーマを手作業の SQL で変えると「誰かの環境だけテーブル定義が
違う」状態になり、再現も巻き戻しもできない。特に**既にデータが入っている本番テーブル**の
変更は、手順をコード化してステージングで試してからでないと事故になる（S4 で実演予定）。

**③ 実例**: [backend/migrations/](../../backend/migrations/)。
`uv run alembic revision --autogenerate` で生成し、**必ず目視レビューしてから**
`uv run alembic upgrade head`。autogenerate は万能ではない（検出できない変更がある）
ため「提案」として扱う。診断は `alembic current`（DB 側）と `alembic heads`（コード側）の
見比べが基本 → [実験②](../02_sprint2/review.md#実験)

### 依存性注入（Depends）

**① 一言定義**: 関数が必要とする部品（DB セッション等）を、関数の中で作らず
「外から渡してもらう」仕組み。FastAPI では引数の型宣言（`Depends`）で表現する。

**② なぜ必要か**: ルータの中で直接 DB 接続を作ると、テスト時に本物の接続先に
つながってしまい、差し替える手段がない。「開発 DB に対してテストを走らせて
全データを消した」は実際に起きる事故。注入にしておけばテストで丸ごと差し替えられる。

**③ 実例**: [backend/app/db.py](../../backend/app/db.py) の `get_session` と、
[backend/tests/conftest.py](../../backend/tests/conftest.py) の
`app.dependency_overrides[get_session]`（テスト用 DB への差し替え）
→ [Step 2-4](dev-walkthrough.md#step-2-4-テスト用-db-基盤)

### サービス名での名前解決

**① 一言定義**: Docker Compose が、サービス名（`db` 等）をコンテナの IP に解決する
内部 DNS を提供する仕組み。

**② なぜ必要か**: コンテナの IP は起動のたびに変わりうるため、IP 直書きは壊れる。
また「ホストから見た接続先（localhost:5433）」と「コンテナから見た接続先（db:5432）」は
**別物**で、これを混同すると `could not translate host name` や connection refused に
なる（接続エラー調査でまず確認すべき点）。

**③ 実例**: [compose.yaml](../../compose.yaml) の `DB_HOST: db` と、
[backend/app/config.py](../../backend/app/config.py) の既定値 `localhost:5433` の対比
→ [Step 2-1](dev-walkthrough.md#step-2-1-db-接続基盤設定エンジンセッション依存)

### 設定の環境変数駆動（pydantic-settings）

**① 一言定義**: 接続先・認証情報などの「環境で変わる値」を、コードでなく
環境変数・`.env` から読む方式。pydantic-settings は型つきでそれを行う。

**② なぜ必要か**: DB パスワードをコードに直書きすると、公開リポジトリでは漏えい事故に
なる。また環境ごと（開発/CI/本番）に値を変えるたびコードを書き換えるのは事故のもと。
「コードは同じ・値だけ差し替え」が原則（Twelve-Factor App の考え方）。

**③ 実例**: [backend/app/config.py](../../backend/app/config.py)。
優先順位は「環境変数 > ルート .env > クラスの既定値」で、コンテナ内は compose が
`DB_HOST=db` を注入して上書きする。

### テスト用 DB とテストの独立性

**① 一言定義**: テストは開発用と別の DB（todo_test）に対して行い、
各テストの前後でテーブルを作り直して「他のテストの残骸」を持ち込まない方針。

**② なぜ必要か**: 開発 DB でテストすると、テストの洗い替えで開発データが消える。
またテストが順序に依存する（前のテストのデータ前提）と、1本だけ実行すると落ちる・
並列化で落ちるなど、信頼できないテストになる。

**③ 実例**: [backend/tests/conftest.py](../../backend/tests/conftest.py)
（`todo_test` の自動作成・テストごとの create_all/drop_all・セッション差し替え）。
SQLite で代用せず**実 Postgres**を使う理由は方言差の回避
→ [Step 2-4](dev-walkthrough.md#step-2-4-テスト用-db-基盤)

---

## スプリント3で登場した概念

### Pydantic バリデーションと 422

**① 一言定義**: リクエストの型・制約（必須・文字数・形式）をスキーマに宣言しておくと、
違反時に FastAPI が **422 Unprocessable Entity** と構造化されたエラーを自動生成する仕組み。

**② なぜ必要か**: 入力チェックを手書きすると、漏れた1箇所が事故になる
（title 101 文字で DB エラー 500、最悪は不正入力がそのまま保存される）。
宣言的に書けばチェック・エラー応答・`/docs` への制約表示が常に一致する。

**③ 実例**: [backend/app/schemas.py](../../backend/app/schemas.py) の
`TodoCreate`（`Field(min_length=1, max_length=100)`）。
422 の `detail` の読み方は **loc（どこが）→ type（なぜ）→ msg（説明）→ input（受け取った値）**
→ [実験③](../03_sprint3/review.md#実験)。
ルータ関数は実行前に止まるので、DB には何も書かれない。

### リクエスト / レスポンススキーマの分離

**① 一言定義**: 「受け取る形（TodoCreate / TodoUpdate）」「見せる形（TodoRead)」
「保存する形（Todo, table=True）」を別のクラスにする設計。

**② なぜ必要か**: テーブルモデルで直接受けると、①クライアントが `id` や
`created_at` を指定できてしまう（改ざんの入り口）、②**table=True の SQLModel は
Pydantic バリデーションを実行しない**ため max_length 等が素通りする、という
2つの事故が起きる。S4 で `user_id` を足すときも、受け口に無ければ
「他人の所有者を指定して作る」攻撃は構造的に不可能になる。

**③ 実例**: [backend/app/schemas.py](../../backend/app/schemas.py)（受ける形・見せる形）と
[backend/app/models.py](../../backend/app/models.py)（保存する形）、
詰め替えは [backend/app/routers/todos.py](../../backend/app/routers/todos.py) の
`Todo.model_validate(data)`
→ [Step 3-1](dev-walkthrough.md#step-3-1-todo-作成-api)

### PATCH と部分更新

**① 一言定義**: PATCH は「送られた項目だけを更新する」HTTP メソッド。
PUT（全項目で置き換え）と違い、変更したい項目だけを送れる。

**② なぜ必要か**: 全置換方式では、クライアントが最新の全項目を知らないと
「送り忘れた項目が消える」事故が起きる（古い画面から保存したら説明欄が空になった、等）。
部分更新では「**送らない = 変更しない**」と「**null を送る = 消す**」の区別が本質で、
これを取り違えた実装（`exclude_unset` 漏れ）は未送信項目を null で潰す。

**③ 実例**: [backend/app/routers/todos.py](../../backend/app/routers/todos.py) の
`update_todo`（`model_dump(exclude_unset=True)` + `sqlmodel_update`）。
title だけ null を拒否する field_validator は
[backend/app/schemas.py](../../backend/app/schemas.py) の `TodoUpdate`
→ [Step 3-2](dev-walkthrough.md#step-3-2-todo-編集-apipatch)

### ステータスコード 201 / 204

**① 一言定義**: 201 Created は「作成に成功し、作られたものを返す」。
204 No Content は「成功したが、返す本文はない」。どちらも 200 の親戚だが意味が違う。

**② なぜ必要か**: 何でも 200 で返す API は、クライアントが「作成されたのか・
更新されたのか・本文を読むべきか」を本文の中身から推測することになり、
自動処理（フロントの分岐・監視・リトライ判断）が壊れやすくなる。
ステータスコードは機械が読む「結果の要約」。

**③ 実例**: `POST /todos` は `status_code=201`、`DELETE /todos/{id}` は
`status_code=204`（ハンドラは何も return しない）
→ [backend/app/routers/todos.py](../../backend/app/routers/todos.py)。
本リポジトリの使い分け一覧: 200（取得・更新）/ 201（作成）/ 204（削除）/
401・403（S4 で登場）/ 404（無いもの）/ 422（入力不正）

---

## スプリント4で登場した概念

### 認証と認可（401 vs 403）

**① 一言定義**: 認証（authentication）は「あなたは誰か」の確認 = 失敗は **401**。
認可（authorization）は「その人に権限があるか」の判定 = 拒否は **403**。

**② なぜ必要か**: 混同すると「ログインさえすれば他人のデータも見える」API ができる。
実際、認可チェックを1箇所書き忘れるだけで他人の TODO が丸ごと読める
（実験⑤で実演。**書き忘れても何の警告も出ない**のが認可の怖さ）。
IDOR（他人のリソース ID を直叩きする攻撃）は Web の脆弱性ランキング常連。

**③ 実例**: 401 は [app/deps.py](../../backend/app/deps.py) の `get_current_user` に集約、
403 は [app/routers/todos.py](../../backend/app/routers/todos.py) の `get_owned_todo`。
「本人はできる／他人は 403」の**ペアテスト**は
[tests/test_todos_authz.py](../../backend/tests/test_todos_authz.py)
→ [Step 4-3](dev-walkthrough.md#step-4-3-認可の導入と既存データのマイグレーション山場)

### パスワードハッシュ

**① 一言定義**: パスワードを元に戻せない値に変換して保存する仕組み。
bcrypt は「わざと遅い」ハッシュで、ソルト（ランダム値）を内蔵する。

**② なぜ必要か**: 平文保存の DB が漏えいすると全ユーザーのパスワードがそのまま流出する
（他サイトの使い回しまで芋づる式に）。高速なハッシュ（SHA-256 等）でも総当たりが現実的に
なってしまうため、**わざと遅い** bcrypt を使う。ソルトがないと「同じパスワード = 同じハッシュ」
になり、レインボーテーブル（事前計算表）で一括解読される。

**③ 実例**: [app/security.py](../../backend/app/security.py)。
「同じ入力でも毎回違うハッシュ」のテストは
[tests/test_security.py](../../backend/tests/test_security.py)。
当初案の passlib ではなく bcrypt を直接使う判断は [QAログ](qa-log.md) に記録。

### cookie セッション

**① 一言定義**: ログイン時にサーバがセッション（実体は DB の1行）を作り、
その識別トークンだけを cookie でブラウザに渡す「ステートフル」な認証方式。

**② なぜ必要か**: HTTP はステートレスで、リクエストごとに「誰か」を証明する必要がある。
毎回パスワードを送るのは論外（漏えい面が増える）。セッション方式の強みは
**サーバ側で行を消せば即時無効化できる**こと（盗まれた疑いのあるトークンを即殺せる）。
cookie の属性も重要: `httpOnly`（XSS で JS から盗めない）、`SameSite=Lax`（他サイト起点の
送信を制限 = CSRF の軽減）、本番では `Secure`（HTTPS のみ）。

**③ 実例**: [app/models.py](../../backend/app/models.py) の `UserSession` と
[app/routers/auth.py](../../backend/app/routers/auth.py) の `_start_session` / `logout`。
S8 で JWT（ステートレス・即時失効が苦手）に移行して両者を対比する予定
→ [Step 4-2](dev-walkthrough.md#step-4-2-認証-apiregister--login--logout--me)

### 既存データのマイグレーション

**① 一言定義**: スキーマ変更のうち、既に入っているデータの変換・埋め戻しを伴うもの。
「① nullable で追加 → ② データを埋める → ③ 制約を締める」の3段階が定石。

**② なぜ必要か**: 空のテーブルなら通る変更が、データが入った稼働中テーブルでは失敗する
（NOT NULL 列の一発追加は NotNullViolation。実験④で実演）。本番でこれを踏むと
デプロイが即失敗し、最悪はメンテ不能になる。autogenerate はデータのことを何も知らないため、
**データ移行は必ず人間が書く**。

**③ 実例**:
[migrations/versions/2a3cf6848388_add_user_id_to_todos.py](../../backend/migrations/versions/2a3cf6848388_add_user_id_to_todos.py)
（引き取りユーザー legacy@example.com への割り当てを含む3段階）。
CI での up/down 往復検証は [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
→ [Step 4-3](dev-walkthrough.md#step-4-3-認可の導入と既存データのマイグレーション山場)

---

# 第2部 フロント編

## スプリント5で登場した概念

### SPA と Vite 開発サーバ

**① 一言定義**: SPA（Single Page Application）は、HTML を1枚だけ受け取り、
以降の画面はブラウザ内の JavaScript が組み立てる方式。Vite はその開発サーバ +
ビルドツールで、変更を瞬時に反映する HMR（Hot Module Replacement）を持つ。

**② なぜ必要か**: 姉妹プロジェクト（Laravel）はサーバが画面を組み立てて返す方式
だった。SPA は画面遷移のたびにページ全体を作り直さないため操作感が良い一方、
「データ取得・ローディング・エラー・認証状態」をすべて**ブラウザ側で自前管理**する
必要がある——第2部で学ぶのは、まさにこの自前管理の作法。

**③ 実例**: `npm run dev`（開発サーバ）と `npm run build`（本番ビルド）。
未知のパスに index.html を返す SPA フォールバックの挙動は
[実験⑥](../05_sprint5/review.md#実験) で観察した
→ [Step 5-1](dev-walkthrough.md#step-5-1-vite-で-react--typescript-の雛形を生成)

### npm とロックファイル

**① 一言定義**: npm は Node.js のパッケージ管理。`package.json` が「欲しい範囲」、
`package-lock.json` が「実際に解決された正確な版」を記録する。

**② なぜ必要か**: バックエンドの uv / uv.lock とまったく同じ理屈
（→ [ロックファイル](#ロックファイル)）。CI では `npm install` ではなく
**`npm ci`**（ロックと完全一致で入れ、不一致なら失敗）を使うことで、
「ロックのコミット忘れ」も機械検出できる。

**③ 実例**: [frontend/package-lock.json](../../frontend/package-lock.json) と
[CI の frontend-test ジョブ](../../.github/workflows/ci.yml)
→ [Step 5-4](dev-walkthrough.md#step-5-4-vitest--react-testing-library-と-ci)

### コンポーネントと JSX

**① 一言定義**: コンポーネントは「見た目とその振る舞いを1つにした再利用可能な部品」
（実体は JSX を返す関数）。JSX は JavaScript の中に HTML 風の記法を書ける構文拡張。

**② なぜ必要か**: 素の DOM 操作（`document.getElementById(...).innerHTML = ...`）は、
「データの変化」と「画面の更新」の対応を人間が手で保つ必要があり、
規模が増えると即座に破綻する（更新漏れ・二重更新）。React は
「状態 → 見た目」の変換を関数として書き、更新は React が計算する宣言的モデル。

**③ 実例**: [frontend/src/pages/Home.tsx](../../frontend/src/pages/Home.tsx)。
`HealthState`（判別可能なユニオン型）が「ありえない状態を型で排除する」実例
→ [Step 5-3](dev-walkthrough.md#step-5-3-ルーティングと-home-画面画面1枚)

### CSS Modules

**① 一言定義**: `*.module.css` のクラス名をビルド時に一意な名前へ変換し、
コンポーネント単位でスタイルをスコープする仕組み（Vite 標準機能）。

**② なぜ必要か**: グローバルな CSS はクラス名が全ファイルで衝突しうる。
「他人の `.header` を上書きして別ページが崩れた」は大規模 CSS の定番事故。
CSS フレームワークを使わない本教材では、素の CSS を安全に書く器として使う。

**③ 実例**: [frontend/src/App.module.css](../../frontend/src/App.module.css) と
`import styles from './App.module.css'` → `className={styles.header}`。
ファイル名が `.module.css` でないと**ただのグローバル CSS になる**（ハマりどころ）。

### Vite プロキシと同一オリジン

**① 一言定義**: オリジン = スキーム + ホスト + ポートの組。ブラウザは
別オリジンへの JS からのリクエストを制限する（同一オリジンポリシー）。
Vite プロキシは開発サーバに API を中継させ、ブラウザから見た通信を同一オリジンに保つ。

**② なぜ必要か**: フロント（5176）と API（8002）はポートが違うだけで**別オリジン**。
直接 fetch すると CORS 制限に当たる。プロキシ方式なら CORS 設定なしで開発を始められ、
cookie も同一オリジンとして素直に送られる。「なぜ制限があるのか（悪意あるサイトが
あなたのログイン済み cookie で銀行 API を叩く攻撃の防止）」を含め、
S8 でプロキシを外して CORS を正面から扱う。

**③ 実例**: [frontend/vite.config.ts](../../frontend/vite.config.ts) の
`proxy: { '/api': ... }`。プロキシ漏れの症状（200 + HTML → JSON パースエラー）は
[実験⑥](../05_sprint5/review.md#実験)
→ [Step 5-2](dev-walkthrough.md#step-5-2-vite-プロキシと-env-駆動のポート設定)

---

## スプリント6で登場した概念

### useEffect と依存配列

**① 一言定義**: useEffect はレンダリングの外側の仕事（データ取得など）を書く場所。
依存配列は「この値が変わったら再実行する」の宣言で、クリーンアップ関数は
「次の実行やアンマウントの前に呼ばれる後始末」。

**② なぜ必要か**: 依存配列を書き漏らすと、**エラーも警告も出さずに「変えたのに
画面が変わらない」バグ**になる（実験⑦で実演。stale closure = 古い値を掴んだ関数）。
逆に依存に「毎回新しく作られる値」を入れると無限ループになる。
また React の StrictMode は開発時に effect を**意図的に2回**実行する
（後始末を書き忘れた effect をあぶり出すため）。cancelled フラグ + クリーンアップが
「古い実行の結果を捨てる」定石。

**③ 実例**: [frontend/src/pages/Todos.tsx](../../frontend/src/pages/Todos.tsx) の
`useEffect(..., [page, filter, query])`。依存漏れはテストと lint（oxlint の
react-hooks ルール）の2つの網で検出できることを [実験⑦](../06_sprint6/review.md#実験)
で確認した。

### React Context

**① 一言定義**: コンポーネントツリーの離れた場所同士で値を共有する仕組み。
Provider が配り、useContext（を包んだカスタム hook）が受け取る。

**② なぜ必要か**: 認証状態のような「全員が知りたい値」を props で渡すと、
間にいる全コンポーネントが自分に関係ない値を中継する（バケツリレー）ことになり、
構造の変更に弱い。一方、なんでも Context に入れると依存が見えなくなるため、
「アプリ全体で1つ」の状態（認証・テーマ等）に限って使うのが目安。

**③ 実例**: [frontend/src/auth/](../../frontend/src/auth/)（context / Provider / hook の
3ファイル構成。Fast Refresh の制約でファイルを分ける、という実務的な理由も含めて実例）。
起動時に `/auth/me` で cookie セッションから状態を復元する。

### リスト描画と key

**① 一言定義**: 配列を JSX に描画するとき、各要素に付ける「どの行がどの行か」を
React に教える一意な目印。

**② なぜ必要か**: key がない・配列 index を key にすると、並び替えや削除のとき
React が行の対応を取り違え、**「削除したのに別の行の入力値が消える」**ような
不可解なバグになる（フォームを含む行で特に危険）。安定した id を使えば、
React は差分だけを正しく更新できる。

**③ 実例**: [frontend/src/pages/Todos.tsx](../../frontend/src/pages/Todos.tsx) の
`<li key={todo.id}>`。key を消すと console に警告が出る（S7 のフォーム行で
index-key の実害をより具体的に扱う）。

### データ取得の3状態パターン

**① 一言定義**: 非同期取得の画面は最低でも「ローディング / エラー / 成功（+空）」の
3状態を持つ、という設計の型。判別可能なユニオン型で表現する。

**② なぜ必要か**: 成功時の画面だけ作ると、「白い画面のまま固まる」（ローディング
表示なし）「失敗したのに古いデータが出続ける」（エラー表示なし）という UX 事故になる。
そして素の fetch + useEffect でこれを毎画面手書きすると、キャンセル・再取得・
キャッシュまで全部自前——**この大変さの体験が S9（TanStack Query）の伏線**。

**③ 実例**: [frontend/src/pages/Todos.tsx](../../frontend/src/pages/Todos.tsx) の
`ListState` と、[Home.tsx](../../frontend/src/pages/Home.tsx) の `HealthState`。
テストは3状態それぞれを検証する（[Todos.test.tsx](../../frontend/src/pages/Todos.test.tsx)）。

### TypeScript による API との契約

**① 一言定義**: バックエンドのレスポンススキーマをフロントの型として写し、
API の形をコンパイラに検査させること。

**② なぜ必要か**: 「バックは due_date、フロントは dueDate と書いていた」のような
食い違いは、実行して初めて undefined として現れる（そして静かに画面が空になる）。
型に写しておけば、プロパティ名のタイポや null の扱い漏れをビルド時に検出できる。
ただし**手写しの型は古びる**——確認先は常に `/openapi.json`（FastAPI が型から自動生成
した仕様書）で、型の自動生成ツールへの発展は演習編で扱う。

**③ 実例**: [frontend/src/api/types.ts](../../frontend/src/api/types.ts)
（snake_case のまま写し、変換層を挟まない設計判断もコメントで明記）。

---

## スプリント7で登場した概念

### 制御コンポーネントとフォーム

**① 一言定義**: input の値を React の state で管理し（`value` + `onChange`）、
「state が唯一の真実、input はその表示」にするフォームの書き方。

**② なぜ必要か**: DOM に値を持たせたまま（非制御）だと、「入力値を使ったボタンの
活性制御」「送信後のクリア」「サーバエラー時の値保持」のたびに DOM を読みに行く
ことになり、React の「状態 → 見た目」モデルから外れて壊れやすくなる。
制御にすれば検証・変換・初期値の差し込み（編集画面）がすべて state 操作で完結する。

**③ 実例**: [frontend/src/components/TodoForm.tsx](../../frontend/src/components/TodoForm.tsx)。
作成（初期値なし）と編集（initial あり）で同じ部品を使う。
サーバの 422 は `loc` でフィールドに割り付けて表示する
（[validation.ts](../../frontend/src/api/validation.ts)。S3 実験③の伏線回収）。
maxLength をあえて付けない設計判断は [Step 7-3](dev-walkthrough.md#step-7-3-作成画面と共通フォーム部品)。

### 動的ルートと useParams

**① 一言定義**: `/todos/:id` のように URL の一部をパラメータにするルート定義と、
その値をコンポーネントで受け取る hook。

**② なぜ必要か**: SPA では「どの画面を見ているか」を URL に持たせないと、
リロード・ブックマーク・共有ができない（アプリ内の state だけに持つと、
リロードで消える）。URL が状態の置き場になる、が Router の本質。
注意: useParams の値は**常に文字列**。数値 ID は自分で変換する
（サーバは int を期待するので、文字列のままだと 422 になる）。

**③ 実例**: [frontend/src/pages/TodoDetail.tsx](../../frontend/src/pages/TodoDetail.tsx) の
`const todoId = Number(id)`。`/todos/new` と `/todos/:id` は静的セグメント優先で
解決される（new が :id に食われることはない）。

### 更新後の再取得（サーバが真実）

**① 一言定義**: 作成・更新・削除の後、手元のデータを書き換えるのではなく
サーバから一覧を取り直して画面を揃える方針。

**② なぜ必要か**: 手元の配列を書き換える方式は速いが、「絞り込み条件・ページ・
総件数」への影響を自分で計算する必要があり、計算を1つ忘れると画面とサーバがずれる
（完了にしたのに「未完了」絞り込みの一覧に残り続ける、等）。再取得は1テンポ遅いが
確実で、実装も1行（reloadKey++）。**この「遅いが確実」と「速いが複雑」の
トレードオフを洗練された形で解決するのが S9 の TanStack Query**（キャッシュ無効化）。

**③ 実例**: [frontend/src/pages/Todos.tsx](../../frontend/src/pages/Todos.tsx) の
`reloadKey`（依存配列に足したカウンタ）。
→ [Step 7-5](dev-walkthrough.md#step-7-5-一覧の完了トグル)

---

## スプリント8で登場した概念

### JWT

**① 一言定義**: JSON Web Token。「誰か（sub）・いつまで（exp）」等を JSON で持ち、
サーバの秘密鍵で**署名**した札。サーバは DB を見ずに署名検証だけで本人確認できる
（ステートレス）。

**② なぜ必要か**: cookie セッションはサーバ側に状態（セッション行）が要り、
API サーバを複数台にすると状態の共有が問題になる。JWT は検証だけで済むので
水平分散と相性がよい。ただし代償が2つ。
**(1) 即時失効できない**——サーバに消すものがないため、盗まれたトークンは期限まで有効
（本リポジトリでは logout エンドポイント自体を廃止した。失効が必要なら
ブラックリスト等でステートを持ち込むことになり、利点と相殺する）。
**(2) 暗号化ではない**——中身は base64 で誰でも読める。守りは改ざん検出のみ。
ペイロードに秘密を入れた瞬間に漏えいする（テストで実演済み）。

**③ 実例**: [backend/app/security.py](../../backend/app/security.py) の
create/decode、[tests/test_security.py](../../backend/tests/test_security.py)
（期限切れ・改ざん・「鍵なしで読める」）。鍵は32バイト以上必須
（[S8 トラブル記録](../08_sprint8/review.md#トラブル記録)）
→ [Step 8-1](dev-walkthrough.md#step-8-1-実験⑨と-jwt-基盤)

### CORS とプリフライト

**① 一言定義**: CORS（Cross-Origin Resource Sharing）は、同一オリジンポリシーで
禁じられている「別オリジンへの JS からのアクセス」を、サーバが応答ヘッダーで
選択的に許可する仕組み。プリフライトは、Authorization ヘッダー等を伴う
リクエストの前にブラウザが送る「お伺い」（OPTIONS）。

**② なぜ必要か**: 同一オリジンポリシーがなければ、悪意あるサイトの JS が
あなたのブラウザ（ログイン済みの認証情報つき）で銀行 API を叩き放題になる。
一方、正当な SPA 構成（フロントと API が別ドメイン）では越境が必要——
その「正当な越境」をサーバが明示宣言するのが CORS。
**要点: ブロックするのはサーバでなくブラウザ**。実験⑨で観察したとおり、
サーバは 200 でデータを返しており、許可ヘッダーが無い応答をブラウザが JS に
渡さないだけ。だから curl では「CORS エラー」は再現できない（ヘッダーの有無で判断する）。

**③ 実例**: [backend/app/main.py](../../backend/app/main.py) の CORSMiddleware
（許可オリジンは .env 駆動・`*` にしない）、
[tests/test_cors.py](../../backend/tests/test_cors.py)（プリフライト / 許可外オリジン）
→ [実験⑨](../08_sprint8/review.md#実験)

### cookie セッション vs JWT（CSRF と XSS）

**① 一言定義**: 認証情報の「持たせ方」の2大方式。cookie セッション =
サーバに状態・ブラウザが自動送信。JWT（ヘッダー方式）= クライアントに状態・
JS が明示送信。

**② なぜ必要か（対比表）**:

| 観点 | cookie セッション（第1部〜S7） | JWT + Authorization（S8〜） |
|---|---|---|
| サーバ側の状態 | あり（sessions テーブル） | なし（署名検証のみ） |
| ログアウト / 失効 | **行削除で即時失効できる** | できない（期限切れ待ち） |
| 送信のされ方 | ブラウザが**自動で**付ける | JS が**明示的に**付ける |
| CSRF（意図しない送信） | **弱点**（自動送信されるため。SameSite 等で対策） | 強い（他サイトの JS はヘッダーを付けられない） |
| XSS（トークン窃取） | 強い（httpOnly なら JS から読めない） | **弱点**（localStorage は JS から読める） |
| スケール（複数サーバ） | セッション共有の仕組みが要る | そのまま分散できる |

どちらが優れているかではなく、**何を自動化し何を代償にするかの交換**。
本教材は両方を実装して差分（PR #4 と PR #8）で対比できるようにした。

**③ 実例**: cookie 方式の実装は PR #4（`git log` で辿れる）、JWT 方式は PR #8。
localStorage 採用の理由とリスクは
[frontend/src/api/token.ts](../../frontend/src/api/token.ts) の冒頭コメント。
CSRF の一言定義: 「ログイン済みブラウザの自動送信を悪用し、本人のふりをして
リクエストさせる攻撃」。cookie の SameSite=Lax（S4）はその緩和策だった。

---

（S9 以降の概念はスプリント終了ごとにここへ追記する）
