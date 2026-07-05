import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthContext.tsx'
import './index.css'
import App from './App.tsx'

// サーバ状態（API から取ったデータ）のキャッシュ置き場。
// retry を切っているのは教材上の判断: 既定の3回リトライは本番の一時障害に
// 強い一方、開発・学習では「失敗がすぐ見える」ほうが調査しやすい
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
