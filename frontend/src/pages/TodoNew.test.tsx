import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import * as todosApi from '../api/todos'
import type { Todo } from '../api/types'
import { TodoNew } from './TodoNew'

vi.mock('../api/todos')

const mockedApi = vi.mocked(todosApi)

function renderNew() {
  render(
    <MemoryRouter initialEntries={['/todos/new']}>
      <Routes>
        <Route path="/todos/new" element={<TodoNew />} />
        <Route path="/todos/:id" element={<p>詳細ページ（スタブ）</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TodoNew', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('入力値で作成し、作成された TODO の詳細へ遷移する', async () => {
    mockedApi.createTodo.mockResolvedValue({ id: 42 } as Todo)
    const user = userEvent.setup()

    renderNew()
    await user.type(screen.getByLabelText(/タイトル/), '牛乳を買う')
    await user.type(screen.getByLabelText(/期限日/), '2026-07-10')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    expect(mockedApi.createTodo).toHaveBeenCalledWith({
      title: '牛乳を買う',
      description: null, // 空欄は '' ではなく null で送る
      due_date: '2026-07-10',
    })
    expect(await screen.findByText('詳細ページ（スタブ）')).toBeInTheDocument()
  })

  it('422 はフィールドの近くにエラーを表示する', async () => {
    mockedApi.createTodo.mockRejectedValue(
      new ApiError(422, 'HTTP 422', [
        {
          type: 'string_too_long',
          loc: ['body', 'title'],
          msg: 'String should have at most 100 characters',
        },
      ]),
    )
    const user = userEvent.setup()

    renderNew()
    await user.type(screen.getByLabelText(/タイトル/), 'あ'.repeat(101))
    await user.click(screen.getByRole('button', { name: '作成する' }))

    // タイトル欄のラベル配下にエラーメッセージが現れる
    expect(
      await screen.findByText('String should have at most 100 characters'),
    ).toBeInTheDocument()
    expect(screen.queryByText('詳細ページ（スタブ）')).not.toBeInTheDocument()
  })

  it('422 以外の失敗は全体エラーとして表示する', async () => {
    mockedApi.createTodo.mockRejectedValue(new ApiError(500, 'HTTP 500'))
    const user = userEvent.setup()

    renderNew()
    await user.type(screen.getByLabelText(/タイトル/), '作成失敗')
    await user.click(screen.getByRole('button', { name: '作成する' }))

    expect(
      await screen.findByText(/保存に失敗しました/),
    ).toBeInTheDocument()
  })
})
