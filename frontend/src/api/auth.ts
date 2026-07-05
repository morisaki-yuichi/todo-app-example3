import { apiRequest } from './client'
import { clearToken, setToken } from './token'
import type { User } from './types'

/** ログイン・登録 API の応答（backend の TokenResponse に対応） */
type TokenResponse = {
  access_token: string
  token_type: 'bearer'
  user: User
}

export async function login(email: string, password: string): Promise<User> {
  const response = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(response.access_token)
  return response.user
}

export async function register(email: string, password: string): Promise<User> {
  const response = await apiRequest<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(response.access_token)
  return response.user
}

/** ログアウト = トークンを捨てるだけ。
 *  JWT はサーバ側に「消すべき状態」がないため、サーバ呼び出しは無い
 *  （cookie セッション時代はサーバの行削除 = 即時失効だった。対比は概念解説集）
 */
export function logout(): void {
  clearToken()
}

/** ログイン中ユーザーを返す。トークンが無い・無効なら 401 の ApiError */
export function fetchMe(): Promise<User> {
  return apiRequest<User>('/auth/me')
}
