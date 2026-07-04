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
| US-01, 02, 08 | （S4 で実装） | — |

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
