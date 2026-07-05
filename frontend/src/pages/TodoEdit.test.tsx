import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '../test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as todosApi from '../api/todos'
import type { Todo } from '../api/types'
import { TodoEdit } from './TodoEdit'

vi.mock('../api/todos')

const mockedApi = vi.mocked(todosApi)

const TODO: Todo = {
  id: 5,
  title: '牛乳を買う',
  description: '低脂肪を2本',
  due_date: '2026-07-06',
  completed: false,
  created_at: '2026-07-01T09:00:00Z',
  updated_at: '2026-07-01T09:00:00Z',
}

function renderEdit() {
  renderWithProviders(
    <Routes>
      <Route path="/todos/:id/edit" element={<TodoEdit />} />
      <Route path="/todos/:id" element={<p>詳細ページ（スタブ）</p>} />
    </Routes>,
    { initialEntries: ['/todos/5/edit'] },
  )
}

describe('TodoEdit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('既存の値がフォームに入っている', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)

    renderEdit()

    expect(await screen.findByLabelText(/タイトル/)).toHaveValue('牛乳を買う')
    expect(screen.getByLabelText(/説明/)).toHaveValue('低脂肪を2本')
    expect(screen.getByLabelText(/期限日/)).toHaveValue('2026-07-06')
  })

  it('変更を保存すると PATCH され、詳細へ戻る', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)
    mockedApi.updateTodo.mockResolvedValue({ ...TODO, title: '豆乳を買う' })
    const user = userEvent.setup()

    renderEdit()
    const titleInput = await screen.findByLabelText(/タイトル/)
    await user.clear(titleInput)
    await user.type(titleInput, '豆乳を買う')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(mockedApi.updateTodo).toHaveBeenCalledWith(5, {
      title: '豆乳を買う',
      description: '低脂肪を2本',
      due_date: '2026-07-06',
    })
    expect(await screen.findByText('詳細ページ（スタブ）')).toBeInTheDocument()
  })
})
