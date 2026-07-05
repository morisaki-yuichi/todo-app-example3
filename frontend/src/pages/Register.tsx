import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import styles from './AuthForm.module.css'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(email, password) // 成功すると自動ログイン済み
      navigate('/todos', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('このメールアドレスは登録済みです')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('入力内容を確認してください（パスワードは8文字以上）')
      } else {
        setError('登録に失敗しました。時間をおいて再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <h1>新規登録</h1>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className={styles.field}>
          パスワード（8文字以上）
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? '登録中…' : '登録する'}
        </button>
      </form>
      <p>
        登録済みの場合は <Link to="/login">ログイン</Link>
      </p>
    </section>
  )
}
