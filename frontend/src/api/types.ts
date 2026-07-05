/** バックエンドのレスポンススキーマ（backend/app/schemas.py）を写した型定義。
 *
 *  これが「フロントとバックの契約」。プロパティ名は API の JSON に合わせて
 *  snake_case のまま扱う（変換層を挟まないぶん、ズレが起きにくい）。
 *  手写しゆえにバックエンドの変更で古びる弱点があり、確認先は /openapi.json。
 *  （OpenAPI からの型自動生成は発展課題として演習編で扱う）
 */

export type Todo = {
  id: number
  title: string
  description: string | null
  /** "YYYY-MM-DD" 形式。Date オブジェクトではない点に注意 */
  due_date: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

export type TodoListResponse = {
  items: Todo[]
  total: number
  page: number
  per_page: number
}

export type User = {
  id: number
  email: string
}
