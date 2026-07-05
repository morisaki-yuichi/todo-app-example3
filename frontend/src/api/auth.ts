import { apiRequest } from './client'
import type { User } from './types'

export function login(email: string, password: string): Promise<User> {
  return apiRequest<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(email: string, password: string): Promise<User> {
  return apiRequest<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

/** ログイン中ユーザーを返す。未ログインなら 401 の ApiError が投げられる */
export function fetchMe(): Promise<User> {
  return apiRequest<User>('/auth/me')
}
