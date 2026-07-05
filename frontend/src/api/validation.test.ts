import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { fieldErrorsFromApiError } from './validation'

describe('fieldErrorsFromApiError', () => {
  it('422 の detail をフィールド別エラーに変換する', () => {
    const err = new ApiError(422, 'HTTP 422', [
      {
        type: 'string_too_long',
        loc: ['body', 'title'],
        msg: 'String should have at most 100 characters',
      },
      { type: 'missing', loc: ['body', 'due_date'], msg: 'Field required' },
    ])

    expect(fieldErrorsFromApiError(err)).toEqual({
      title: 'String should have at most 100 characters',
      due_date: 'Field required',
    })
  })

  it('同じフィールドの2件目以降は無視する（最初の1件を表示）', () => {
    const err = new ApiError(422, 'HTTP 422', [
      { type: 'a', loc: ['body', 'title'], msg: '最初のエラー' },
      { type: 'b', loc: ['body', 'title'], msg: '2件目のエラー' },
    ])

    expect(fieldErrorsFromApiError(err)).toEqual({ title: '最初のエラー' })
  })

  it('422 以外や想定外の形は null（呼び出し側で全体エラー扱い）', () => {
    expect(fieldErrorsFromApiError(new ApiError(500, 'HTTP 500'))).toBeNull()
    expect(
      fieldErrorsFromApiError(new ApiError(422, 'x', 'ただの文字列')),
    ).toBeNull()
    expect(fieldErrorsFromApiError(new Error('boom'))).toBeNull()
  })
})
