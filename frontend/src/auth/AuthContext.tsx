import { useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { getToken } from '../api/token'
import type { User } from '../api/types'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  // 起動時に1回だけ、保存済みトークンからログイン状態を復元する。
  // リロードしても JS のメモリは消えるが、localStorage のトークンは残っている——
  // それが有効かどうか（期限切れ・改ざんでないか）をサーバに聞き直すのがこの処理
  useEffect(() => {
    if (getToken() === null) {
      // トークンがなければ聞くまでもなく未ログイン
      setInitializing(false)
      return
    }
    let cancelled = false
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        // 401 = トークンが無効（期限切れ等）。異常ではないので null のままにする
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setInitializing(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    setUser(await authApi.login(email, password))
  }

  const register = async (email: string, password: string) => {
    // 登録 API は自動ログイン（cookie 発行）までしてくれる
    setUser(await authApi.register(email, password))
  }

  const logout = () => {
    authApi.logout() // トークン破棄のみ（JWT にサーバ側の失効処理はない）
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, initializing, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
