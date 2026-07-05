# 開発トレースガイド（dev-walkthrough）

このガイドは、「1コミット = 1つの意味のある変更」で積んだコミット履歴を目次として、
写経者が一人で開発を追体験するためのものです。スプリント終了ごとに追記されます。

- 前提知識の補強: [概念解説集（concepts.md）](concepts.md) /
  キャッチアップ集（作成予定）
- 各スプリントの計画・振り返り: `docs/01_sprintN/` 配下

## 差分の見方3通り

各ステップの「差分」は、次のどの方法でも確認できます。好みのものを使ってください。

1. **GitHub で見る**: 各ステップに貼ってあるコミット / PR リンクを開く。
   ブラウザだけで完結し、ファイルごとの差分が色つきで見える
2. **git show で見る**: リポジトリをクローンして `git show <コミットハッシュ>`。
   そのコミットの説明と差分がターミナルに出る
3. **ファイル単位で歴史を追う**: `git log -p -- <ファイルパス>`。
   特定ファイルが「どの順で・どう育ったか」を古い方から確認したいときに便利
   （`git log --reverse -p -- <パス>` で古い順になる）

> **写経時の差異について（重要）**: コミットハッシュ・レコード ID・マイグレーションの
> リビジョン ID・トークン値・日時などは、**あなたの環境では必ず違う値になります**。
> このガイドのハッシュは「このリポジトリの履歴を参照するためのもの」であり、
> あなたの手元で同じ値になることを期待しないでください。

---

# 第1部 API編

## スプリント1: 環境構築

- 計画: [スプリント1 バックログ](../01_sprint1/backlog.md) /
  記録: [レビュー](../01_sprint1/review.md)・[レトロスペクティブ](../01_sprint1/retrospective.md)
- PR: [#1 スプリント1: 環境構築](https://github.com/morisaki-yuichi/todo-app-example3/pull/1)
- このスプリントの概念: [コンテナとイメージ](concepts.md#コンテナとイメージ)・
  [ポートマッピング](concepts.md#ポートマッピング)・[ボリューム](concepts.md#ボリューム)・
  [仮想環境とロックファイル](concepts.md#仮想環境)・[uv](concepts.md#uv)・
  [OpenAPI 自動生成](concepts.md#openapi-自動生成)

### 全体の流れ

```text
Step 1-1  .gitignore                     … 履歴に入れないものを先に決める
Step 1-2  FastAPI をホストで起動         … Docker なしで最小のアプリを動かす
Step 1-3  Docker Compose 化              … 動くと分かっているものを容器に載せる
Step 1-4  pytest でテスト                … 手動確認を自動化する
Step 1-5  GitHub Actions CI              … ローカルで緑のテストを CI に載せる
```

「ホストで動かしてから Docker へ」「ローカルで緑にしてから CI へ」——
**一度に増やす層を1つに絞る**のがこの順序の理由です。エラーが出たとき、
疑う場所が常に「最後に足した1層」に絞られます。

---

### Step 1-1: .gitignore を追加

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/f57e888) /
  ローカル: `git show f57e888`

**何を・なぜ**: コードを書く前に「履歴に入れてはいけないもの」を決めます。
`.env`（秘密情報）と生成物（`.venv/` や `__pycache__/`）が対象です。
先に書くのは、「うっかりコミットしてから消す」と履歴に痕跡が残り続けるためです
（公開リポジトリでは、一度 push したパスワードは漏えいしたものとして扱います）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `.gitignore` | 手で新規作成 |

**動作確認**: この時点では対象ファイルがまだ無いので、次の Step 1-2 の後に
`git status` を実行し、`backend/.venv/` が **表示されない**ことを確認します。

**ここでコミット**: `chore: .gitignore を追加（.env と生成物を除外）`
— アプリの機能ではなく開発環境の整備なので `chore:`。
「除外設定」という1つの意味だけを持つ最小のコミットです。

---

### Step 1-2: FastAPI アプリの雛形とヘルスチェック API

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/6f9b22e) /
  ローカル: `git show 6f9b22e`

**何を・なぜ**: まず Docker を使わず、ホスト上で最小の FastAPI アプリを動かします。
エンドポイントは `/health` の1本だけ。「この URL を叩けば生きているか分かる」という
ヘルスチェックは、以降のすべての動作確認の足がかりになります。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/pyproject.toml` `backend/.python-version` | CLI で生成: `uv init --python 3.12 --name todo-backend`（backend/ 内で実行）。生成される `main.py` と `README.md` は使わないので削除 |
| `backend/uv.lock` | CLI で生成: `uv add fastapi "uvicorn[standard]"` が自動生成・更新 |
| `backend/app/__init__.py` | 手で新規作成（空ファイル。`app/` を import 可能なパッケージにする印） |
| `backend/app/main.py` | 手で新規作成 |

コピペ用コマンド（backend/ ディレクトリで）:

```bash
uv init --python 3.12 --name todo-backend
rm main.py README.md
uv add fastapi "uvicorn[standard]"
```

**編集の順序と理由**: `uv init`（土台）→ `uv add`（依存）→ `app/main.py`（コード）。
依存を先に入れるのは、コードを書いた時点でエディタの補完・型チェックを効かせるためです。

**動作確認**:

```bash
uv run uvicorn app.main:app --port 8002
```

別ターミナルから:

```bash
curl -s -w " [%{http_code}]" http://localhost:8002/health
# => {"status":"ok"} [200]
```

`-w "%{http_code}"` は HTTP ステータスコードを末尾に表示するオプションです。
本文だけでは「200 の成功」か「エラーページの 500」か区別できないため、
このガイドの curl 確認では一貫してこれを使います。

さらにブラウザで `http://localhost:8002/docs` を開いてください。
**1行も設定を書いていないのに** Swagger UI（対話的な API ドキュメント）が表示され、
`/health` を「Try it out」から実行できます。これが FastAPI の
[OpenAPI 自動生成](concepts.md#openapi-自動生成) です。`main.py` の
`-> dict[str, str]` という型ヒントが、そのままレスポンスのスキーマ定義になっています。

確認が済んだら `Ctrl+C` でサーバを止めます。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `error: No interpreter found for Python 3.12` 等 | uv が Python を取得できていない。`uv python install 3.12` を明示的に実行 |
| `Address already in use` | ポート 8002 を別プロセスが使用中。`ss -ltn 'sport = :8002'` で確認し、`--port` の番号を変える |
| `curl: (7) Failed to connect` | サーバが起動していない（uvicorn のターミナルのエラーを読む）か、ポート番号の打ち間違い |
| `ModuleNotFoundError: No module named 'app'` | `backend/` 以外の場所で `uv run` している。カレントディレクトリを確認 |

**写経時の差異**: `uv.lock` の内容（依存の解決結果）は、実行時期により
バージョンが少し新しくなることがあります。動作に支障が出た場合のみ、
このリポジトリの `uv.lock` の該当バージョンに合わせてください。

**ここでコミット**: `feat: FastAPI アプリの雛形とヘルスチェック API を追加`
— 「curl で 200 が返る」という動く状態になったのでコミット。
`uv.lock` も必ず一緒にコミットします（[ロックファイルと再現性](concepts.md#ロックファイル)）。

---

### Step 1-3: Docker Compose 構成（api + db）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/10ba57d) /
  ローカル: `git show 10ba57d`

**何を・なぜ**: Step 1-2 で「動くと分かっているもの」をコンテナに載せます。
同時に PostgreSQL のコンテナも定義します（接続コードは S2。今回は起動確認まで）。
ポート番号はすべて `.env` に置きます。開発マシンでは複数プロジェクトが動いていて
デフォルトポートは衝突しがちなので、「自分の環境に合わせて変える場所」を
1ファイルに集約します（実際にこのプロジェクトでも 8000/5173/5432 が姉妹プロジェクトに
使われていたため、8002/5176/5433 を採用しています。→ [QAログ](qa-log.md)）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/Dockerfile` | 手で新規作成 |
| `compose.yaml`（ルート） | 手で新規作成 |
| `.env.example`（ルート） | 手で新規作成 |
| `.env` | CLI でコピー: `cp .env.example .env`（コミットしない） |

**編集の順序と理由**: `Dockerfile`（1コンテナの作り方）→ `compose.yaml`（複数コンテナの
組み合わせ方）→ `.env.example`（可変値の置き場）。内側から外側へ、部品を作ってから組む順です。

読みどころ:

- `Dockerfile` は「依存定義のコピーと `uv sync` を、コードのコピーより **先** に」
  書いています。Docker はレイヤー単位でキャッシュするため、コードだけ変えた再ビルドで
  依存の再インストールが走らなくなります
- `compose.yaml` の `ports: "${API_PORT:-8002}:8000"` は
  「ホストの 8002 → コンテナの 8000」という [ポートマッピング](concepts.md#ポートマッピング)。
  コンテナ内は常に 8000 で固定し、衝突しうるホスト側だけを `.env` で変えます
- `volumes:` の `./backend:/app` はソースをマウントして `--reload` を効かせる開発用設定、
  `/app/.venv` はイメージ内の仮想環境をマウントで隠さないための匿名ボリュームです
  （→ [ボリューム](concepts.md#ボリューム)）

**動作確認**:

```bash
cp .env.example .env   # 初回のみ
docker compose up -d --build
curl -s -w " [%{http_code}]" http://localhost:8002/health
# => {"status":"ok"} [200]
docker compose ps      # api と db が両方 Up であること
docker compose exec db pg_isready -U todo
# => /var/run/postgresql:5432 - accepting connections
```

**わざと失敗を見る実験①: ports を外すとどうなるか**

`compose.yaml` の `ports:` 2行をコメントアウトして `docker compose up -d` し、
もう一度 curl してみてください。**予想を先に書いてから**実行すること。
観察できたら元に戻し、curl が 200 に復帰することも確認します。
実験の予想・結果・解説は [スプリント1 レビュー記録](../01_sprint1/review.md#実験) にあります。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `curl: (7) Failed to connect`（コンテナは Up） | ポートマッピング漏れの典型。`docker compose ps` の PORTS 欄に `8002->8000` があるか見る。**アプリのログにエラーが出ない問題は、1段外側（コンテナ / ネットワーク）を疑う** |
| `Bind for 0.0.0.0:8002 failed: port is already allocated` | ホスト側ポートの衝突。`.env` の `API_PORT` を空きポートに変える（これが .env 駆動にした理由） |
| `db` が起動直後に落ちる | `docker compose logs db` を読む。`POSTGRES_PASSWORD` 未設定が典型（`.env` を作り忘れている） |
| コード変更が反映されない | `volumes:` のマウント設定を確認。イメージに焼いたコードを見ている可能性 |

**写経時の差異**: ポート番号は各自の空き状況に合わせて `.env` を変えて構いません。
以降のコマンド例の `8002` は自分の `API_PORT` に読み替えてください。

**ここでコミット**: `feat: Docker Compose 構成を追加（api + db、ポートは .env 駆動）`
— 「クローン直後に cp + up だけで動く」という1つの意味のある単位。
`.env` は含めず、`.env.example` だけをコミットする点に注意。

---

### Step 1-4: pytest とヘルスチェックのテスト

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/f3380e2) /
  ローカル: `git show f3380e2`

**何を・なぜ**: Step 1-2〜1-3 で手動 curl していた確認を自動化します。
以降のスプリントでは「テストを書く → 実装 → 緑」を基本サイクルにするため、
その道具（pytest + TestClient）を最小の1本で整えます。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/pyproject.toml` | 既存ファイルを手で編集（`[tool.pytest.ini_options]` を追記。依存は下記 CLI が追記） |
| `backend/uv.lock` | CLI で更新: `uv add --dev pytest httpx2` |
| `backend/tests/test_health.py` | 手で新規作成 |

```bash
uv add --dev pytest httpx2
```

> **なぜ `httpx2` か**: FastAPI の `TestClient` は HTTP クライアントライブラリを
> 内部で使います。従来は `httpx` でしたが、現在の starlette は `httpx` 利用時に
> 非推奨警告を出し、後継の `httpx2` を推奨します。実はこのプロジェクトでも最初は
> `httpx` を入れて警告に遭遇し、切り替えました（経緯は
> [レビュー記録のトラブル欄](../01_sprint1/review.md#トラブル記録)）。
> 「警告は出た時点で対処する」を方針とします。

`--dev` を付けるのは、テスト道具が本番コンテナには不要だからです。
`Dockerfile` の `uv sync --locked --no-dev` と対になっています。

**編集の順序と理由**: 依存追加 → pytest 設定（`pyproject.toml`）→ テスト本体。
`pythonpath = ["."]` の設定を先に入れておかないと、テストから `app` を
import できずに落ちるためです。

**動作確認**:

```bash
uv run pytest
# => 1 passed
```

わざとテストを壊してみるのも一手です（`"ok"` を `"OK"` に変えて実行 → 赤くなる →
戻す）。「テストが失敗**できる**こと」の確認は、テスト自体の健全性チェックになります。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | `pyproject.toml` の `pythonpath = ["."]` 設定漏れ、または `backend/` の外で実行している |
| `RuntimeError: ... httpx ...` / TestClient が import できない | `httpx2`（または `httpx`）が入っていない。`uv add --dev httpx2` |
| `StarletteDeprecationWarning: Using httpx ... is deprecated` | 旧 `httpx` を使っている。`uv remove --dev httpx && uv add --dev httpx2` |

**写経時の差異**: なし（テストは決定的で、環境依存の値を含みません）。

**ここでコミット**: `test: pytest を導入しヘルスチェックのテストを追加`
— テスト導入という1つの意味。`test:` プレフィックスで「振る舞いは変えていない」ことを
メッセージから読み取れるようにします。

---

### Step 1-5: GitHub Actions CI

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/7308219) /
  ローカル: `git show 7308219`

**何を・なぜ**: 「ローカルで緑」を「PR ごとに機械が確認して緑」に格上げします。
以降のすべての PR は、この CI が緑になってからマージするルールです。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `.github/workflows/ci.yml` | 手で新規作成 |

読みどころ: ジョブの中身が **ローカルと同じコマンド**（`uv sync --locked` →
`uv run pytest`）である点。CI 専用の魔法を作らず「ローカルで通る手順をそのまま機械に
やらせる」のが、CI が壊れたときに切り分けやすい構成です。`uv sync --locked` は
ロックファイルと矛盾があれば失敗するので、「lock のコミット忘れ」も CI が検出します。

**動作確認**: この後 PR を作ると、PR 画面下部の Checks に `backend-test` が現れます。

```bash
gh pr checks   # CLI で確認する場合
```

**CI ログの読み方**: 失敗したら PR の「Details」からジョブを開き、
**赤い × の付いたステップだけ**を展開します。ログは下から読むのではなく、
最初に赤くなった行（エラーの1行目）を探すのが鉄則です。
「ローカルでは通るのに CI で落ちる」場合の代表原因は
①ロックファイルのコミット忘れ、②必要なファイルのコミット漏れ（`git status` で確認）、
③環境差（OS・タイムゾーン）です。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| ワークフローが実行されない | ファイルパスが `.github/workflows/` 直下か、YAML の `on:` が正しいか確認 |
| `uv sync --locked` が CI でだけ失敗 | `uv.lock` と `pyproject.toml` の不整合。ローカルで `uv sync` して lock を再コミット |
| YAML 構文エラー | インデント崩れが典型。エラーメッセージの行番号を見る |

**写経時の差異**: なし。

**ここでコミット**: `ci: GitHub Actions で PR 時に pytest を実行`
— CI 基盤の追加という1つの意味。`ci:` プレフィックスを使います。

---

### スプリント1の締め: PR とマージ

コードのコミットが揃ったら、ドキュメント（本ガイドの追記・概念解説集・
スプリント記録）をコミットし、PR を作ります。

```bash
git status                  # 作業ツリーが綺麗なことを確認してから
git push -u origin sprint1-env-setup
gh pr create --title "スプリント1: 環境構築" --body "..."
gh pr checks --watch        # CI が緑になるのを待つ
gh pr merge --merge         # マージコミットを作る方式（個々のコミットを履歴に残す）
```

マージ後は **必ず main で動作確認まで**行います（DoD の一部）:

```bash
git checkout main && git pull
docker compose up -d --build
curl -s -w " [%{http_code}]" http://localhost:8002/health   # 200
cd backend && uv run pytest                                  # 緑
```

---

## スプリント2: Read（一覧・詳細）

- 計画: [スプリント2 バックログ](../02_sprint2/backlog.md) /
  記録: [レビュー](../02_sprint2/review.md)・[レトロスペクティブ](../02_sprint2/retrospective.md)
- PR: [#2 スプリント2: Read（一覧・詳細）](https://github.com/morisaki-yuichi/todo-app-example3/pull/2)
- このスプリントの概念: [SQLModel](concepts.md#sqlmodel)・
  [マイグレーション（Alembic）](concepts.md#マイグレーションalembic)・
  [依存性注入（Depends）](concepts.md#依存性注入depends)・
  [サービス名での名前解決](concepts.md#サービス名での名前解決)・
  [テスト用 DB とテストの独立性](concepts.md#テスト用-db-とテストの独立性)

### 全体の流れ

```text
Step 2-1  DB 接続基盤       … 設定(config) → エンジン(db) → compose 連携
Step 2-2  Alembic 導入      … スキーマ変更を「コード」にする道具
Step 2-3  モデル + 初期マイグレーション … todos テーブル誕生
Step 2-4  テスト用 DB 基盤  … 実 Postgres でテストする土台
Step 2-5  一覧 API          … ソート・絞り込み・ページネーション
Step 2-6  詳細 API          … 200 と 404
Step 2-7  シード + CI       … 手で触るためのデータと、PR ごとの検証
```

編集の大原則は「**内側から外側へ**」: 設定 → エンジン → モデル → スキーマ →
ルータ → テスト。内側から作れば各段を単体で検証でき、エラーの疑い先が絞れます。

---

### Step 2-1: DB 接続基盤（設定・エンジン・セッション依存）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/a90f4f2) /
  ローカル: `git show a90f4f2`

**何を・なぜ**: DB 接続情報を環境変数駆動の設定クラスに集約し、
FastAPI にセッションを渡す依存（`get_session`）を作ります。
鍵になるのは「**ホストからは `localhost:5433`、コンテナ内からは `db:5432`**」という
2つの視点を、同じコードで扱うことです（コンテナ内では compose が `DB_HOST=db` を
注入して上書きする）。`db` という名前で届くのは Docker Compose の
[サービス名での名前解決](concepts.md#サービス名での名前解決) によります。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/pyproject.toml` `backend/uv.lock` | CLI で更新: `uv add pydantic-settings "psycopg[binary]" alembic sqlmodel` |
| `backend/app/config.py` | 手で新規作成 |
| `backend/app/db.py` | 手で新規作成 |
| `compose.yaml` | 既存ファイルを手で編集（api の `environment` / `depends_on`、db の `healthcheck` を追加） |

**編集の順序と理由**: 依存追加 → `config.py`（値の出どころ）→ `db.py`（値を使う側）→
`compose.yaml`（コンテナ内での上書き）。値の流れの上流から書きます。

**動作確認**: ホストとコンテナの両方から `SELECT 1` が通ること。

```bash
# ホストから（backend/ で）
uv run python -c "
from sqlalchemy import text
from app.db import engine
with engine.connect() as conn: print(conn.execute(text('SELECT 1')).scalar())"
# => 1

# コンテナ内から（ルートで）
docker compose exec api uv run python -c "
from sqlalchemy import text
from app.db import engine
with engine.connect() as conn: print(conn.execute(text('SELECT 1')).scalar())"
# => 1
```

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| ホストから `connection refused` | `.env` の `DB_PORT` と実際のポートマッピングのずれ。`docker compose ps` の PORTS 欄で確認 |
| コンテナ内から `could not translate host name "db"` | compose のサービス名と `DB_HOST` の不一致、または `docker compose run` 等でネットワーク外から実行している |
| `password authentication failed` | `.env` と DB 初期化時の認証情報のずれ。**Postgres の認証情報は初回起動時にボリュームへ焼かれる**ため、後から `.env` を変えても既存ボリュームには効かない（`docker compose down -v` で作り直すか元の値に戻す） |

**写経時の差異**: なし（ポート番号を変えている場合は読み替え）。

**ここでコミット**: `feat: DB 接続基盤を追加（設定・エンジン・セッション依存・compose 連携）`
— 「アプリから DB に届く」という1つの意味のある単位。

---

### Step 2-2: Alembic 導入

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/127bcb8) /
  ローカル: `git show 127bcb8`

**何を・なぜ**: スキーマ変更を「実行可能なコード」として履歴管理する道具を入れます
（→ [マイグレーション](concepts.md#マイグレーションalembic)）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/alembic.ini` `backend/migrations/`一式 | CLI で生成: `uv run alembic init migrations` |
| `backend/migrations/env.py` | 生成物を手で編集（接続 URL を `settings` から取得・`target_metadata = SQLModel.metadata`） |
| `backend/migrations/script.py.mako` | 生成物を手で編集（`import sqlmodel` を追加） |

生成コマンドの直後に `git status` で「何が生成されたか」を必ず確認します
（S1 レトロの Try T-1）。

**編集の順序と理由**: 生成 → env.py（接続と対象メタデータ）→ mako（テンプレート）。
`script.py.mako` への `import sqlmodel` 追加は、**autogenerate が
`sqlmodel.sql.sqltypes.AutoString` を出力する**ためで、忘れると次のステップで
生成されるマイグレーションが `NameError: name 'sqlmodel' is not defined` になります。

**動作確認**: `uv run alembic current` がエラーなく動く（まだ何も適用されていないので出力は空）。

**ここでコミット**: `chore: Alembic を導入し設定・SQLModel と接続`
— まだテーブルは作らない。「道具の導入」と「最初の使用」を分けることで、
差分から Alembic の素の姿（生成直後 + 最小の設定変更）が読み取れます。

---

### Step 2-3: Todo モデルと初期マイグレーション

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/d10ef76) /
  ローカル: `git show d10ef76`

**何を・なぜ**: いよいよ `todos` テーブルです。SQLModel のクラス1つが
「DB テーブル定義」と「Pydantic モデル」を兼ねます（→ [SQLModel](concepts.md#sqlmodel)）。
この時点では `user_id` を**意図的に持たせません**（S4 でデータ移行つきで追加します。
[user-stories.md](user-stories.md) の設計判断を参照）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/models.py` | 手で新規作成 |
| `backend/migrations/env.py` | 既存ファイルを手で編集（`import app.models` を追加） |
| `backend/migrations/versions/xxxx_create_todos_table.py` | CLI で生成: `uv run alembic revision --autogenerate -m "create todos table"` |

```bash
uv run alembic revision --autogenerate -m "create todos table"
git status          # 生成物を確認（Try T-1）
# 生成されたファイルを必ず目視レビューしてから:
uv run alembic upgrade head
```

**autogenerate は「提案」**です。生成されたファイルを開き、カラム・型・nullable が
モデルと一致しているか必ず確認してから upgrade します（インデックスの変更や
型の微妙な変更を検出できないことがある = autogenerate の限界）。

**動作確認**:

```bash
uv run alembic current                    # => <リビジョンID> (head)
docker compose exec db psql -U todo -d todo -c "\d todos"   # テーブル定義を目視
```

**わざと失敗を見る実験②: upgrade 前に autogenerate をもう一度**

revision 生成後・upgrade **前**にもう一度 `alembic revision --autogenerate` を
実行してみてください（予想を先に書くこと）。`Target database is not up to date.` で
拒否されます。診断の型は「`alembic current`（DB に適用済み）と `alembic heads`
（コードの最新）を**見比べる**」——両者の差がこのエラーの正体です。
詳細: [S2 レビュー記録の実験欄](../02_sprint2/review.md#実験)

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `NameError: name 'sqlmodel' is not defined` | `script.py.mako` への `import sqlmodel` 追加漏れ（Step 2-2） |
| `Target database is not up to date.` | 未適用のリビジョンがある。`alembic current` と `alembic heads` を見比べ、`upgrade head` してから再実行 |
| autogenerate が「変更なし」の空マイグレーションを作る | env.py の `target_metadata` 設定漏れ、または `import app.models` 漏れ（メタデータにテーブルが登録されていない） |
| `relation "todos" does not exist`（API アクセス時に 500） | マイグレーション未適用。`uv run alembic upgrade head` |

**写経時の差異（重要）**: マイグレーションのリビジョン ID（このリポジトリでは
`bba428a98c05`）は**あなたの環境では必ず別の値になります**。ファイル名・
`alembic current` の出力・後続マイグレーションの `down_revision` は
自分の環境の ID で読み替えてください。

**ここでコミット**: `feat: Todo モデルと初期マイグレーションを追加`
— モデルとそのマイグレーションは常にペアでコミットします（片方だけだと
「コードとスキーマがずれた状態」が履歴に残ってしまう）。

---

### Step 2-4: テスト用 DB 基盤

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/dd99303) /
  ローカル: `git show dd99303`

**何を・なぜ**: テストを**実 Postgres**（専用 DB `todo_test`）に対して実行する土台です。
SQLite で代用しない理由は、方言差（型・照合順序・NULL の扱い）で「テストは通るのに
本番で壊れる」を避けるため。開発 DB と分けるのは、テストがテーブルを
作って壊す（洗い替える）からです。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/tests/conftest.py` | 手で新規作成 |
| `backend/tests/test_models.py` | 手で新規作成 |

conftest の3つの部品: ①`todo_test` DB の自動作成（`CREATE DATABASE` は
トランザクション外でしか実行できないため AUTOCOMMIT 接続を使う）、
②テストごとの `create_all` / `drop_all`（テスト間の独立性）、
③`app.dependency_overrides` による `get_session` の差し替え
（→ [依存性注入](concepts.md#依存性注入depends) の利点が最初に効く場所）。

**動作確認**: `uv run pytest` → 2 passed（health + roundtrip）。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `CREATE DATABASE cannot run inside a transaction block` | AUTOCOMMIT にしていない（conftest の `isolation_level="AUTOCOMMIT"` を確認） |
| テストが他のテストのデータを見てしまう | create_all/drop_all の fixture スコープを確認（本構成はテスト関数ごと） |
| ローカルは緑・CI で `connection refused` | CI に Postgres サービスがない（Step 2-7 で追加） |

**ここでコミット**: `test: テスト用 DB 基盤とモデルの保存・読込テストを追加`

---

### Step 2-5: TODO 一覧 API

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/e0b220b) /
  ローカル: `git show e0b220b`

**何を・なぜ**: `GET /todos`。既定は `created_at` 降順・10件、
`page` / `per_page`（上限100）、`completed` / `q` で絞り込み、`total` を返します。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/schemas.py` | 手で新規作成 |
| `backend/app/routers/__init__.py` | 手で新規作成（空） |
| `backend/app/routers/todos.py` | 手で新規作成 |
| `backend/app/main.py` | 既存ファイルを手で編集（`include_router`） |
| `backend/tests/test_todos_list.py` | 手で新規作成 |

**編集の順序と理由**: スキーマ → ルータ → main 登録 → テスト。
「レスポンスの形」を先に決めると、ルータはそれを埋めるだけになります。

実装の読みどころ:

- クエリパラメータの制約は `Annotated[int, Query(ge=1, le=100)]` のように
  **型として宣言**する。違反時の 422 は Pydantic が自動生成し、`/docs` にも制約が載る
- `total` は「絞り込みまで適用・ページ適用前」の集合を数える
- 並びは `created_at DESC, id DESC`。**タイブレーカーなしの並びはテストのフレーク源**

**動作確認**: `uv run pytest` → 9 passed。テストの観点は
空一覧 / 並び順 / ページ境界（10件 + 5件）/ per_page の境界値（100 は通り 101 は 422）/
completed / q（title・description 両方）/ 複合条件。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `/todos` へのアクセスがすべて 404 | `include_router` 漏れ、または prefix の重複・タイポ。`/docs` に載っているかで切り分け |
| 一覧が 500 | `relation "todos" does not exist`（マイグレーション未適用）が典型。トレースバックの最下段の DB エラーを読む |
| 日本語の `q` で 400 `Invalid HTTP request received` | curl に**未エンコードの日本語 URL** を渡している。`--get --data-urlencode "q=牛乳"` を使う（アプリではなく HTTP パーサの層で拒否されるためアプリのログに出ない） |

**写経時の差異**: なし。

**ここでコミット**: `feat: TODO 一覧 API を追加（ソート・絞り込み・ページネーション）`
— 実装とそのテストを同じコミットに入れます（後から差分を見た人が
「この実装の仕様はこのテスト」と読める）。

---

### Step 2-6: TODO 詳細 API

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/ac77f15) /
  ローカル: `git show ac77f15`

**何を・なぜ**: `GET /todos/{id}`。存在すれば 200、なければ 404。
「見つからない」を `HTTPException(404)` で**例外として投げる**のが FastAPI の流儀です
（戻り値の型は正常系だけを表現できるため）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/routers/todos.py` | 既存ファイルを手で編集（`get_todo` を追加） |
| `backend/tests/test_todos_detail.py` | 手で新規作成 |

テストの観点: 全項目が返る（200）/ 存在しない ID（404 + エラーボディ）/
ID が int でない（422 — パスパラメータの型宣言だけで得られる）。

**ここでコミット**: `feat: TODO 詳細 API を追加（404・型不一致 422 の検証つき）`

---

### Step 2-7: シードデータと CI の Postgres

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/773493b)（シード）・
  [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/7494359)（CI） /
  ローカル: `git show 773493b` `git show 7494359`

**何を・なぜ**: 手で API を触るための現実的なデータ15件と、
CI でもテストが実 Postgres に対して走るようにするサービスコンテナの追加です。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/scripts/seed.py` | 手で新規作成 |
| `.github/workflows/ci.yml` | 既存ファイルを手で編集（`services:` を追加） |

```bash
uv run python -m scripts.seed   # 「-m」に注意（下記）
```

`python scripts/seed.py` と直接実行すると `ModuleNotFoundError: No module named 'app'`
になります。Python は「スクリプトのあるディレクトリ」を import パスに入れるため、
`scripts/` からは `app` が見えません。`-m` によるモジュール実行なら
カレントディレクトリが import パスに入ります。

**動作確認（curl・`-w "%{http_code}"` でステータスを機械的に確認）**:

```bash
curl -s -w " [%{http_code}]" "http://localhost:8002/todos" | tail -c 60      # [200]
curl -s "http://localhost:8002/todos?page=2"                                 # 5件・古い側
curl -s "http://localhost:8002/todos?completed=true"                         # total: 4
curl -s --get --data-urlencode "q=牛乳" "http://localhost:8002/todos"        # total: 2
curl -s -w " [%{http_code}]" "http://localhost:8002/todos/9999"              # [404]
curl -s -w " [%{http_code}]" "http://localhost:8002/todos?per_page=101"      # [422]
```

`/docs` でも `GET /todos` のパラメータ制約（ge/le）とレスポンススキーマが
自動反映されていることを見てください。

**写経時の差異**: シードの `created_at` は固定値なので一覧の並びは同じになりますが、
`id` は投入をやり直すたびに進みます（連番はシーケンスなので巻き戻らない）。
コマンド例の `id=1` は手元の一覧で返ってきた `id` に読み替えてください。

**ここでコミット**: シードと CI は別コミット
（`feat: 開発用シードデータ投入スクリプトを追加` / `ci: テスト用に PostgreSQL サービスコンテナを追加`）。
「開発体験の改善」と「検証基盤の変更」は独立にリバートできるべき、が分ける理由です。

---

## スプリント3: Create / Update / Delete

- 計画: [スプリント3 バックログ](../03_sprint3/backlog.md) /
  記録: [レビュー](../03_sprint3/review.md)・[レトロスペクティブ](../03_sprint3/retrospective.md)
- PR: [#3 スプリント3: Create / Update / Delete](https://github.com/morisaki-yuichi/todo-app-example3/pull/3)
- このスプリントの概念: [Pydantic バリデーションと 422](concepts.md#pydantic-バリデーションと-422)・
  [リクエスト / レスポンススキーマの分離](concepts.md#リクエスト--レスポンススキーマの分離)・
  [PATCH と部分更新](concepts.md#patch-と部分更新)・
  [ステータスコード 201 / 204](concepts.md#ステータスコード-201--204)

### 全体の流れ

```text
Step 3-1  作成 API（POST・201）  … バリデーションの本丸。境界値テストつき
Step 3-2  編集 API（PATCH・200） … 部分更新。「送らない」と「null」の区別
Step 3-3  削除 API（DELETE・204）… 一番小さい。仕上げに手動一巡確認
```

重いタスク（作成 + バリデーション）を先頭に置いています（S2 レトロの Try T-4）。

---

### Step 3-1: TODO 作成 API

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/2b29c74) /
  ローカル: `git show 2b29c74`

**何を・なぜ**: `POST /todos`。成功時は **201 Created** と作成結果を返します。
入力は `Todo`（table=True）で直接受けず、専用の `TodoCreate` スキーマで受けます。
理由は2つ:

1. クライアントに `id` や `created_at` を指定させない（受け口に無い項目は入りようがない）
2. **table=True の SQLModel は Pydantic バリデーションを実行しない**という落とし穴がある。
   `max_length` などの制約を効かせたいなら、非テーブルのスキーマで受けるのが正解
   （→ [リクエスト / レスポンススキーマの分離](concepts.md#リクエスト--レスポンススキーマの分離)）

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/schemas.py` | 既存ファイルを手で編集（`TodoCreate` を追加） |
| `backend/app/routers/todos.py` | 既存ファイルを手で編集（`create_todo` を追加） |
| `backend/tests/test_todos_create.py` | 手で新規作成 |

**編集の順序と理由**: スキーマ（入力の形と制約）→ ルータ（詰め替えて保存）→ テスト。
ルータ本体は4行（validate → add → commit → refresh）で、
**制約はすべてスキーマ側に宣言として置く**のが FastAPI らしい書き方です。

**動作確認**: `uv run pytest` → 21 passed。テストの観点は
201 + 本文 / 永続化（作成後に GET できる）/ title だけの最小作成 / 過去日 due_date 許可 /
title 欠落・空文字（422）/ **境界値**（title 100文字は通り 101 は落ちる、
description 1000 / 1001）/ 日付形式不正。

**わざと失敗を見る実験③: title を欠いた POST の 422 を読む**

```bash
curl -s -w "\n[%{http_code}]" -X POST http://localhost:8002/todos \
  -H "Content-Type: application/json" \
  -d '{"description": "タイトルを忘れた"}'
```

422 の `detail` は配列で、要素の読み方は
**`loc`（どこが）→ `type`（なぜ）→ `msg`（人間向け説明）→ `input`（受け取った値）**。
ルータ関数は実行すらされず、DB にも書き込まれません。
詳細: [S3 レビュー記録の実験欄](../03_sprint3/review.md#実験)

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| 制約違反なのに 201 で通ってしまう | 受け口が table=True モデルになっている（バリデーションされない）。スキーマ分離を確認 |
| `detail` の `loc` が `["body"]` だけ | JSON 全体が壊れている（クォート漏れ等）。`-d` の中身を JSON lint する |
| curl で 422 だが `/docs` からは成功する | curl の `-H "Content-Type: application/json"` 漏れが典型 |

**写経時の差異**: レスポンスの `id` / `created_at` は環境ごとに異なります。

**ここでコミット**: `feat: TODO 作成 API を追加（201・バリデーション・境界値テスト）`

---

### Step 3-2: TODO 編集 API（PATCH）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/05eb51c) /
  ローカル: `git show 05eb51c`

**何を・なぜ**: `PATCH /todos/{id}`。**送られた項目だけ**を更新します
（→ [PATCH と部分更新](concepts.md#patch-と部分更新)）。核心は次の区別です。

| クライアントの意図 | リクエスト | 実装での見え方 |
|---|---|---|
| この項目は変更しない | 項目を**送らない** | `exclude_unset=True` の dump に**含まれない** |
| この項目を消す | `null` を送る | dump に `None` として**含まれる** |

`description: null` は「説明を消す」として許可し、`title: null` は
NOT NULL 制約を 500 で踏む前に **field_validator で 422** にします
（バリデータは「項目が送られたときだけ」動くので、省略とは干渉しない）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/schemas.py` | 既存ファイルを手で編集（`TodoUpdate` を追加） |
| `backend/app/routers/todos.py` | 既存ファイルを手で編集（`update_todo` を追加） |
| `backend/tests/test_todos_update.py` | 手で新規作成 |

**動作確認**: `uv run pytest` → 28 passed。テストの観点は
部分更新（送っていない項目が変わらない）/ completed のトグル /
description の null クリア / **title の null は 422** / 作成時と同じ制約 /
updated_at が進む（created_at は不変）/ 404。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| 送っていない項目が null で上書きされる | `model_dump()` に `exclude_unset=True` が無い（PATCH 実装の典型バグ） |
| `title: null` が 500（IntegrityError） | field_validator 漏れ。DB の NOT NULL に到達する前に 422 で止める |
| updated_at が変わらない | ルータでの明示更新漏れ（本構成では DB トリガーではなくアプリで更新する設計） |

**ここでコミット**: `feat: TODO 編集 API を追加（PATCH 部分更新・null と未送信の区別）`

---

### Step 3-3: TODO 削除 API

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/684e6d6) /
  ローカル: `git show 684e6d6`

**何を・なぜ**: `DELETE /todos/{id}`。成功は **204 No Content**（本文なし）。
存在しない ID・削除済み ID への再実行は 404 という素朴な仕様です。
なお「削除前の確認」は UI の責務（S7 で実装）で、API は確認なしで消します。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/routers/todos.py` | 既存ファイルを手で編集（`delete_todo` を追加） |
| `backend/tests/test_todos_delete.py` | 手で新規作成 |

**動作確認（手動一巡・コピペ可）**: 自動テスト（32 passed）に加え、
curl でライフサイクルを一巡します。

```bash
B=http://localhost:8002
# 作成 → 201。応答の id を控える（環境ごとに違う値になる）
curl -s -w "\n[%{http_code}]" -X POST "$B/todos" \
  -H "Content-Type: application/json" \
  -d '{"title": "curlで作成", "due_date": "2026-07-08"}'
# 以降の <ID> は自分の応答の id に読み替える
curl -s -w "\n[%{http_code}]" -X PATCH "$B/todos/<ID>" \
  -H "Content-Type: application/json" -d '{"completed": true}'      # [200]
curl -s -w "[%{http_code}]" -X DELETE "$B/todos/<ID>"               # [204]
curl -s -w "\n[%{http_code}]" "$B/todos/<ID>"                       # [404]
```

`/docs` でも POST/PATCH/DELETE が増え、スキーマの必須/任意・文字数制約が
反映されていることを確認してください。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| 204 なのに本文が返る設定にしてしまい警告/エラー | 204 は「本文なし」の約束。ハンドラは何も return しない |
| 削除後も一覧に残って見える | 別プロセス/別 DB を見ている可能性。接続先（ホスト vs コンテナ、todo vs todo_test）を確認 |

**ここでコミット**: `feat: TODO 削除 API を追加（204・再取得 404）`

---

## スプリント4: 認証・認可 + CI 固め（第1部 最終）

- 計画: [スプリント4 バックログ](../04_sprint4/backlog.md) /
  記録: [レビュー](../04_sprint4/review.md)・[レトロスペクティブ](../04_sprint4/retrospective.md)
- PR: [#4 スプリント4: 認証・認可 + CI 固め](https://github.com/morisaki-yuichi/todo-app-example3/pull/4)
- このスプリントの概念: [認証と認可（401 vs 403）](concepts.md#認証と認可401-vs-403)・
  [パスワードハッシュ](concepts.md#パスワードハッシュ)・
  [cookie セッション](concepts.md#cookie-セッション)・
  [既存データのマイグレーション](concepts.md#既存データのマイグレーション)

### 全体の流れ

```text
Step 4-1  User / UserSession モデル + bcrypt … 土台（テーブルとハッシュ）
Step 4-2  認証 API                            … register / login / logout / me
Step 4-3  認可 + データ移行                   … user_id 追加の3段階マイグレーション（山場）
Step 4-4  CI 固め                             … マイグレーション往復検証
```

---

### Step 4-1: User / UserSession モデルとパスワードハッシュ基盤

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/f627cd7) /
  ローカル: `git show f627cd7`

**何を・なぜ**: `users` と `sessions` の2テーブルと、bcrypt によるハッシュ関数を作ります。
セッションを DB に置く「ステートフル」方式なのは、**ログアウト = 行削除で即時無効化できる**
性質を体験するため（S8 で JWT と対比します）。

> **ライブラリ選定の注記**: 当初案は passlib でしたが、長期未メンテで最新 bcrypt と
> 組み合わせ問題があるため、bcrypt を直接使います（[QAログ](qa-log.md) に記録）。
> 使う関数は hashpw / checkpw の2つだけで、学習内容は変わりません。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/pyproject.toml` `uv.lock` | CLI で更新: `uv add bcrypt "pydantic[email]"` |
| `backend/app/models.py` | 既存ファイルを手で編集（User / UserSession を追加。**Todo はまだ触らない**） |
| `backend/app/security.py` | 手で新規作成 |
| `backend/migrations/versions/xxxx_create_users_and_sessions_tables.py` | CLI で生成: `uv run alembic revision --autogenerate -m "create users and sessions tables"` → 目視レビュー → `upgrade head` |
| `backend/tests/test_security.py` | 手で新規作成 |

**編集の順序と理由**: モデル → マイグレーション → security → テスト。
新規テーブルだけなので autogenerate の生成物がそのまま使えます
（既存データが絡む Step 4-3 との対比ポイント）。

**動作確認**: `uv run pytest tests/test_security.py` → 3 passed。
テストの観点: ハッシュの往復 / **同じパスワードでも毎回違うハッシュ**（ソルト）/
トークンの一意性。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `ImportError: email-validator is not installed` | `pydantic[email]` の追加漏れ。**コンテナ側**で出た場合は、新依存がコンテナの venv に未同期 → `docker compose restart api`（下記トラブル記録参照） |
| クラス名 `Session` の衝突 | sqlmodel.Session と自作モデルの衝突。本リポジトリは `UserSession` と命名して回避 |

**写経時の差異**: リビジョン ID は各自の環境で異なります。

**ここでコミット**: `feat: User / UserSession モデルとパスワードハッシュ基盤を追加`

---

### Step 4-2: 認証 API（register / login / logout / me）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/6061e10) /
  ローカル: `git show 6061e10`

**何を・なぜ**: `/auth` の4エンドポイント。設計の要点は3つ。

1. **登録は 201 + 自動ログイン**（フロント実装（S6）で「登録 → 即一覧画面」にするため）
2. **ログイン失敗は理由を教えない**: 「メール未登録」と「パスワード違い」を同一メッセージの
   401 にする（区別すると登録済みメールを列挙できてしまう）
3. **cookie は httpOnly + SameSite=Lax**: JS から読めない（XSS でトークンを盗めない）+
   他サイト起点の送信を制限（CSRF の軽減）

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/deps.py` | 手で新規作成（`SessionDep` を todos.py から移設、`get_current_user` / `CurrentUser` を追加） |
| `backend/app/schemas.py` | 既存ファイルを手で編集（UserCreate / LoginRequest / UserRead） |
| `backend/app/routers/auth.py` | 手で新規作成 |
| `backend/app/main.py` | 既存ファイルを手で編集（include_router） |
| `backend/tests/test_auth.py` | 手で新規作成 |

**編集の順序と理由**: deps（認証の判定部品）→ スキーマ → ルータ → main → テスト。
`get_current_user` を Depends にしておくと、次のステップで各エンドポイントに
「引数を1つ足すだけ」で認証必須にできます。

**動作確認**: `uv run pytest` → 44 passed。観点は 201 と自動ログイン /
レスポンスに password_hash が**出ない** / 重複 409 / 不正メール・8文字未満 422（境界: 8文字は通る）/
**失敗2種の応答が同一** / ログアウト後 me が 401。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| テストで cookie が引き継がれない | TestClient はレスポンスの Set-Cookie を自動で保持する。カスタムでクライアントを作り直していないか確認 |
| `/auth/me` が常に 401 | cookie 名の不一致（`SESSION_COOKIE_NAME` を1箇所に定数化して参照する） |
| 401 なのにブラウザで cookie が見える | httpOnly は「JS から読めない」であって「開発者ツールに出ない」ではない（正常） |

**ここでコミット**: `feat: 認証 API を追加（登録・ログイン・ログアウト・me、cookie セッション）`
— この時点で todos はまだ無防備（次のステップで保護する）。

---

### Step 4-3: 認可の導入と既存データのマイグレーション（山場）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/46f39ec) /
  ローカル: `git show 46f39ec`

**何を・なぜ**: `todos.user_id`（NOT NULL・外部キー）を追加し、全 TODO API を
「ログイン必須（401）・自分の分だけ（403）」にします。
**既にデータが入っているテーブルへの NOT NULL 列追加**が今スプリントの山場です。

**影響調査（着手前に実施）**: `user_id` の追加は、モデル・全ルータ・
**全テストファイル**・シードに波及する。特に「テストで Todo を直接 INSERT している箇所」は
全部 user_id が必要になる（認可の導入はテスト全体に波及する、を体感する）。

**わざと失敗を見る実験④: autogenerate をそのまま適用する**

予想を書いてから、生成されたマイグレーション（`nullable=False` の一発追加）を
そのまま `upgrade head` してみてください。

```text
NotNullViolation: column "user_id" of relation "todos" contains null values
```

既存17行の user_id を埋める手段がないため失敗します。DB は無傷です
（PostgreSQL は DDL もトランザクションで巻き戻る）。
→ 詳細: [S4 レビュー記録の実験欄](../04_sprint4/review.md#実験)

**修正: 3段階マイグレーションに手で書き換える**

```text
① nullable=True で列を追加（既存行は NULL のまま入る）
② データ移行: 引き取りユーザー legacy@example.com を作り、NULL の行に割り当てる
③ 全行が埋まったので NOT NULL 化 + 外部キー + インデックス
```

あわせて autogenerate の生成物には **外部キー名が None（無名）** という問題もあり、
そのままでは downgrade が実行できません。名前を明示します（`fk_todos_user_id_users`）。
これも「autogenerate は提案」の実例です。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/models.py` | 既存ファイルを手で編集（Todo に user_id） |
| `backend/migrations/versions/xxxx_add_user_id_to_todos.py` | CLI で生成後、**大幅に手で編集**（上記3段階 + FK 命名） |
| `backend/app/routers/todos.py` | 既存ファイルを手で編集（CurrentUser 追加・所有チェック `get_owned_todo`） |
| `backend/tests/conftest.py` | 既存ファイルを手で編集（user / other_user / auth_client / other_client） |
| `backend/tests/test_todos_*.py` `test_models.py` | 既存ファイルを手で編集（認証前提に更新） |
| `backend/tests/test_todos_authz.py` | 手で新規作成（401 一式 + **ペアテスト**） |
| `backend/scripts/seed.py` | 既存ファイルを手で編集（alice / bob の2ユーザー） |

**編集の順序と理由**: モデル → マイグレーション（実験④込み）→ ルータ →
conftest → 既存テスト更新 → ペアテスト → シード。
スキーマが確定してからコードを直すと、テストの失敗が「認可の入れ忘れ」の検出器になります。

**動作確認**:

```bash
uv run alembic upgrade head
docker compose exec db psql -U todo -d todo \
  -c "SELECT u.email, count(t.id) FROM todos t JOIN users u ON u.id=t.user_id GROUP BY u.email;"
# => legacy@example.com | 17   （既存データが引き取られている）
uv run alembic downgrade -1 && uv run alembic upgrade head   # 往復も検証
uv run pytest    # 55 passed
```

**ペアテストの意味**: 認可は「本人はできる／他人は 403」を**必ずペアで**検証します。
他人側だけだと「全員 403（機能停止）」でも通り、本人側だけだと「全員成功（認可なし）」でも
通ってしまうからです。

**わざと失敗を見る実験⑤: 認可チェックを外してみる**

`get_owned_todo` の所有チェック2行をコメントアウトし、シードの bob で
alice の TODO を直叩きしてください（curl 例はレビュー記録に）。
200 で**丸ごと読めてしまう**こと、そして**ペアテストが4本落ちて検出する**ことを
確認したら、元に戻します。認可は「書き忘れても何も警告が出ない」種類の欠陥です。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `NotNullViolation ... contains null values` | 既存データがあるテーブルへの NOT NULL 一発追加（実験④）。3段階に書き換える |
| downgrade で `Constraint must have a name` | autogenerate が FK を無名（None）で生成した。名前を明示する |
| 既存テストが大量に 401 で落ちる | 認可導入の想定どおりの波及。auth_client への置き換え漏れを潰す |
| テストは通るのに手で叩くと他人の TODO が見える | テスト用 DB と開発用 DB の見間違い、または実験⑤の戻し忘れ。`git status` を確認 |

**写経時の差異**: 既存 TODO の件数（legacy に引き取られる数）は各自の操作履歴で変わります。
リビジョン ID・レコード ID も同様です。

**ここでコミット**: `feat: TODO を所有者に紐付け認可を導入（既存データの移行つき）`
— モデル・移行・認可・テスト・シードが「マルチユーザー化」という1つの意味で結合しているため、
1コミットにまとめています（分けるとどの中間状態も壊れている）。

---

### Step 4-4: CI 固め（マイグレーション往復検証）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/e1c9476) /
  ローカル: `git show e1c9476`

**何を・なぜ**: CI に `upgrade head → downgrade base → upgrade head` を追加します。
Step 4-3 のような「手書きの重いマイグレーション」は、downgrade の壊れに気づきにくいため、
PR ごとに往復を機械検証します。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `.github/workflows/ci.yml` | 既存ファイルを手で編集（ステップ追加） |

**動作確認**: PR の CI で `マイグレーションの適用と巻き戻しを検証` ステップが緑になる。

**ここでコミット**: `ci: マイグレーションの適用・巻き戻し検証を追加`

---

# 第2部 フロント編

## スプリント5: React 環境構築

- 計画: [スプリント5 バックログ](../05_sprint5/backlog.md) /
  記録: [レビュー](../05_sprint5/review.md)・[レトロスペクティブ](../05_sprint5/retrospective.md)
- PR: [#5 スプリント5: React 環境構築](https://github.com/morisaki-yuichi/todo-app-example3/pull/5)
- このスプリントの概念: [SPA と Vite 開発サーバ](concepts.md#spa-と-vite-開発サーバ)・
  [npm とロックファイル](concepts.md#npm-とロックファイル)・
  [コンポーネントと JSX](concepts.md#コンポーネントと-jsx)・
  [CSS Modules](concepts.md#css-modules)・
  [Vite プロキシと同一オリジン](concepts.md#vite-プロキシと同一オリジン)

### 全体の流れ

```text
Step 5-1  Vite で雛形生成            … ジェネレータの出力をそのままコミット
Step 5-2  プロキシと .env 駆動ポート … /api → バックエンドへの転送
Step 5-3  ルーティングと Home 画面   … 画面1枚（ローディング/成功/エラー）
Step 5-4  Vitest + CI                … フロントにも「緑の基準」を作る
```

前提: バックエンド（第1部の成果物）が `docker compose up -d` で動いていること。

---

### Step 5-1: Vite で React + TypeScript の雛形を生成

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/b182af6) /
  ローカル: `git show b182af6`

**何を・なぜ**: フロントの土台をジェネレータで作ります。**生成物をそのまま1コミット**に
するのは、次のコミット以降で「テンプレート由来」と「手による変更」が差分で
区別できるようにするためです。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/` 一式（package.json, tsconfig*, index.html, src/ ほか） | CLI で生成（下記） |
| `frontend/package-lock.json` | CLI で生成: `npm install` が自動生成。**必ずコミット**（uv.lock と同じ理由） |

```bash
# リポジトリルートで
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev   # テンプレートの画面が出ることを確認して Ctrl+C
```

**動作確認**: `npm run dev` の表示する URL をブラウザで開き、テンプレート画面が出ること。

**写経時の差異**: テンプレートの内容（React / Vite のバージョン、サンプル画面）は
生成時期で変わります。本リポジトリは React 19 / Vite 8 / TypeScript 6 世代です。
大きく違う場合は package.json のバージョンをリポジトリに合わせると差分が減ります。

**ここでコミット**: `chore: Vite で React + TypeScript の雛形を生成`

---

### Step 5-2: Vite プロキシと .env 駆動のポート設定

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/d06ffe9) /
  ローカル: `git show d06ffe9`

**何を・なぜ**: フロント（5176）とバックエンド（8002）は別ポート = ブラウザから見ると
**別オリジン**です。そのまま fetch すると CORS の壁に当たります（S8 で体験）。
第2部前半は、Vite 開発サーバに `/api/...` をバックエンドへ転送させる
**プロキシ方式**を使います。ブラウザから見ればすべて 5176 = 同一オリジンなので
CORS 設定が不要になります。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/vite.config.ts` | 生成物を手で編集（loadEnv でルート .env を読み、port と proxy を設定） |
| `.env.example` / `.env` | 既存ファイルを手で編集（`FRONT_PORT=5176` を追加） |

読みどころ: `rewrite: (path) => path.replace(/^\/api/, '')` —
フロントのコードは常に `/api/health` のように書き、プロキシが `/api` を剥がして
`http://localhost:8002/health` へ届けます。「どこからが API 呼び出しか」が
コード上で一目瞭然になり、S8 での接続先変更も1箇所で済みます。

**動作確認**:

```bash
npm run dev &          # 起動したまま
curl -s -w " [%{http_code}]" http://localhost:5176/api/health
# => {"status":"ok"} [200]   ← フロントのポートから API の JSON が返る
```

**わざと失敗を見る実験⑥: プロキシを外すとどうなるか**

`vite.config.ts` の `proxy` を一時的に消して同じ curl をしてみてください
（予想を書いてから）。**404 ではなく、200 で index.html（HTML）が返ります**。
SPA の開発サーバは未知のパスに index.html を返すためです。つまりプロキシ漏れの症状は
HTTP エラーではなく、**`res.json()` の `Unexpected token '<'`（JSON パースエラー）**
として現れます。→ [S5 レビュー記録](../05_sprint5/review.md#実験)

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| fetch が `Unexpected token '<'` で落ちる | プロキシ設定漏れ / パスの `/api` 付け忘れ。**JSON のはずが HTML が返っている**サイン。curl で実レスポンスを見る |
| `/api/...` が 404（JSON のエラー） | プロキシは効いている（エラーが JSON = API 由来）。API 側のパスを確認 |
| ポートが 5173 で起動する | ルート `.env` に `FRONT_PORT` がない、または dev サーバの再起動漏れ（vite.config の変更は自動再起動されるが .env の変更は手動再起動） |

**ここでコミット**: `feat: Vite プロキシと .env 駆動のポート設定を追加`

---

### Step 5-3: ルーティングと Home 画面（画面1枚）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/a99091b) /
  ローカル: `git show a99091b`

**何を・なぜ**: React Router のライブラリモードで `/` ルートを作り、
Home 画面で `/api/health` を fetch して**3状態（ローディング / 成功 / エラー）**を
描き分けます。これは S6 で本格化する「データ取得の型」の最小プレビューです。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/package.json` ほか | CLI で更新: `npm install react-router` |
| `frontend/src/main.tsx` | 生成物を手で編集（BrowserRouter で包む） |
| `frontend/src/App.tsx` | 生成物を手で編集（ヘッダー + Routes に全面書き換え） |
| `frontend/src/App.module.css` `src/pages/Home.module.css` | 手で新規作成（CSS Modules） |
| `frontend/src/pages/Home.tsx` | 手で新規作成 |
| `frontend/src/index.css` | 生成物を手で編集（最小のグローバルスタイルに置換） |
| `frontend/index.html` | 生成物を手で編集（title と lang） |
| 削除: `src/App.css` `src/assets/` `public/vite.svg` | テンプレートのサンプル画面の残骸 |

**編集の順序と理由**: ルータの土台（main → App）→ ページ（Home）→ スタイル。
「アプリ全体の構造 → 個別画面」の外から内の順です（API と逆なのは、UI は
枠がないと画面を差し込む場所がないため）。

読みどころ:

- `HealthState` は**判別可能なユニオン型**。`loading: boolean` と `error: string | null`
  を別々に持つと「loading かつ error」というありえない状態が作れてしまう。
  型で状態遷移を1本道にするのが TypeScript らしい設計
- `useEffect` 内の `cancelled` フラグ: StrictMode（開発時）は effect を2回実行する。
  古い実行の結果で状態を上書きしないための定石（深掘りは S6）

**動作確認（ブラウザ）**: `http://localhost:5176/` を開き、
①ヘッダーに「TODO アプリ」、②本文に「バックエンド API と接続OK」が出れば合格。
`docker compose stop api` してからリロードすると**エラー表示**に変わること、
`start api` で復帰することも確認してください（ローディングは一瞬なので、
開発者ツールの Network タブで throttling をかけると見えます）。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `styles.header` が undefined でクラスが当たらない | ファイル名が `*.module.css` になっていない（`.css` は CSS Modules にならない） |
| 画面が真っ白 | ブラウザのコンソールを開く（JS の実行時エラーは画面でなくコンソールに出る）。import パスのタイポが典型 |
| 「接続OK」でなくエラー表示 | バックエンド未起動（`docker compose ps`）か、プロキシ設定（Step 5-2）に戻る |

**ここでコミット**: `feat: ルーティングと Home 画面を追加（API ヘルス表示・CSS Modules）`

---

### Step 5-4: Vitest + React Testing Library と CI

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/9cd1780)（テスト）・
  [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/ff3f5ce)（CI） /
  ローカル: `git show 9cd1780` `git show ff3f5ce`

**何を・なぜ**: フロントにも「緑の基準」を作ります。Home の3状態を、fetch を
モックして検証します（実 API との結合は S10 の E2E の担当）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/package.json` ほか | CLI で更新: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event` |
| `frontend/vite.config.ts` | 既存ファイルを手で編集（`test:` セクション追加） |
| `frontend/src/setupTests.ts` | 手で新規作成 |
| `frontend/src/pages/Home.test.tsx` | 手で新規作成 |
| `.github/workflows/ci.yml` | 既存ファイルを手で編集（frontend-test ジョブ追加） |

読みどころ:

- ローディング状態のテスト: `new Promise(() => {})`（**永遠に解決しない Promise**）を
  fetch に返させると、ローディング表示のまま止まった状態を検証できる
- `findByText`（現れるまで待つ）と `getByText`（今あるはず）の使い分け。
  fetch 解決後の表示は非同期なので `findBy*` を使う
- CI は `npm ci`（ロックと完全一致、不一致なら失敗）。`npm install` にしない理由は
  uv sync --locked と同じ（再現性 + ロックのコミット忘れ検出）

**動作確認**: `npm test` → 3 passed。`npm run build` も緑（tsc の型チェック込み）。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `document is not defined` | `environment: 'jsdom'` の設定漏れ |
| `toBeInTheDocument is not a function` | setupTests.ts（jest-dom/vitest の import）漏れ、または setupFiles 未登録 |
| CI の npm ci が `EUSAGE` で失敗 | package-lock.json のコミット漏れ |

**ここでコミット**: テストと CI は別コミット
（`test: Vitest + React Testing Library を導入し Home の3状態をテスト` /
`ci: フロントエンドの型チェック・ビルド・テストを CI に追加`）。

---

## スプリント6: ログイン + TODO 一覧

- 計画: [スプリント6 バックログ](../06_sprint6/backlog.md) /
  記録: [レビュー](../06_sprint6/review.md)・[レトロスペクティブ](../06_sprint6/retrospective.md)
- PR: [#6 スプリント6: ログイン + TODO 一覧](https://github.com/morisaki-yuichi/todo-app-example3/pull/6)
- このスプリントの概念: [useEffect と依存配列](concepts.md#useeffect-と依存配列)・
  [React Context](concepts.md#react-context)・[リスト描画と key](concepts.md#リスト描画と-key)・
  [データ取得の3状態パターン](concepts.md#データ取得の3状態パターン)・
  [TypeScript による API との契約](concepts.md#typescript-による-api-との契約)

### 全体の流れ

```text
Step 6-1  API クライアント層（src/api/）… fetch は画面に直書きしない
Step 6-2  認証状態とログイン・登録画面 … Context + ルートガード
Step 6-3  TODO 一覧画面               … 3状態 + 絞り込み + ページャ（実験⑦）
```

S5 レトロの Try T-10 を適用し、**画面より先に API 呼び出し層**を作ります。

---

### Step 6-1: API クライアント層

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/0953ba7) /
  ローカル: `git show 0953ba7`

**何を・なぜ**: fetch の共通処理（`/api` プレフィックス・JSON 変換・エラーの
`ApiError` への正規化）と、バックエンドのスキーマを写した型定義を `src/api/` に
集約します。画面が fetch を直書きすると、S9 の TanStack Query 移行で全画面を
書き換えることになる——**呼び出し口を1枚かませるのは将来の変更の保険**です。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/api/client.ts` | 手で新規作成（apiRequest / ApiError） |
| `frontend/src/api/types.ts` | 手で新規作成（`/openapi.json` を見ながらスキーマを写す） |
| `frontend/src/api/auth.ts` `todos.ts` | 手で新規作成 |

読みどころ:

- `ApiError` は `status` を持つ。画面側は `err.status === 401` のように
  **ステータスコードで分岐**できる（第1部で決めた 401/403/404/409/422 の使い分けが
  ここで報われる）
- `listTodos` の `URLSearchParams`: クエリのエンコードを引き受けてくれるので、
  S2 で観察した「未エンコード URL は 400」問題が構造的に起きない
- 型定義は snake_case のまま（変換層を挟まない）。「契約の確認先は `/openapi.json`」

**動作確認**: `npx tsc -b` が通ること（この層は画面が付くまで実行されない）。

**ここでコミット**: `feat: API クライアント層を追加（fetch 共通化・ApiError・型定義）`

---

### Step 6-2: 認証状態管理とログイン・登録画面

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/ac07651) /
  ローカル: `git show ac07651`
  （lint 警告対応の分離リファクタ: `git show 23245b5`）

**何を・なぜ**: 「いま誰がログインしているか」はヘッダー・ルートガード・
ログイン画面の全員が知りたい情報なので、**React Context** で配ります。
起動時に `/auth/me` を1回叩き、cookie セッションから状態を復元します
（リロードで JS のメモリは消えるが cookie は残る、が SPA の認証の基本形）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/auth/context.ts` | 手で新規作成（Context と型。Fast Refresh の制約でファイル分割） |
| `frontend/src/auth/AuthContext.tsx` | 手で新規作成（AuthProvider） |
| `frontend/src/auth/useAuth.ts` | 手で新規作成（hook） |
| `frontend/src/auth/RequireAuth.tsx` | 手で新規作成（未ログインを /login へ） |
| `frontend/src/pages/Login.tsx` `Register.tsx` `AuthForm.module.css` | 手で新規作成 |
| `frontend/src/App.tsx` `App.module.css` `main.tsx` | 既存ファイルを手で編集（ヘッダー・ルート・Provider） |
| `frontend/src/pages/Login.test.tsx` | 手で新規作成 |
| `frontend/src/setupTests.ts` | 既存ファイルを手で編集（**cleanup 追加**。下記トラブル参照） |

**編集の順序と理由**: context → Provider → hook → ガード → 画面 → 配線（App/main）。
状態の「置き場」を先に作り、それを「使う側」を後に書く順です。

読みどころ:

- `RequireAuth` の `initializing` 待ち: `/auth/me` の応答前に「未ログイン」と
  誤判定して /login へ飛ばさないための待機。**非同期な認証復元には「不明」状態が要る**
- ログインフォームは**制御コンポーネント**（`value` + `onChange`）。
  React の state が唯一の真実で、input はその表示。S7 のフォーム群の基本形
- 401 → 「メールアドレスまたはパスワードが違います」、409 → 「登録済み」——
  `ApiError.status` による分岐がここで効く

**動作確認（ブラウザ）**: `http://localhost:5176/` から
①未ログインで「一覧」を開く → /login へリダイレクト、
②alice@example.com / password123 でログイン → 一覧へ遷移・ヘッダーにメールアドレス、
③誤パスワード → エラーメッセージ、④リロードしてもログイン状態が残る、
⑤ログアウト → /login へ。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `useAuth は AuthProvider の内側でしか使えません` | main.tsx の `<AuthProvider>` の包み忘れ、または Provider の外のコンポーネントで useAuth している |
| ログインしてもリロードで未ログインに戻る | `/auth/me` の呼び出し失敗。Network タブで cookie が送られているか、プロキシ経由か確認 |
| テストで「Found multiple elements」 | RTL の cleanup 漏れ（下記トラブル記録）。前のテストの DOM が残っている |

**ここでコミット**: `feat: 認証状態管理とログイン・登録画面を追加（Context・ルートガード）`

---

### Step 6-3: TODO 一覧画面

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/a6a1d1f) /
  ローカル: `git show a6a1d1f`

**何を・なぜ**: 素の fetch + useEffect で一覧を取得し、3状態（ローディング /
エラー / 空 / 成功）を描き分けます。絞り込み（状態・キーワード）とページネーション
つき。**「手で書くとこれだけの部品が要る」を体験する**のがこのステップで、
S9 で TanStack Query がこの手作業の何を肩代わりするかの伏線です。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/pages/Todos.tsx` `Todos.module.css` | 手で新規作成 |
| `frontend/src/pages/Todos.test.tsx` | 手で新規作成 |

読みどころ:

- `useEffect(..., [page, filter, query])`: **依存配列に挙げた値が変わるたびに再取得**。
  検索は「入力中の値（queryInput）」と「確定した検索語（query）」を分け、
  送信で確定する方式（1文字ごとの fetch を避ける）
- 絞り込み・検索の変更時は `setPage(1)`（3ページ目で絞り込むと空になる、を防ぐ）
- リストの `key={todo.id}`: 配列 index ではなく**安定した id** を使う
  （→ [リスト描画と key](concepts.md#リスト描画と-key)）

**わざと失敗を見る実験⑦: 依存配列の書き漏らし**

`useEffect` の依存配列から `filter` を消して、絞り込みセレクトを操作してみてください
（予想を先に書くこと）。画面はエラーも警告も出さず、**ただ何も変わりません**。
そして本リポジトリでは2つの網がこれを検出します:
①絞り込みのテストが落ちる、②`npm run lint`（oxlint の react-hooks ルール）が
`missing dependency: 'filter'` を警告する。
→ 詳細: [S6 レビュー記録](../06_sprint6/review.md#実験)

**動作確認**: `npm test` → 11 passed。ブラウザで
①alice の15件が新しい順、②「完了」絞り込みで4件、③「牛乳」検索で2件、
④「次へ」で2ページ目（古い5件）、⑤`docker compose stop api` でエラー表示。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| 絞り込み・ページを変えても一覧が変わらない | useEffect の依存配列の書き漏らし（実験⑦）。lint を回す |
| 一覧が2回取得される（Network タブ） | StrictMode の意図的な二重実行（開発時のみ・正常）。cancelled フラグで古い結果を捨てていれば実害なし |
| `Warning: Each child in a list should have a unique "key" prop` | リスト描画の key 忘れ。安定した id を渡す |
| 検索で日本語が化ける・400 | api 層を経由していない生 fetch が紛れている。URLSearchParams を通す |

**写経時の差異**: なし（シードデータが同じなら件数も同じになる）。

**ここでコミット**: `feat: TODO 一覧画面を追加（絞り込み・検索・ページネーション）`

---

## スプリント7: 詳細画面 + 作成・編集・削除フォーム

- 計画: [スプリント7 バックログ](../07_sprint7/backlog.md) /
  記録: [レビュー](../07_sprint7/review.md)・[レトロスペクティブ](../07_sprint7/retrospective.md)
- PR: [#7 スプリント7: CRUD UI の完成](https://github.com/morisaki-yuichi/todo-app-example3/pull/7)
- このスプリントの概念: [制御コンポーネントとフォーム](concepts.md#制御コンポーネントとフォーム)・
  [動的ルートと useParams](concepts.md#動的ルートと-useparams)・
  [更新後の再取得（サーバが真実）](concepts.md#更新後の再取得サーバが真実)

### 全体の流れ

```text
Step 7-1  api 層の拡張        … CRUD 呼び出し + 422 フィールドエラー変換
Step 7-2  詳細画面            … 表示・完了トグル・確認つき削除・404
Step 7-3  作成画面            … 共通部品 TodoForm（422 のフィールド表示）
Step 7-4  編集画面            … TodoForm を初期値つきで再利用
Step 7-5  一覧の完了トグル    … 更新 → 再取得（実験⑧）
```

---

### Step 7-1: api 層の拡張と 422 変換

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/2b625d9) /
  ローカル: `git show 2b625d9`

**何を・なぜ**: getTodo / createTodo / updateTodo / deleteTodo と入力型、
そして S3 実験③で学んだ 422 の `detail` 構造（`loc` = どこが / `msg` = なぜ）を
**フィールド名 → メッセージの辞書に変換する関数**を追加します。
「サーバのバリデーション結果を入力欄の近くに表示する」経路の心臓部です。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/api/todos.ts` | 既存ファイルを手で編集（CRUD 関数と入力型を追加） |
| `frontend/src/api/validation.ts` | 手で新規作成（fieldErrorsFromApiError） |
| `frontend/src/api/validation.test.ts` | 手で新規作成 |

読みどころ: `TodoUpdateInput` の JSDoc。「キーを送らない = 変更しない」「null = 消す」
という PATCH の契約（S3 で決めた仕様）が、フロントの型のコメントとして引き継がれています。

**ここでコミット**: `feat: api 層に TODO の CRUD 呼び出しと 422 フィールドエラー変換を追加`

---

### Step 7-2: 詳細画面

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/4d4cfb8) /
  ローカル: `git show 4d4cfb8`

**何を・なぜ**: `/todos/:id` の詳細画面。URL の `:id` は
[useParams](concepts.md#動的ルートと-useparams) で受けます（**常に文字列**なので数値化）。
状態は loading / success / **not-found** / error の4値——404 は「エラー」ではなく
「見つからないという正常な結果」として専用画面にします。
削除は `window.confirm` による確認ステップつき（誤操作防止の要件はダイアログの
見た目ではなく「1クッション」があること）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/pages/TodoDetail.tsx` `TodoDetail.module.css` | 手で新規作成 |
| `frontend/src/App.tsx` | 既存ファイルを手で編集（`/todos/:id` ルート） |
| `frontend/src/pages/Todos.tsx` `Todos.module.css` | 既存ファイルを手で編集（タイトルを詳細へのリンクに） |
| `frontend/src/pages/TodoDetail.test.tsx` | 手で新規作成 |
| `frontend/src/pages/Todos.test.tsx` | 既存ファイルを手で編集（**MemoryRouter で包む**。下記参照） |

**ハマりどころ（実際に踏んだ）**: 一覧アイテムを `<Link>` にした瞬間、
既存の一覧テストが4本落ちます。`Link` は Router の文脈が必要なので、
`render(<Todos />, { wrapper: MemoryRouter })` に変更します。
「コンポーネントに Router / Context 由来の部品を足したら、そのテストの
ラッパーも増える」は React テストの定番の連鎖です。

**動作確認**: `npm test`。ブラウザでは一覧のタイトル → 詳細 → 全項目表示、
存在しない URL（/todos/99999）で「見つかりません」、削除ボタン → 確認 →
キャンセルで何も起きない / OK で一覧へ戻る。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `useHref may be used only in the context of a Router` / テストで一覧が出ない | Link を Router の外で描画している。テストの wrapper を確認 |
| 詳細が常に 404 | useParams の値は文字列。`Number(id)` の変換と、API へ渡す値を確認 |
| confirm が2回出る | StrictMode ではなく、onClick の二重バインドが典型。ハンドラの付け場所を確認 |

**ここでコミット**: `feat: TODO 詳細画面を追加（完了トグル・確認つき削除・404 表示）`

---

### Step 7-3: 作成画面と共通フォーム部品

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/2b5e526) /
  ローカル: `git show 2b5e526`

**何を・なぜ**: [制御コンポーネント](concepts.md#制御コンポーネントとフォーム)による
`TodoForm` を部品として作り、作成画面 `/todos/new` で使います。
**maxLength をあえて付けない**のは設計判断です: バリデーションの信頼の源泉は
サーバ（Pydantic）にあり、フロントは「422 を正しく画面に届ける」ことに責任を持つ
（クライアント制限は UX の補助で、付けるなら二重管理のずれに注意）。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/components/TodoForm.tsx` `TodoForm.module.css` | 手で新規作成 |
| `frontend/src/pages/TodoNew.tsx` | 手で新規作成 |
| `frontend/src/App.tsx` | 既存ファイルを手で編集（`/todos/new` ルート。**`/todos/:id` より前に定義不要**——React Router は静的セグメントを優先する） |
| `frontend/src/pages/Todos.tsx` ほか | 既存ファイルを手で編集（「+ 新規作成」ボタン） |
| `frontend/src/pages/TodoNew.test.tsx` | 手で新規作成 |

読みどころ: 空欄の description / due_date は `''` ではなく **null に変換して送る**
（「空文字が保存される」を防ぐ。API 側の「null = 未設定」と揃える）。

**動作確認（ブラウザ）**: 「+ 新規作成」→ タイトルだけ入れて作成 → 詳細へ遷移。
**101文字のタイトル**（`あ` を101個）で送信 → タイトル欄の下に
`String should have at most 100 characters` が出れば、S3 実験③の 422 が
画面まで届いています。

**ここでコミット**: `feat: TODO 作成画面を追加（共通 TodoForm・422 のフィールド単位表示）`

---

### Step 7-4: 編集画面

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/a39a488) /
  ローカル: `git show a39a488`

**何を・なぜ**: `/todos/:id/edit`。既存の値を取得して `TodoForm` に `initial` として
渡すだけで、フォーム本体は1行も書き足しません（部品化の回収）。
保存は PATCH で、成功したら詳細へ戻ります。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/pages/TodoEdit.tsx` | 手で新規作成 |
| `frontend/src/App.tsx` | 既存ファイルを手で編集（ルート追加） |
| `frontend/src/pages/TodoEdit.test.tsx` | 手で新規作成 |

**ここでコミット**: `feat: TODO 編集画面を追加（TodoForm を初期値つきで再利用）`

---

### Step 7-5: 一覧の完了トグル

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/b341f96) /
  ローカル: `git show b341f96`

**何を・なぜ**: 一覧のチェックボックスで完了を切り替えます。更新後は手元の配列を
書き換えず**サーバから取り直す**（→ [更新後の再取得](concepts.md#更新後の再取得サーバが真実)）。
`reloadKey` というカウンタを依存配列に足し、更新後にインクリメントする素朴な方式です。

**わざと失敗を見る実験⑧: リストの key を外す**

`<li key={todo.id}>` の `key` を消してみてください（予想を先に書くこと）。
本リポジトリでの結果は予想と少し違いました——テスト出力に React の実行時警告は
現れず、**lint（oxlint の react/jsx-key）だけが確実に検出**しました。
「コンソール警告は人間が見ないと存在しないのと同じ。CI で回る静的検査を網にする」
が学びです。→ [S7 レビュー記録](../07_sprint7/review.md#実験)

**動作確認**: ブラウザで①チェック → バッジが「完了」に変わる（再取得で反映）、
②「完了」絞り込み中に未完了へ戻す → 項目が一覧から消える（絞り込み条件を再適用
した結果）、③詳細画面のトグルボタンでも同様。

**ここでコミット**: `feat: 一覧に完了トグルを追加（更新後はサーバから再取得）`

---

## スプリント8: JWT + CORS への移行

- 計画: [スプリント8 バックログ](../08_sprint8/backlog.md) /
  記録: [レビュー](../08_sprint8/review.md)・[レトロスペクティブ](../08_sprint8/retrospective.md)
- PR: [#8 スプリント8: JWT + CORS への移行](https://github.com/morisaki-yuichi/todo-app-example3/pull/8)
- このスプリントの概念: [JWT](concepts.md#jwt)・
  [CORS とプリフライト](concepts.md#cors-とプリフライト)・
  [cookie セッション vs JWT（CSRF と XSS）](concepts.md#cookie-セッション-vs-jwtcsrf-と-xss)

### 全体の流れ

```text
Step 8-1  実験⑨ + JWT 基盤   … まず「壊れている状態」を観察してから道具を作る
Step 8-2  認証の移行（API）   … cookie セッション → Bearer。sessions テーブル削除
Step 8-3  CORS ミドルウェア   … 実験⑨の 405 が 200 + 許可ヘッダーになる
Step 8-4  フロントの移行      … プロキシ廃止・localStorage・Authorization ヘッダー
```

**注意**: Step 8-2 完了から Step 8-4 完了までの間、フロントは動きません
（バックエンドの認証方式が先に変わるため）。認証方式の移行のような横断変更では
避けられない過渡状態で、「API → フロントの順で、各コミットはその層で完結」の
原則で積んでいます。

---

### Step 8-1: 実験⑨と JWT 基盤

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/94c8d3f) /
  ローカル: `git show 94c8d3f`（鍵長修正: `git show bd0ad5b`）

**まず実験⑨（CORS 未設定の観察）**。実装前の main に対して、ブラウザが
別オリジンから送るのと同じリクエストを curl で再現します。

```bash
# プリフライト（ブラウザが本リクエスト前に送る「お伺い」）
curl -s -X OPTIONS http://localhost:8002/todos \
  -H "Origin: http://localhost:5176" \
  -H "Access-Control-Request-Method: GET" -w "\n[%{http_code}]"
# => 405 Method Not Allowed（OPTIONS を受ける口がない）

# 通常の GET に Origin を付けても、応答に Access-Control-Allow-Origin が無い
curl -s -o /dev/null -D - http://localhost:8002/health \
  -H "Origin: http://localhost:5176" | grep -i "access-control\|HTTP/"
# => HTTP/1.1 200 OK（だけ）
```

**核心の観察**: サーバは 200 でデータを返しています。CORS のブロックは
サーバではなく**ブラウザが**行う——許可ヘッダーの無い応答を JS に渡さないのです
（→ [CORS とプリフライト](concepts.md#cors-とプリフライト)）。

**JWT 基盤**:

| ファイル | 作り方 |
|---|---|
| `backend/pyproject.toml` `uv.lock` | CLI で更新: `uv add pyjwt` |
| `backend/app/config.py` | 既存ファイルを手で編集（secret_key / 有効期限 / frontend_origin） |
| `backend/app/security.py` | 既存ファイルを手で編集（create_access_token / decode_access_token） |
| `backend/tests/test_security.py` | 既存ファイルを手で編集（往復・期限切れ・改ざん・「鍵なしで読める」） |

読みどころ: テスト `test_jwt_payload_is_readable_without_key`。
**JWT は暗号化ではない**——中身は base64 で誰でも読めます。守っているのは
「改ざんの検出」（署名）だけ。だからペイロードに秘密を入れてはいけない。

**ハマりどころ（実際に踏んだ）**: 開発用の署名鍵を短くすると pyjwt が
`InsecureKeyLengthWarning`（HS256 は32バイト以上必須・RFC 7518）を出します。
警告は放置せず、既定鍵を32バイト以上にして解消しました。

**ここでコミット**: `feat: JWT の発行・検証を追加（署名・期限・改ざん検出のテストつき）`

---

### Step 8-2: 認証の移行（cookie セッション → JWT）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/0bce69e) /
  ローカル: `git show 0bce69e`

**何を・なぜ**: login / register が `{access_token, token_type, user}` を返すようになり、
認証依存は `Authorization: Bearer <JWT>` の検証に変わります。
**logout エンドポイントは廃止**——JWT はサーバ側に「消すべき状態」がないためです
（= 即時失効できない。cookie セッション時代は行削除で即失効できた。最大の対比点）。
不要になった sessions テーブルは削除マイグレーションで落とします。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/schemas.py` | 既存ファイルを手で編集（TokenResponse） |
| `backend/app/routers/auth.py` | 既存ファイルを手で編集（cookie 処理を全廃、トークン応答へ） |
| `backend/app/deps.py` | 既存ファイルを手で編集（Cookie → Authorization ヘッダー検証） |
| `backend/app/models.py` | 既存ファイルを手で編集（UserSession を削除） |
| `backend/migrations/versions/xxxx_drop_sessions_table.py` | CLI で生成: `uv run alembic revision --autogenerate -m "drop sessions table"` → 目視レビュー → `upgrade head`（down/up の往復も検証） |
| `backend/tests/conftest.py` | 既存ファイルを手で編集（login_as が **JWT を署名するだけ**に。DB 不要になるのがステートレスの体感） |
| `backend/tests/test_auth.py` `test_todos_authz.py` | 既存ファイルを手で編集（トークン応答・改ざん/期限切れ 401） |
| `backend/scripts/seed.py` | 既存ファイルを手で編集（UserSession の削除処理を除去） |

**わざと失敗を見る実験⑩: トークンの改ざん・期限切れ**

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/auth/login -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | grep -oP '(?<="access_token":")[^"]+')
curl -s -o /dev/null -w "[%{http_code}]\n" http://localhost:8002/auth/me \
  -H "Authorization: Bearer $TOKEN"                        # [200]
curl -s -w "\n[%{http_code}]\n" http://localhost:8002/auth/me \
  -H "Authorization: Bearer ${TOKEN%????}AAAA"             # [401] 署名4文字の改ざん
```

期限切れはテストで検証しています（`expires_in=timedelta(seconds=-1)` で
過去に期限切れのトークンを作る）。→ [S8 レビュー記録](../08_sprint8/review.md#実験)

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| すべて 401 になる | Authorization ヘッダーの形式（`Bearer ` プレフィックス・空白1個）を確認。curl では `-H` の引用符も |
| しばらくすると 401（さっきまで動いていた） | トークンの期限切れ（既定60分）。再ログインで復活するならこれ。フロントは 401 を「再ログインへの誘導」として扱う |
| `InsecureKeyLengthWarning` | SECRET_KEY が32バイト未満（Step 8-1 参照） |

**写経時の差異**: トークンの値・リビジョン ID は毎回異なります。
コマンド例はシェル変数（`$TOKEN`）で受けて使い回してください。

**ここでコミット**: `feat: 認証を cookie セッションから JWT（Bearer）に移行し sessions テーブルを削除`

---

### Step 8-3: CORS ミドルウェア

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/06579c2) /
  ローカル: `git show 06579c2`

**何を・なぜ**: FastAPI の CORSMiddleware で、許可するオリジン
（`.env` の `FRONTEND_ORIGIN`）に「ブラウザへの許可証」を発行します。
`allow_origins=["*"]` にしないのは、「どこのサイト上の JS からの利用を許すか」は
明示管理すべき情報だからです。

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `backend/app/main.py` | 既存ファイルを手で編集（add_middleware） |
| `backend/tests/test_cors.py` | 手で新規作成（許可オリジンのプリフライト / 実応答 / 許可外） |
| `.env.example` `.env` `compose.yaml` | 既存ファイルを手で編集（SECRET_KEY / FRONTEND_ORIGIN / VITE_API_URL） |

**動作確認**: 実験⑨と同じコマンドが今度は成功します。

```bash
curl -s -X OPTIONS http://localhost:8002/todos -H "Origin: http://localhost:5176" \
  -H "Access-Control-Request-Method: GET" -o /dev/null -D - | grep -i "HTTP/\|access-control"
# => 200 + access-control-allow-origin: http://localhost:5176
```

テストの読みどころ: `test_unknown_origin_gets_no_allow_header`——許可外オリジンにも
サーバは 200 を返すが、許可ヘッダーが無いのでブラウザが JS への受け渡しを拒む。
「CORS はブラウザが守る」をテストの形で残しています。

**ここでコミット**: `feat: CORS ミドルウェアを追加（許可オリジンは .env 駆動）`

---

### Step 8-4: フロントの移行（プロキシ廃止・Bearer 方式）

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/e3730c7) /
  ローカル: `git show e3730c7`

**何を・なぜ**: フロントの変更は4点。

1. `src/api/token.ts`（新規）: トークンの保管。**localStorage を選んだ理由と
   XSS リスク**はファイル冒頭のコメントと概念解説集に明記
2. `src/api/client.ts`: `/api` プレフィックス → `VITE_API_URL` の絶対 URL。
   Authorization ヘッダーを自動付与（**api 層に集約した設計（S6 Try T-10）の回収**——
   画面側は1行も変えずに認証方式が切り替わる）
3. `src/api/auth.ts` / `AuthContext`: 応答からトークンを保存。
   **logout は同期関数**になった（トークンを捨てるだけ。サーバ呼び出しなし）
4. `vite.config.ts`: proxy 削除・envDir をルートに（VITE_API_URL を読む）

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/src/api/token.ts` | 手で新規作成 |
| `frontend/src/api/client.ts` `auth.ts` | 既存ファイルを手で編集 |
| `frontend/src/auth/context.ts` `AuthContext.tsx` `src/App.tsx` | 既存ファイルを手で編集（logout の同期化ほか） |
| `frontend/vite.config.ts` | 既存ファイルを手で編集（proxy 削除・envDir） |
| `frontend/src/setupTests.ts` | 既存ファイルを手で編集（localStorage のメモリ実装固定。下記トラブル参照） |
| `frontend/package.json` | CLI で更新: `npm pkg set scripts.check="npm run lint && npm test && npm run build"`（Try T-13） |

**動作確認（ブラウザ）**: `npm run dev` を**再起動**してから、
①ログイン → 一覧 → CRUD 一巡がプロキシなしで動く、
②開発者ツールの Network タブでリクエスト先が `http://localhost:8002/...`
（別オリジン）になっており、リクエストヘッダーに `Authorization: Bearer ...` がある、
③Application タブ → Local Storage にトークンが見える（= JS から読める、が XSS リスクの意味）、
④ログアウト → トークンが消え、/todos がログイン画面へ。

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| ブラウザのコンソールに `blocked by CORS policy: Response to preflight request doesn't pass access control check` | API 側の FRONTEND_ORIGIN とフロントの実オリジン（ポート含む）の不一致が典型。api コンテナの再起動漏れも疑う |
| すべての API が 401 | localStorage にトークンが無い（ログインし直す）か、Authorization ヘッダーが付いていない（Network タブで実リクエストを見る） |
| VITE_API_URL が反映されない | dev サーバの再起動漏れ（env は起動時に読む）。envDir がルートを指しているかも確認 |
| テストで `localStorage.getItem is not a function` | Node の実験的 WebStorage が jsdom を覆い隠す環境がある。setupTests のメモリ実装固定を確認（下記トラブル記録） |

**ここでコミット**: `feat: フロントを別オリジン + Bearer トークン方式に移行（プロキシ廃止）`

---

## スプリント9: TanStack Query 導入

- 計画: [スプリント9 バックログ](../09_sprint9/backlog.md) /
  記録: [レビュー](../09_sprint9/review.md)・[レトロスペクティブ](../09_sprint9/retrospective.md)
- PR: [#9 スプリント9: TanStack Query 導入](https://github.com/morisaki-yuichi/todo-app-example3/pull/9)
- このスプリントの概念: [サーバ状態とキャッシュ（TanStack Query）](concepts.md#サーバ状態とキャッシュtanstack-query)・
  [queryKey と無効化](concepts.md#querykey-と無効化)

### 全体の流れ

```text
Step 9-1  基盤 + 一覧の移行   … QueryClientProvider・useQuery・useMutation（実験⑪）
Step 9-2  詳細の移行          … setQueryData と removeQueries の使い分け
Step 9-3  作成・編集の移行    … mutateAsync で 422 経路を維持
```

**移行の方針（S8 レトロ Try T-15 の適用）**: 画面単位で置き換え、
**各コミットでアプリ全体が動く状態を保つ**。TanStack Query と素の fetch は
同居できるため、S8 のような「壊れる区間」は発生しない。
Home はあえて素の fetch のまま残し、対比サンプルとして保存する。

### 移行で「消えた」もの（このスプリントの主旨）

| 手書きしていたもの（S6〜S7） | 置き換わった先 |
|---|---|
| 3状態の型（ListState 等）と setState の分岐 | `isPending` / `isError` / `data` |
| useEffect + 依存配列 | `queryKey`（条件が変われば別の住所 = 取り直し） |
| cancelled フラグ（StrictMode 対応） | ライブラリが管理 |
| reloadKey カウンタ（更新後の再取得） | `invalidateQueries` |
| （なかった機能）画面に戻ったとき即表示 | キャッシュがあるので一瞬で表示 + 裏で再取得 |
| （なかった機能）ページ移動のちらつき | `placeholderData: keepPreviousData` |

---

### Step 9-1: 基盤導入と一覧画面の移行

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/e57a064) /
  ローカル: `git show e57a064`

**足場の作り方**

| ファイル | 作り方 |
|---|---|
| `frontend/package.json` ほか | CLI で更新: `npm install @tanstack/react-query` |
| `frontend/src/main.tsx` | 既存ファイルを手で編集（QueryClientProvider。retry: false の理由はコメント参照） |
| `frontend/src/pages/Todos.tsx` | 既存ファイルを手で編集（**全面書き換え**。差分を読むのが最良の教材） |
| `frontend/src/test-utils.tsx` | 手で新規作成（Router + QueryClient のテスト用ラッパー） |
| `frontend/src/pages/Todos.test.tsx` | 既存ファイルを手で編集（ラッパー変更・waitFor 追加） |

読みどころ（差分で見る）:

- `queryKey: ['todos', listParams]` —— S6 実験⑦で学んだ「依存配列の書き漏らし」
  問題が、「パラメータをキーに含め忘れる」問題に形を変える。ただしキーは
  queryFn のすぐ隣に書くので漏れに気づきやすい
- テストは**振る舞い不変**を確認する形になった（同じテストが通る =
  リファクタリングの安全網が機能した）。非同期の再取得だけ `waitFor` で待つ

**わざと失敗を見る実験⑪: invalidateQueries を外す**

トグルの `onSuccess` から `invalidateQueries` をコメントアウトしてみてください
（予想を先に書くこと）。PATCH は成功する（サーバは更新済み）のに、
**一覧は古いキャッシュのまま何も変わりません**。エラーも警告も出ない——
「キャッシュを持つ」ことの代償は「古くなったと宣言する責任」です。
検出網はトグルのテスト（「一覧を取り直す」）が担います。
なお実ブラウザでは `refetchOnWindowFocus`（既定 on）が、ウィンドウを
切り替えて戻った拍子に取り直すため「たまに直る」不可解なバグに見えます。
→ [S9 レビュー記録](../09_sprint9/review.md#実験)

**よくあるエラーと症状**

| 症状 | 原因の辿り方 |
|---|---|
| `No QueryClient set, use QueryClientProvider to set one` | Provider の包み忘れ（main.tsx / テストのラッパー） |
| 更新したのに画面が変わらない | invalidateQueries の漏れ（実験⑪）か、queryKey の不一致（`['todos']` と `['todo', id]` は別の住所） |
| 検索条件を変えても取り直さない | queryKey にそのパラメータが入っていない（依存配列漏れの Query 版） |

**ここでコミット**: `feat: TanStack Query を導入し一覧画面を移行（useQuery・invalidateQueries）`

---

### Step 9-2: 詳細画面の移行

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/16da5da) /
  ローカル: `git show 16da5da`

読みどころは**キャッシュ操作の3つの使い分け**:

- トグル成功時: `setQueryData(['todo', id], updated)` ——
  PATCH の応答に最新の Todo が入っているので、**再取得せずキャッシュを直接更新**
  （1リクエスト節約）。一覧側は `invalidateQueries` で「次に見るとき取り直し」
- 削除成功時: `removeQueries(['todo', id])` —— 取り直しても 404 になるものは
  無効化でなく**削除**
- 404 の扱い: `todoQuery.error` が `ApiError` の 404 なら専用画面
  （S7 の not-found 状態と同じ見た目を、error 経由で実現）

**ここでコミット**: `feat: 詳細画面を useQuery / useMutation に移行（キャッシュ直接更新と無効化）`

---

### Step 9-3: 作成・編集画面の移行

- 差分: [GitHub](https://github.com/morisaki-yuichi/todo-app-example3/commit/eccb465) /
  ローカル: `git show eccb465`

読みどころ:

- `mutateAsync` を使う理由: 失敗時に**例外を投げ直す**ので、TodoForm の
  422 フィールド表示（ApiError の捕捉、S7）が変更なしで機能し続ける
  （`mutate` は例外を投げず onError に流すため、フォームの経路が切れる）
- **ハマりどころ（実際に踏んだ）**: `mutationFn: createTodo` と直接渡すと、
  ライブラリが第2引数（コンテキスト）も渡すため、テストのモック検証が
  「余分な引数」で落ちた。`(values) => createTodo(values)` と包んで
  「値だけを渡す」契約を明示する

**動作確認（ブラウザ）**: CRUD 一巡が S7 と同じに動くこと（振る舞い不変）に加え、
**一覧 → 詳細 → 一覧と戻ったとき、一覧が一瞬で表示される**（キャッシュ）ことと、
Network タブで裏の再取得（stale-while-revalidate）が走ることを見てください。
「素の fetch 時代には毎回ローディングだった」との違いが体感できます。

**ここでコミット**: `feat: 作成・編集画面を useMutation に移行（mutateAsync で 422 経路を維持）`

---

## ユーザーストーリー × 実装コミット × PR の対応マップ

| ストーリー / PBI | コミット | PR |
|---|---|---|
| PBI-01 開発環境の土台 | f57e888, 6f9b22e, 10ba57d | [#1](https://github.com/morisaki-yuichi/todo-app-example3/pull/1) |
| PBI-02 テストと CI | f3380e2, 7308219 | [#1](https://github.com/morisaki-yuichi/todo-app-example3/pull/1) |
| PBI-03 DB 基盤 | a90f4f2, 127bcb8, d10ef76, dd99303, 7494359 | [#2](https://github.com/morisaki-yuichi/todo-app-example3/pull/2) |
| US-04 一覧（API・認可は S4） | e0b220b, 773493b | [#2](https://github.com/morisaki-yuichi/todo-app-example3/pull/2) |
| US-05 詳細（API・認可は S4） | ac77f15 | [#2](https://github.com/morisaki-yuichi/todo-app-example3/pull/2) |
| US-03 作成（API・認可は S4） | 2b29c74 | [#3](https://github.com/morisaki-yuichi/todo-app-example3/pull/3) |
| US-06 編集（API・認可は S4） | 05eb51c | [#3](https://github.com/morisaki-yuichi/todo-app-example3/pull/3) |
| US-07 削除（API・認可は S4） | 684e6d6 | [#3](https://github.com/morisaki-yuichi/todo-app-example3/pull/3) |
| US-01 登録 / US-02 ログイン（API編） | f627cd7, 6061e10 | [#4](https://github.com/morisaki-yuichi/todo-app-example3/pull/4) |
| US-08 認可（API編） + US-03〜07 の 401/403 回収 | 46f39ec, e1c9476 | [#4](https://github.com/morisaki-yuichi/todo-app-example3/pull/4) |
| PBI-11 フロント環境の土台 | b182af6, d06ffe9, a99091b, 9cd1780, ff3f5ce | [#5](https://github.com/morisaki-yuichi/todo-app-example3/pull/5) |
| US-01/02 登録・ログイン（フロント編） | 0953ba7, ac07651, 23245b5 | [#6](https://github.com/morisaki-yuichi/todo-app-example3/pull/6) |
| US-04 一覧（フロント編） | a6a1d1f | [#6](https://github.com/morisaki-yuichi/todo-app-example3/pull/6) |
| US-05 詳細（フロント編） | 2b625d9, 4d4cfb8 | [#7](https://github.com/morisaki-yuichi/todo-app-example3/pull/7) |
| US-03 作成（フロント編） | 2b5e526 | [#7](https://github.com/morisaki-yuichi/todo-app-example3/pull/7) |
| US-06 編集・完了切替（フロント編） | a39a488, b341f96 | [#7](https://github.com/morisaki-yuichi/todo-app-example3/pull/7) |
| US-07 削除・確認ステップ（フロント編） | 4d4cfb8 | [#7](https://github.com/morisaki-yuichi/todo-app-example3/pull/7) |
| PBI-16 JWT + CORS 移行（US-02 の方式変更） | 94c8d3f, bd0ad5b, 0bce69e, 06579c2, e3730c7 | [#8](https://github.com/morisaki-yuichi/todo-app-example3/pull/8) |
| PBI-17 TanStack Query 移行（US-04 ほかの方式変更） | e57a064, 16da5da, eccb465 | [#9](https://github.com/morisaki-yuichi/todo-app-example3/pull/9) |

## コミットに残っていない出来事の一覧

コミット履歴は「完成形」しか残しません。途中の試行錯誤は以下に記録しています。

| 出来事 | 記録先 |
|---|---|
| 実験①: ports を外す → connection refused の観察 | [S1 レビュー記録](../01_sprint1/review.md#実験) |
| httpx の非推奨警告 → httpx2 への切り替え | [S1 レビュー記録](../01_sprint1/review.md#トラブル記録) |
| ポート 8000/5173/5432 が使用中 → 8002/5176/5433 に決定 | [QAログ](qa-log.md) |
| 実験②: upgrade 前の autogenerate → `Target database is not up to date.` | [S2 レビュー記録](../02_sprint2/review.md#実験) |
| シードの `python scripts/seed.py` 直接実行 → ModuleNotFoundError（`-m` で解決） | [S2 レビュー記録](../02_sprint2/review.md#トラブル記録) |
| 日本語クエリの未エンコード URL → uvicorn が 400 で拒否 | [S2 レビュー記録](../02_sprint2/review.md#トラブル記録) |
| 実験③: title 欠落 POST → 422 の detail（loc/type/msg/input）の読み方 | [S3 レビュー記録](../03_sprint3/review.md#実験) |
| 実験④: NOT NULL 列の一発追加 → NotNullViolation → 3段階移行に修正 | [S4 レビュー記録](../04_sprint4/review.md#実験) |
| 実験⑤: 認可チェックを外す → 他人の TODO が 200 で漏える・ペアテストが検出 | [S4 レビュー記録](../04_sprint4/review.md#実験) |
| コンテナ内 venv への新依存の未同期 → ImportError でリロード死 → restart で解決 | [S4 レビュー記録](../04_sprint4/review.md#トラブル記録) |
| 実験⑥: プロキシを外す → 404 ではなく 200 + index.html（JSON パースエラーの正体） | [S5 レビュー記録](../05_sprint5/review.md#実験) |
| git pull 直後の Vite 設定再読込レース → プロキシ停止 → dev サーバ再起動で解決 | [S5 レビュー記録](../05_sprint5/review.md#トラブル記録) |
| 実験⑦: useEffect の依存配列漏れ → 画面が更新されない（テストと lint が検出） | [S6 レビュー記録](../06_sprint6/review.md#実験) |
| RTL の cleanup 漏れで「Found multiple elements」 | [S6 レビュー記録](../06_sprint6/review.md#トラブル記録) |
| 実験⑧: key を外す → 実行時警告は観測できず、lint（jsx-key）が検出 | [S7 レビュー記録](../07_sprint7/review.md#実験) |
| Link 追加で既存一覧テストが4本失敗（Router ラッパー不足）→ 修正 | [S7 レビュー記録](../07_sprint7/review.md#トラブル記録) |
| 実験⑨: CORS 未設定 → プリフライト 405・許可ヘッダーなし（ブラウザが守る） | [S8 レビュー記録](../08_sprint8/review.md#実験) |
| 実験⑩: JWT の改ざん・期限切れ → 401 | [S8 レビュー記録](../08_sprint8/review.md#実験) |
| pyjwt の InsecureKeyLengthWarning（鍵は32バイト以上） | [S8 レビュー記録](../08_sprint8/review.md#トラブル記録) |
| Node の実験的 WebStorage が jsdom の localStorage を覆い隠す | [S8 レビュー記録](../08_sprint8/review.md#トラブル記録) |
| 実験⑪: invalidateQueries を外す → 更新が画面に出ない（キャッシュの代償） | [S9 レビュー記録](../09_sprint9/review.md#実験) |
| mutationFn に直接 api 関数を渡すと第2引数（コンテキスト）が混入 | [S9 レビュー記録](../09_sprint9/review.md#トラブル記録) |
