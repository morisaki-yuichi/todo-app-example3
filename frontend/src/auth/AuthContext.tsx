import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import type { User } from '../api/types'

/** アプリ全体で共有する認証状態。
 *  ヘッダー・ルートガード・ログイン画面が同じ状態を見る必要があるため、
 *  props のバケツリレーではなく Context で配る。
 */
type AuthContextValue = {
  /** ログイン中のユーザー。未ログインなら null */
  user: User | null
  /** 起動直後の「/auth/me で復元中」フラグ。true の間は判定を保留する */
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  // 起動時に1回だけ、cookie セッションからログイン状態を復元する。
  // リロードしても JS のメモリは消えるが、cookie は残っている——
  // 「誰か」をサーバに聞き直すのがこの処理
  useEffect(() => {
    let cancelled = false
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        // 401 = 未ログイン。異常ではないので握りつぶして null のままにする
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

  const logout = async () => {
    await authApi.logout()
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth は AuthProvider の内側でしか使えません')
  }
  return context
}
