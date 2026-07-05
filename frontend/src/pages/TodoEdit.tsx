import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { getTodo, updateTodo } from '../api/todos'
import type { Todo } from '../api/types'
import { TodoForm } from '../components/TodoForm'

type EditState =
  | { status: 'loading' }
  | { status: 'success'; todo: Todo }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function TodoEdit() {
  const { id } = useParams()
  const todoId = Number(id)
  const navigate = useNavigate()
  const [state, setState] = useState<EditState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
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

  if (state.status === 'loading') {
    return <p>読み込み中…</p>
  }
  if (state.status === 'not-found') {
    return (
      <section>
        <h1>TODO が見つかりません</h1>
        <p>
          <Link to="/todos">一覧へ戻る</Link>
        </p>
      </section>
    )
  }
  if (state.status === 'error') {
    return <p role="alert">編集対象を取得できませんでした（{state.message}）</p>
  }

  const { todo } = state
  return (
    <section>
      <p>
        <Link to={`/todos/${todo.id}`}>← 詳細へ戻る</Link>
      </p>
      <h1>TODO を編集</h1>
      <TodoForm
        initial={{
          title: todo.title,
          description: todo.description,
          due_date: todo.due_date,
        }}
        submitLabel="保存する"
        onSubmit={async (values) => {
          await updateTodo(todo.id, values)
          navigate(`/todos/${todo.id}`)
        }}
      />
    </section>
  )
}
