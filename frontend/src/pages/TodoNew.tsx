import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { createTodo, type TodoCreateInput } from '../api/todos'
import { TodoForm } from '../components/TodoForm'

export function TodoNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    // createTodo を直接渡さずアロー関数で包む: mutationFn には第2引数
    // （ライブラリのコンテキスト）が渡されるため、api 層の関数シグネチャと
    // 混線しないよう「値だけを渡す」ことを明示する
    mutationFn: (values: TodoCreateInput) => createTodo(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      navigate(`/todos/${created.id}`)
    },
  })

  return (
    <section>
      <p>
        <Link to="/todos">← 一覧へ戻る</Link>
      </p>
      <h1>TODO を作成</h1>
      <TodoForm
        submitLabel="作成する"
        onSubmit={async (values) => {
          // mutateAsync は失敗時に例外を投げ直すため、
          // TodoForm の 422 フィールド表示（ApiError の捕捉）がそのまま機能する
          await createMutation.mutateAsync(values)
        }}
      />
    </section>
  )
}
