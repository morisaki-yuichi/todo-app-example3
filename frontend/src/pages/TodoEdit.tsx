import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { getTodo, updateTodo } from '../api/todos'
import type { TodoUpdateInput } from '../api/todos'
import { TodoForm } from '../components/TodoForm'

export function TodoEdit() {
  const { id } = useParams()
  const todoId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const todoQuery = useQuery({
    queryKey: ['todo', todoId],
    queryFn: () => getTodo(todoId),
  })

  const updateMutation = useMutation({
    mutationFn: (values: TodoUpdateInput) => updateTodo(todoId, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(['todo', todoId], updated)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      navigate(`/todos/${todoId}`)
    },
  })

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
            <Link to="/todos">一覧へ戻る</Link>
          </p>
        </section>
      )
    }
    return (
      <p role="alert">編集対象を取得できませんでした（{String(todoQuery.error)}）</p>
    )
  }

  const todo = todoQuery.data
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
          await updateMutation.mutateAsync(values)
        }}
      />
    </section>
  )
}
