import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { ApiError } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { Login } from './Login'

// API 層を丸ごとモックする。画面のテストは「API が返す値に対して
// 画面がどう振る舞うか」だけを対象にする
vi.mock('../api/auth')

const mockedAuth = vi.mocked(authApi)

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/todos" element={<p>一覧ページ（スタブ）</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // 起動時の /auth/me は「未ログイン」にしておく
    mockedAuth.fetchMe.mockRejectedValue(new ApiError(401, 'Not authenticated'))
  })

  it('ログインに成功すると一覧へ遷移する', async () => {
    mockedAuth.login.mockResolvedValue({ id: 1, email: 'alice@example.com' })
    const user = userEvent.setup()
    renderLogin()

    await user.type(
      screen.getByLabelText(/メールアドレス/),
      'alice@example.com',
    )
    await user.type(screen.getByLabelText(/パスワード/), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('一覧ページ（スタブ）')).toBeInTheDocument()
    expect(mockedAuth.login).toHaveBeenCalledWith(
      'alice@example.com',
      'password123',
    )
  })

  it('401 ならエラーメッセージを表示して画面に留まる', async () => {
    mockedAuth.login.mockRejectedValue(
      new ApiError(401, 'Incorrect email or password'),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/メールアドレス/), 'alice@example.com')
    await user.type(screen.getByLabelText(/パスワード/), 'wrongwrong')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(
      await screen.findByText('メールアドレスまたはパスワードが違います'),
    ).toBeInTheDocument()
    expect(screen.queryByText('一覧ページ（スタブ）')).not.toBeInTheDocument()
  })
})
