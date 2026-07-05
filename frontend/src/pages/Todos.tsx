import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { listTodos, updateTodo } from '../api/todos'
import type { Todo } from '../api/types'
import styles from './Todos.module.css'

type CompletedFilter = 'all' | 'active' | 'done'

export function Todos() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<CompletedFilter>('all')
  // 「入力中の値」と「確定した検索語」を分ける。入力のたびに fetch しないため
  const [queryInput, setQueryInput] = useState('')
  const [searchWord, setSearchWord] = useState('')

  const listParams = {
    page,
    completed: filter === 'all' ? undefined : filter === 'done',
    q: searchWord || undefined,
  }

  // queryKey = このデータの「住所」。パラメータが変われば別の住所 = 取り直し。
  // S6 で依存配列 + cancelled フラグ + 3状態を手書きしていた仕事がこの1つに集約される
  const todosQuery = useQuery({
    queryKey: ['todos', listParams],
    queryFn: () => listTodos(listParams),
    // ページ移動中は前ページのデータを表示し続ける（ローディングのちらつき防止）
    placeholderData: keepPreviousData,
  })

  const queryClient = useQueryClient()
  const toggleMutation = useMutation({
    mutationFn: (todo: Todo) =>
      updateTodo(todo.id, { completed: !todo.completed }),
    onSuccess: () => {
      // 「'todos' で始まる住所のキャッシュはもう古い」と宣言する。
      // 表示中の一覧は自動で再取得される（reloadKey カウンタの正統な後継）
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: () => {
      window.alert('完了状態の更新に失敗しました')
    },
  })

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearchWord(queryInput)
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

      {todosQuery.isPending && <p>読み込み中…</p>}

      {todosQuery.isError && (
        <p role="alert" className={styles.error}>
          一覧を取得できませんでした（{String(todosQuery.error)}）
        </p>
      )}

      {todosQuery.isSuccess && todosQuery.data.items.length === 0 && (
        <p className={styles.empty}>
          {searchWord || filter !== 'all'
            ? '条件に合う TODO はありません'
            : 'TODO はまだありません'}
        </p>
      )}

      {todosQuery.isSuccess && todosQuery.data.items.length > 0 && (
        <>
          <ul className={styles.list}>
            {todosQuery.data.items.map((todo) => (
              // key: React が「どの行がどの行か」を追跡するための一意な目印。
              // 配列の index ではなく安定した id を使う（並び替え・削除で壊れないため）
              <li key={todo.id} className={styles.item}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleMutation.mutate(todo)}
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
            page={todosQuery.data.page}
            perPage={todosQuery.data.per_page}
            total={todosQuery.data.total}
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
