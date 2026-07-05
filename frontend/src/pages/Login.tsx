import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import styles from './AuthForm.module.css'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 制御コンポーネント: 入力値は React の state が唯一の真実で、
  // input はそれを表示しているだけ（value + onChange のペア）
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/todos'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault() // ブラウザ標準のフォーム送信（ページ遷移）を止める
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('メールアドレスまたはパスワードが違います')
      } else {
        setError('ログインに失敗しました。時間をおいて再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <h1>ログイン</h1>
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
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
      <p>
        アカウントがない場合は <Link to="/register">新規登録</Link>
      </p>
    </section>
  )
}
