import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '../test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import * as todosApi from '../api/todos'
import type { Todo } from '../api/types'
import { TodoDetail } from './TodoDetail'

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

function renderDetail(id = 5) {
  renderWithProviders(
    <Routes>
      <Route path="/todos" element={<p>一覧ページ（スタブ）</p>} />
      <Route path="/todos/:id" element={<TodoDetail />} />
    </Routes>,
    { initialEntries: [`/todos/${id}`] },
  )
}

describe('TodoDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('全項目を表示する', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)

    renderDetail()

    expect(
      await screen.findByRole('heading', { name: '牛乳を買う' }),
    ).toBeInTheDocument()
    expect(screen.getByText('低脂肪を2本')).toBeInTheDocument()
    expect(screen.getByText('2026-07-06')).toBeInTheDocument()
    expect(screen.getByText('未完了')).toBeInTheDocument()
    expect(mockedApi.getTodo).toHaveBeenCalledWith(5)
  })

  it('存在しない ID は「見つかりません」を表示する', async () => {
    mockedApi.getTodo.mockRejectedValue(new ApiError(404, 'Todo not found'))

    renderDetail(9999)

    expect(
      await screen.findByRole('heading', { name: 'TODO が見つかりません' }),
    ).toBeInTheDocument()
  })

  it('「完了にする」で completed を切り替える', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)
    mockedApi.updateTodo.mockResolvedValue({ ...TODO, completed: true })
    const user = userEvent.setup()

    renderDetail()
    await user.click(
      await screen.findByRole('button', { name: '完了にする' }),
    )

    expect(mockedApi.updateTodo).toHaveBeenCalledWith(5, { completed: true })
    expect(
      await screen.findByRole('button', { name: '未完了に戻す' }),
    ).toBeInTheDocument()
  })

  it('削除は確認 OK で実行され、一覧へ戻る', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)
    mockedApi.deleteTodo.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    renderDetail()
    await user.click(await screen.findByRole('button', { name: '削除' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockedApi.deleteTodo).toHaveBeenCalledWith(5)
    expect(await screen.findByText('一覧ページ（スタブ）')).toBeInTheDocument()
  })

  it('削除の確認をキャンセルしたら何もしない', async () => {
    mockedApi.getTodo.mockResolvedValue(TODO)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderDetail()
    await user.click(await screen.findByRole('button', { name: '削除' }))

    expect(mockedApi.deleteTodo).not.toHaveBeenCalled()
    // 画面にも留まる
    expect(
      screen.getByRole('heading', { name: '牛乳を買う' }),
    ).toBeInTheDocument()
  })
})
