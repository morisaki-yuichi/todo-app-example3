import { apiRequest } from './client'
import type { Todo, TodoListResponse } from './types'

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

/** 作成リクエストの形（backend の TodoCreate に対応） */
export type TodoCreateInput = {
  title: string
  description?: string | null
  due_date?: string | null
}

/** 部分更新の形（backend の TodoUpdate に対応）。
 *  「キーを送らない = 変更しない」「null = 消す」の区別があるため、
 *  変更したいキーだけを持つオブジェクトを渡すこと
 */
export type TodoUpdateInput = {
  title?: string
  description?: string | null
  due_date?: string | null
  completed?: boolean
}

export function getTodo(id: number): Promise<Todo> {
  return apiRequest<Todo>(`/todos/${id}`)
}

export function createTodo(input: TodoCreateInput): Promise<Todo> {
  return apiRequest<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTodo(id: number, input: TodoUpdateInput): Promise<Todo> {
  return apiRequest<Todo>(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteTodo(id: number): Promise<void> {
  return apiRequest<void>(`/todos/${id}`, { method: 'DELETE' })
}
