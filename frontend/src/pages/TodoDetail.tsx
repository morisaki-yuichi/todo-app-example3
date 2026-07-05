import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { deleteTodo, getTodo, updateTodo } from '../api/todos'
import type { Todo } from '../api/types'
import styles from './TodoDetail.module.css'

export function TodoDetail() {
  // URL の :id 部分。useParams が返すのは常に文字列なので数値化する
  const { id } = useParams()
  const todoId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const todoQuery = useQuery({
    queryKey: ['todo', todoId],
    queryFn: () => getTodo(todoId),
  })

  const toggleMutation = useMutation({
    mutationFn: (todo: Todo) =>
      updateTodo(todo.id, { completed: !todo.completed }),
    onSuccess: (updated) => {
      // 詳細のキャッシュは応答で直接更新し（再取得1回分の節約）、
      // 一覧のキャッシュは無効化して次に見るとき取り直させる
      queryClient.setQueryData(['todo', todoId], updated)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: () => {
      window.alert('完了状態の更新に失敗しました')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (todo: Todo) => deleteTodo(todo.id),
    onSuccess: () => {
      // 消えたものの詳細キャッシュは無効化でなく削除する（取り直しても 404 なので）
      queryClient.removeQueries({ queryKey: ['todo', todoId] })
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      navigate('/todos')
    },
    onError: () => {
      window.alert('削除に失敗しました')
    },
  })

  const handleDelete = (todo: Todo) => {
    // 誤操作防止の確認ステップ。キャンセルなら何もしない
    if (
      !window.confirm(`「${todo.title}」を削除しますか？この操作は取り消せません`)
    ) {
      return
    }
    deleteMutation.mutate(todo)
  }

  if (todoQuery.isPending) {
    return <p>読み込み中…</p>
  }
  if (todoQuery.isError) {
    if (
      todoQuery.error instanceof ApiError &&
      todoQuery.error.status === 404
    ) {
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
    return (
      <p role="alert" className={styles.error}>
        詳細を取得できませんでした（{String(todoQuery.error)}）
      </p>
    )
  }

  const todo = todoQuery.data
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
        <button
          type="button"
          onClick={() => toggleMutation.mutate(todo)}
          disabled={toggleMutation.isPending}
        >
          {todo.completed ? '未完了に戻す' : '完了にする'}
        </button>
        <Link to={`/todos/${todo.id}/edit`} className={styles.editLink}>
          編集
        </Link>
        <button
          type="button"
          onClick={() => handleDelete(todo)}
          disabled={deleteMutation.isPending}
          className={styles.deleteButton}
        >
          削除
        </button>
      </div>
    </section>
  )
}
