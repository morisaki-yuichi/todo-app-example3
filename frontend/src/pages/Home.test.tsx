import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

// fetch をモックする。環境構築段階のテストは「3状態の描き分け」だけを対象にし、
// 実 API との結合は E2E（S10 の Playwright）で検証する
function mockFetch(response: Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(Promise.resolve(response)),
  )
}

describe('Home', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('最初はローディングを表示する', () => {
    mockFetch(new Promise(() => {})) // 永遠に解決しない = ローディングのまま

    render(<Home />)

    expect(screen.getByText(/API の状態を確認中/)).toBeInTheDocument()
  })

  it('API が正常なら接続OKを表示する', async () => {
    mockFetch(Response.json({ status: 'ok' }))

    render(<Home />)

    // findBy* は「現れるまで待つ」。fetch の解決は非同期なので getBy* では早すぎる
    expect(
      await screen.findByText(/バックエンド API と接続OK/),
    ).toBeInTheDocument()
  })

  it('API がエラーを返したらエラー表示になる', async () => {
    mockFetch(new Response('oops', { status: 500 }))

    render(<Home />)

    expect(await screen.findByText(/API に接続できません/)).toBeInTheDocument()
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument()
  })
})
