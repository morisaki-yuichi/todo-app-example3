/** API 呼び出しの共通処理。画面コンポーネントは fetch を直接使わず、
 *  必ずこの層（src/api/）を経由する。
 *  - 接続先（別オリジンの API）の URL 付与。S8 でプロキシ方式から移行した
 *  - Authorization: Bearer ヘッダーの付与（JWT。localStorage から取得）
 *  - JSON の変換と Content-Type の付与
 *  - エラーレスポンスの ApiError への変換（status で画面側が分岐できる）
 */

import { getToken } from './token'

// 別オリジンの API に直接アクセスする（CORS はサーバ側で許可済み）。
// 接続先はルート .env の VITE_API_URL（Vite が import.meta.env に注入する）
const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8002'

export class ApiError extends Error {
  readonly status: number
  /** バックエンドの detail（422 ではフィールド単位の配列が入る） */
  readonly detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail
    const message =
      typeof detail === 'string' ? detail : `HTTP ${response.status}`
    throw new ApiError(response.status, message, detail)
  }

  return body as T
}
