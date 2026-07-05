import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'

/** テストごとに独立した QueryClient を作る（キャッシュをテスト間で共有しない）。
 *  retry: false は本体（main.tsx）と同じ理由 + テストの失敗を即時に見るため。
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

type Options = {
  initialEntries?: string[]
}

/** Router + QueryClient を備えたレンダリング（ページテスト用の標準装備）。 */
export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'] }: Options = {},
) {
  const queryClient = createTestQueryClient()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  )
}
