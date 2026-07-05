import { useEffect, useState } from 'react'
import styles from './Home.module.css'

// 「読み込み中 / 成功 / 失敗」を1つの型で表現する（判別可能なユニオン型）。
// boolean を2つ持つより、ありえない状態（loading かつ error 等）を型で排除できる
type HealthState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; message: string }

export function Home() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    // StrictMode では effect が2回走る（開発時のみ）。cancelled フラグで
    // 「古い実行の結果で状態を上書きしない」ようにする定石（詳細は S6）
    let cancelled = false

    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(() => {
        if (!cancelled) setHealth({ status: 'ok' })
      })
      .catch((err: unknown) => {
        if (!cancelled) setHealth({ status: 'error', message: String(err) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h1>ようこそ</h1>
      <p>マルチユーザーの TODO アプリ（第2部で画面を育てていきます）。</p>
      {health.status === 'loading' && (
        <p className={styles.loading}>API の状態を確認中…</p>
      )}
      {health.status === 'ok' && (
        <p className={styles.ok}>バックエンド API と接続OK</p>
      )}
      {health.status === 'error' && (
        <p className={styles.error}>
          API に接続できません（{health.message}）。バックエンドが起動しているか、
          docker compose ps で確認してください。
        </p>
      )}
    </section>
  )
}
