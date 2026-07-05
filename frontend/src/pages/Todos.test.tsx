import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listTodos, updateTodo } from '../api/todos'
import type { Todo, TodoListResponse } from '../api/types'
import { Todos } from './Todos'

vi.mock('../api/todos')

const mockedListTodos = vi.mocked(listTodos)
const mockedUpdateTodo = vi.mocked(updateTodo)

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    title: '牛乳を買う',
    description: null,
    due_date: null,
    completed: false,
    created_at: '2026-07-01T09:00:00Z',
    updated_at: '2026-07-01T09:00:00Z',
    ...overrides,
  }
}

function makeResponse(
  items: Todo[],
  overrides: Partial<TodoListResponse> = {},
): TodoListResponse {
  return { items, total: items.length, page: 1, per_page: 10, ...overrides }
}

describe('Todos', () => {
  beforeEach(() => {
    mockedListTodos.mockReset()
  })

  it('一覧を表示する（完了バッジ・期限つき）', async () => {
    mockedListTodos.mockResolvedValue(
      makeResponse([
        makeTodo({ id: 1, title: '牛乳を買う', due_date: '2026-07-06' }),
        makeTodo({ id: 2, title: '週報を書く', completed: true }),
      ]),
    )

    render(<Todos />, { wrapper: MemoryRouter })

    expect(await screen.findByText('牛乳を買う')).toBeInTheDocument()
    expect(screen.getByText('週報を書く')).toBeInTheDocument()
    expect(screen.getByText('期限: 2026-07-06')).toBeInTheDocument()
    // 「完了」は絞り込みの <option> にも存在するため、リスト内に限定して探す
    const list = screen.getByRole('list')
    expect(within(list).getByText('完了')).toBeInTheDocument()
  })

  it('0件なら空メッセージを表示する', async () => {
    mockedListTodos.mockResolvedValue(makeResponse([]))

    render(<Todos />, { wrapper: MemoryRouter })

    expect(
      await screen.findByText('TODO はまだありません'),
    ).toBeInTheDocument()
  })

  it('取得に失敗したらエラーを表示する', async () => {
    mockedListTodos.mockRejectedValue(new Error('boom'))

    render(<Todos />, { wrapper: MemoryRouter })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '一覧を取得できませんでした',
    )
  })

  it('状態の絞り込みを変えると completed つきで再取得し、1ページ目に戻る', async () => {
    mockedListTodos.mockResolvedValue(makeResponse([makeTodo()]))
    const user = userEvent.setup()

    render(<Todos />, { wrapper: MemoryRouter })
    await screen.findByText('牛乳を買う')

    await user.selectOptions(
      screen.getByLabelText('状態で絞り込み'),
      'done',
    )

    expect(mockedListTodos).toHaveBeenLastCalledWith({
      page: 1,
      completed: true,
      q: undefined,
    })
  })

  it('「次へ」で次ページを取得する', async () => {
    mockedListTodos.mockResolvedValue(
      makeResponse([makeTodo()], { total: 15, page: 1, per_page: 10 }),
    )
    const user = userEvent.setup()

    render(<Todos />, { wrapper: MemoryRouter })
    await screen.findByText('牛乳を買う')

    await user.click(screen.getByRole('button', { name: '次へ' }))

    expect(mockedListTodos).toHaveBeenLastCalledWith({
      page: 2,
      completed: undefined,
      q: undefined,
    })
  })

  it('チェックボックスで完了を切り替え、一覧を取り直す', async () => {
    mockedListTodos.mockResolvedValue(makeResponse([makeTodo()]))
    mockedUpdateTodo.mockResolvedValue({ ...makeTodo(), completed: true })
    const user = userEvent.setup()

    render(<Todos />, { wrapper: MemoryRouter })
    await screen.findByText('牛乳を買う')
    const callsBefore = mockedListTodos.mock.calls.length

    await user.click(
      screen.getByRole('checkbox', { name: '牛乳を買う を完了にする' }),
    )

    expect(mockedUpdateTodo).toHaveBeenCalledWith(1, { completed: true })
    // 更新後に一覧を取り直している（refetch）
    expect(mockedListTodos.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('キーワードを入れて検索すると q つきで再取得する', async () => {
    mockedListTodos.mockResolvedValue(makeResponse([makeTodo()]))
    const user = userEvent.setup()

    render(<Todos />, { wrapper: MemoryRouter })
    await screen.findByText('牛乳を買う')

    await user.type(screen.getByLabelText('キーワード'), '牛乳')
    await user.click(screen.getByRole('button', { name: '検索' }))

    expect(mockedListTodos).toHaveBeenLastCalledWith({
      page: 1,
      completed: undefined,
      q: '牛乳',
    })
  })
})
