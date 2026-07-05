import { ApiError } from './client'

/** フィールド名 → エラーメッセージ（そのフィールドの最初の1件） */
export type FieldErrors = Record<string, string>

type ValidationItem = {
  loc?: unknown[]
  msg?: string
}

/** 422 の ApiError から、フィールド単位のエラーを取り出す。
 *
 *  FastAPI(Pydantic) の 422 は detail が配列で、各要素の loc が
 *  ["body", "title"] の形（どこが）、msg が説明（なぜ）になっている
 *  （S3 実験③参照）。loc[1] をキーにして入力欄の近くに表示できる形へ変換する。
 *  422 以外・形が想定外のときは null を返し、呼び出し側で全体エラーとして扱う。
 */
export function fieldErrorsFromApiError(err: unknown): FieldErrors | null {
  if (!(err instanceof ApiError) || err.status !== 422) {
    return null
  }
  if (!Array.isArray(err.detail)) {
    return null
  }

  const errors: FieldErrors = {}
  for (const item of err.detail as ValidationItem[]) {
    const field = item.loc?.[1]
    if (typeof field === 'string' && item.msg && !(field in errors)) {
      errors[field] = item.msg
    }
  }
  return Object.keys(errors).length > 0 ? errors : null
}
