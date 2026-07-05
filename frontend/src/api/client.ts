/** API 呼び出しの共通処理。画面コンポーネントは fetch を直接使わず、
 *  必ずこの層（src/api/）を経由する。
 *  - /api プレフィックスの付与（Vite プロキシが剥がして API へ転送する）
 *  - JSON の変換と Content-Type の付与
 *  - エラーレスポンスの ApiError への変換（status で画面側が分岐できる）
 */

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
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
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
