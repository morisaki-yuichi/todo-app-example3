import { Link, useNavigate } from 'react-router'
import { createTodo } from '../api/todos'
import { TodoForm } from '../components/TodoForm'

export function TodoNew() {
  const navigate = useNavigate()

  return (
    <section>
      <p>
        <Link to="/todos">← 一覧へ戻る</Link>
      </p>
      <h1>TODO を作成</h1>
      <TodoForm
        submitLabel="作成する"
        onSubmit={async (values) => {
          const created = await createTodo(values)
          navigate(`/todos/${created.id}`)
        }}
      />
    </section>
  )
}
