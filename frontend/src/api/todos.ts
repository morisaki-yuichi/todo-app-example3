import { apiRequest } from './client'
import type { TodoListResponse } from './types'

export type TodoListParams = {
  page?: number
  completed?: boolean
  q?: string
}

export function listTodos(params: TodoListParams = {}): Promise<TodoListResponse> {
  // URLSearchParams がエンコードを引き受ける（日本語キーワードも安全。
  // S2 で観察した「未エンコード URL は 400」問題はここで構造的に防がれる）
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.completed !== undefined) {
    search.set('completed', String(params.completed))
  }
  if (params.q) search.set('q', params.q)

  const query = search.toString()
  return apiRequest<TodoListResponse>(`/todos${query ? `?${query}` : ''}`)
}
