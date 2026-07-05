import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

/** ログイン必須ページのガード。未ログインなら /login へ飛ばす。
 *  元いた場所を state で渡し、ログイン成功後に戻れるようにする。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    // /auth/me の応答前に「未ログイン」と誤判定してリダイレクトしないための待ち
    return <p>読み込み中…</p>
  }
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
