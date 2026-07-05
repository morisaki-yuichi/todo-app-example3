import { Link, Route, Routes } from 'react-router'
import { Home } from './pages/Home'
import styles from './App.module.css'

function App() {
  return (
    <div>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          TODO アプリ
        </Link>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* 一覧・詳細・ログインのルートは S6 で追加する */}
        </Routes>
      </main>
    </div>
  )
}

export default App
