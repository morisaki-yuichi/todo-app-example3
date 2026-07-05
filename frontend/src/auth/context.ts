import { createContext } from 'react'
import type { User } from '../api/types'

/** アプリ全体で共有する認証状態。
 *  ヘッダー・ルートガード・ログイン画面が同じ状態を見る必要があるため、
 *  props のバケツリレーではなく Context で配る。
 *  （Provider コンポーネントや hook と別ファイルなのは Fast Refresh の制約による）
 */
export type AuthContextValue = {
  /** ログイン中のユーザー。未ログインなら null */
  user: User | null
  /** 起動直後の「/auth/me で復元中」フラグ。true の間は判定を保留する */
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
