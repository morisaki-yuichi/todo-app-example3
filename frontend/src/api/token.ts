/** JWT の保管場所（localStorage）。
 *
 *  選択の理由と代償（概念解説集「cookie セッション vs JWT」参照）:
 *  - localStorage は実装が単純で、CORS の credentials 設定も不要
 *  - ただし JS から読める = XSS に弱い。XSS を1発でも許すとトークンが盗まれる。
 *    httpOnly cookie 方式はその点強いが、CSRF 対策と CORS 設定が複雑になる
 *  - 本教材は「仕組みの見えやすさ」を優先して localStorage を採用し、
 *    リスクを隠さず明記する
 */

const STORAGE_KEY = 'todo_app.access_token'

export function getToken(): string | null {
  return window.localStorage.getItem(STORAGE_KEY)
}

export function setToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
