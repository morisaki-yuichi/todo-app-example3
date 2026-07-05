import { useState, type FormEvent } from 'react'
import { fieldErrorsFromApiError, type FieldErrors } from '../api/validation'
import styles from './TodoForm.module.css'

export type TodoFormValues = {
  title: string
  description: string | null
  due_date: string | null
}

type Props = {
  /** 編集時の初期値。作成時は省略 */
  initial?: TodoFormValues
  submitLabel: string
  /** 保存処理。ApiError を投げれば 422 はフィールド別に表示される */
  onSubmit: (values: TodoFormValues) => Promise<void>
}

/** 作成・編集で共用するフォーム。
 *
 *  文字数の maxLength をあえて付けていないのは、バリデーションの信頼の源泉を
 *  サーバ（Pydantic）に置くため。サーバの 422 を loc でフィールドに割り付けて
 *  表示する経路（fieldErrorsFromApiError）がこのフォームの主役。
 */
export function TodoForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        title,
        // 空文字は「未入力」として null で送る（'' を保存しない）
        description: description || null,
        due_date: dueDate || null,
      })
    } catch (err) {
      const fields = fieldErrorsFromApiError(err)
      if (fields) {
        setFieldErrors(fields)
      } else {
        setFormError('保存に失敗しました。時間をおいて再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}
      <label className={styles.field}>
        タイトル（必須・100文字まで）
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {fieldErrors.title && (
          <span role="alert" className={styles.fieldError}>
            {fieldErrors.title}
          </span>
        )}
      </label>
      <label className={styles.field}>
        説明（任意・1000文字まで）
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        {fieldErrors.description && (
          <span role="alert" className={styles.fieldError}>
            {fieldErrors.description}
          </span>
        )}
      </label>
      <label className={styles.field}>
        期限日（任意）
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {fieldErrors.due_date && (
          <span role="alert" className={styles.fieldError}>
            {fieldErrors.due_date}
          </span>
        )}
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? '保存中…' : submitLabel}
      </button>
    </form>
  )
}
