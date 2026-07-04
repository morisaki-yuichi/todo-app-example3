"""開発用シードデータの投入スクリプト。

実行方法（backend/ で）: uv run python -m scripts.seed
（`python scripts/seed.py` だと sys.path の関係で `app` が import できない。
 `-m` ならカレントディレクトリが import パスに入る）
注意: users / sessions / todos を洗い替える（全削除 → 投入）。開発 DB 専用。

投入されるデモユーザー（パスワードは全員 password123）:
- alice@example.com … TODO 15件の持ち主
- bob@example.com   … TODO 2件の持ち主（403 の動作確認用）
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete
from sqlmodel import Session

from app.db import engine
from app.models import Todo, User, UserSession
from app.security import hash_password

BASE_TIME = datetime(2026, 7, 1, 9, 0, 0, tzinfo=timezone.utc)
DEMO_PASSWORD = "password123"

ALICE_SEEDS = [
    # (title, description, due_date, completed)
    ("牛乳を買う", "低脂肪を2本", date(2026, 7, 6), False),
    ("週報を書く", "先週分のふりかえりも含める", date(2026, 7, 7), False),
    ("会議室を予約する", None, date(2026, 7, 8), True),
    ("経費精算", "6月分のレシートをまとめる", date(2026, 7, 10), False),
    ("歯医者の予約", None, None, True),
    ("読書: SQLアンチパターン", "3章まで", None, False),
    ("ジョギング 5km", None, date(2026, 7, 5), True),
    ("植木の水やり", "ベランダの3鉢", None, False),
    ("請求書の支払い", "電気・水道", date(2026, 7, 15), False),
    ("牛乳の定期便を解約する", "余りがち", None, False),
    ("プレゼン資料の下書き", "構成案だけでも", date(2026, 7, 9), False),
    ("図書館に本を返す", "延滞注意", date(2026, 7, 4), True),
    ("キーボードの掃除", None, None, False),
    ("親に電話する", None, date(2026, 7, 12), False),
    ("バックアップの確認", "外付けHDDの空き容量も見る", date(2026, 7, 20), False),
]

BOB_SEEDS = [
    ("ボブの買い物", "アリスからは見えないはず", date(2026, 7, 6), False),
    ("ボブの筋トレ", None, None, True),
]


def build_todos(seeds: list, user: User, base: datetime) -> list[Todo]:
    return [
        Todo(
            title=title,
            description=description,
            due_date=due_date,
            completed=completed,
            user_id=user.id,
            # 一覧の並び（created_at 降順）を確認しやすいよう1時間ずつずらす
            created_at=base + timedelta(hours=i),
            updated_at=base + timedelta(hours=i),
        )
        for i, (title, description, due_date, completed) in enumerate(seeds)
    ]


def main() -> None:
    demo_hash = hash_password(DEMO_PASSWORD)  # ハッシュ化は重いので1回だけ
    with Session(engine) as session:
        # 外部キーの向きに合わせて子から消す（todos/sessions → users）
        session.execute(delete(Todo))
        session.execute(delete(UserSession))
        session.execute(delete(User))

        alice = User(email="alice@example.com", password_hash=demo_hash)
        bob = User(email="bob@example.com", password_hash=demo_hash)
        session.add(alice)
        session.add(bob)
        session.commit()
        session.refresh(alice)
        session.refresh(bob)

        todos = build_todos(ALICE_SEEDS, alice, BASE_TIME) + build_todos(
            BOB_SEEDS, bob, BASE_TIME
        )
        session.add_all(todos)
        session.commit()
    print(
        f"ユーザー2人（alice/bob, パスワード: {DEMO_PASSWORD}）と "
        f"TODO {len(todos)} 件を投入しました"
    )


if __name__ == "__main__":
    main()
