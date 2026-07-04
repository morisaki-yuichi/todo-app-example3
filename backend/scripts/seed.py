"""開発用シードデータの投入スクリプト。

実行方法（backend/ で）: uv run python -m scripts.seed
（`python scripts/seed.py` だと sys.path の関係で `app` が import できない。
 `-m` ならカレントディレクトリが import パスに入る）
注意: todos テーブルを洗い替える（全削除 → 投入）。開発 DB 専用。
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete
from sqlmodel import Session

from app.db import engine
from app.models import Todo

BASE_TIME = datetime(2026, 7, 1, 9, 0, 0, tzinfo=timezone.utc)

SEEDS = [
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


def main() -> None:
    todos = [
        Todo(
            title=title,
            description=description,
            due_date=due_date,
            completed=completed,
            # 一覧の並び（created_at 降順）を確認しやすいよう1時間ずつずらす
            created_at=BASE_TIME + timedelta(hours=i),
            updated_at=BASE_TIME + timedelta(hours=i),
        )
        for i, (title, description, due_date, completed) in enumerate(SEEDS)
    ]
    with Session(engine) as session:
        session.execute(delete(Todo))
        session.add_all(todos)
        session.commit()
    print(f"{len(todos)} 件の TODO を投入しました")


if __name__ == "__main__":
    main()
