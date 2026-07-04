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

## ユーザーストーリー × 実装コミット × PR の対応マップ

| ストーリー / PBI | コミット | PR |
|---|---|---|
| PBI-01 開発環境の土台 | f57e888, 6f9b22e, 10ba57d | [#1](https://github.com/morisaki-yuichi/todo-app-example3/pull/1) |
| PBI-02 テストと CI | f3380e2, 7308219 | [#1](https://github.com/morisaki-yuichi/todo-app-example3/pull/1) |
| US-01〜US-08 | （S2 以降で実装） | — |

## コミットに残っていない出来事の一覧

コミット履歴は「完成形」しか残しません。途中の試行錯誤は以下に記録しています。

| 出来事 | 記録先 |
|---|---|
| 実験①: ports を外す → connection refused の観察 | [S1 レビュー記録](../01_sprint1/review.md#実験) |
| httpx の非推奨警告 → httpx2 への切り替え | [S1 レビュー記録](../01_sprint1/review.md#トラブル記録) |
| ポート 8000/5173/5432 が使用中 → 8002/5176/5433 に決定 | [QAログ](qa-log.md) |
