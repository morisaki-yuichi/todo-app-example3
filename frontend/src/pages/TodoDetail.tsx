import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { deleteTodo, getTodo, updateTodo } from '../api/todos'
import type { Todo } from '../api/types'
import styles from './TodoDetail.module.css'

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; todo: Todo }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function TodoDetail() {
  // URL の :id 部分。useParams が返すのは常に文字列なので数値化する
  const { id } = useParams()
  const todoId = Number(id)
  const navigate = useNavigate()
  const [state, setState] = useState<DetailState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    getTodo(todoId)
      .then((todo) => {
        if (!cancelled) setState({ status: 'success', todo })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: String(err) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [todoId])

  const handleToggle = async (todo: Todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed })
      setState({ status: 'success', todo: updated })
    } catch {
      window.alert('完了状態の更新に失敗しました')
    }
  }

  const handleDelete = async (todo: Todo) => {
    // 誤操作防止の確認ステップ。キャンセルなら何もしない
    if (
      !window.confirm(`「${todo.title}」を削除しますか？この操作は取り消せません`)
    ) {
      return
    }
    try {
      await deleteTodo(todo.id)
      navigate('/todos')
    } catch {
      window.alert('削除に失敗しました')
    }
  }

  if (state.status === 'loading') {
    return <p>読み込み中…</p>
  }
  if (state.status === 'not-found') {
    return (
      <section>
        <h1>TODO が見つかりません</h1>
        <p>
          削除済みか、URL が誤っている可能性があります。
          <Link to="/todos">一覧へ戻る</Link>
        </p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <p role="alert" className={styles.error}>
        詳細を取得できませんでした（{state.message}）
      </p>
    )
  }

  const { todo } = state
  return (
    <section>
      <p>
        <Link to="/todos">← 一覧へ戻る</Link>
      </p>
      <h1 className={todo.completed ? styles.doneTitle : undefined}>
        {todo.title}
      </h1>
      <dl className={styles.fields}>
        <dt>状態</dt>
        <dd>{todo.completed ? '完了' : '未完了'}</dd>
        <dt>説明</dt>
        <dd>{todo.description ?? <span className={styles.none}>（なし）</span>}</dd>
        <dt>期限日</dt>
        <dd>{todo.due_date ?? <span className={styles.none}>（なし）</span>}</dd>
        <dt>作成日時</dt>
        <dd>{new Date(todo.created_at).toLocaleString()}</dd>
        <dt>更新日時</dt>
        <dd>{new Date(todo.updated_at).toLocaleString()}</dd>
      </dl>
      <div className={styles.actions}>
        <button type="button" onClick={() => handleToggle(todo)}>
          {todo.completed ? '未完了に戻す' : '完了にする'}
        </button>
        <Link to={`/todos/${todo.id}/edit`} className={styles.editLink}>
          編集
        </Link>
        <button
          type="button"
          onClick={() => handleDelete(todo)}
          className={styles.deleteButton}
        >
          削除
        </button>
      </div>
    </section>
  )
}
