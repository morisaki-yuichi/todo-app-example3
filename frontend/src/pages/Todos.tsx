import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { listTodos, updateTodo } from '../api/todos'
import type { Todo, TodoListResponse } from '../api/types'
import styles from './Todos.module.css'

type ListState =
  | { status: 'loading' }
  | { status: 'success'; data: TodoListResponse }
  | { status: 'error'; message: string }

type CompletedFilter = 'all' | 'active' | 'done'

export function Todos() {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<CompletedFilter>('all')
  // 「入力中の値」と「確定した検索語」を分ける。入力のたびに fetch しないため
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  // 完了トグル等の更新後に一覧を取り直すためのカウンタ（依存配列に入れる）
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    listTodos({
      page,
      completed: filter === 'all' ? undefined : filter === 'done',
      q: query || undefined,
    })
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: String(err) })
      })
    return () => {
      cancelled = true
    }
    // 依存配列: ここに挙げた値が変わるたびに再取得する。
    // 1つでも書き漏らすと「変えたのに画面が変わらない」バグになる（実験⑦）
  }, [page, filter, query, reloadKey])

  const handleToggle = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { completed: !todo.completed })
      // 手元の配列を書き換えず、サーバから取り直す（サーバが真実）。
      // 絞り込み中なら、完了にした項目が一覧から消える挙動も正しく反映される
      setReloadKey((key) => key + 1)
    } catch {
      window.alert('完了状態の更新に失敗しました')
    }
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setQuery(queryInput)
    setPage(1) // 検索条件が変わったら1ページ目に戻す
  }

  const handleFilterChange = (next: CompletedFilter) => {
    setFilter(next)
    setPage(1)
  }

  return (
    <section>
      <div className={styles.heading}>
        <h1>TODO 一覧</h1>
        <Link to="/todos/new" className={styles.newButton}>
          + 新規作成
        </Link>
      </div>

      <div className={styles.controls}>
        <select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as CompletedFilter)}
          aria-label="状態で絞り込み"
        >
          <option value="all">すべて</option>
          <option value="active">未完了</option>
          <option value="done">完了</option>
        </select>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="キーワード検索"
            aria-label="キーワード"
          />
          <button type="submit">検索</button>
        </form>
      </div>

      {state.status === 'loading' && <p>読み込み中…</p>}

      {state.status === 'error' && (
        <p role="alert" className={styles.error}>
          一覧を取得できませんでした（{state.message}）
        </p>
      )}

      {state.status === 'success' && state.data.items.length === 0 && (
        <p className={styles.empty}>
          {query || filter !== 'all'
            ? '条件に合う TODO はありません'
            : 'TODO はまだありません'}
        </p>
      )}

      {state.status === 'success' && state.data.items.length > 0 && (
        <>
          <ul className={styles.list}>
            {state.data.items.map((todo) => (
              // key: React が「どの行がどの行か」を追跡するための一意な目印。
              // 配列の index ではなく安定した id を使う（並び替え・削除で壊れないため）
              <li key={todo.id} className={styles.item}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                  aria-label={`${todo.title} を${todo.completed ? '未完了' : '完了'}にする`}
                />
                <span
                  className={
                    todo.completed ? styles.badgeDone : styles.badgeActive
                  }
                >
                  {todo.completed ? '完了' : '未完了'}
                </span>
                <Link to={`/todos/${todo.id}`} className={styles.title}>
                  {todo.title}
                </Link>
                {todo.due_date && (
                  <span className={styles.dueDate}>期限: {todo.due_date}</span>
                )}
              </li>
            ))}
          </ul>
          <Pager
            page={state.data.page}
            perPage={state.data.per_page}
            total={state.data.total}
            onMove={setPage}
          />
        </>
      )}
    </section>
  )
}

function Pager({
  page,
  perPage,
  total,
  onMove,
}: {
  page: number
  perPage: number
  total: number
  onMove: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  return (
    <div className={styles.pager}>
      <button
        type="button"
        onClick={() => onMove(page - 1)}
        disabled={page <= 1}
      >
        前へ
      </button>
      <span>
        {page} / {totalPages} ページ（全 {total} 件）
      </span>
      <button
        type="button"
        onClick={() => onMove(page + 1)}
        disabled={page >= totalPages}
      >
        次へ
      </button>
    </div>
  )
}
