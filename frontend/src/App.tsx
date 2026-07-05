import { Link, NavLink, Route, Routes, useNavigate } from 'react-router'
import { useAuth } from './auth/useAuth'
import { RequireAuth } from './auth/RequireAuth'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { TodoDetail } from './pages/TodoDetail'
import { Todos } from './pages/Todos'
import styles from './App.module.css'

function Header() {
  const { user, initializing, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        TODO アプリ
      </Link>
      <nav className={styles.nav}>
        {initializing ? null : user ? (
          <>
            <NavLink to="/todos">一覧</NavLink>
            <span className={styles.userEmail}>{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.logout}
            >
              ログアウト
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">ログイン</NavLink>
            <NavLink to="/register">新規登録</NavLink>
          </>
        )}
      </nav>
    </header>
  )
}

function App() {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/todos"
            element={
              <RequireAuth>
                <Todos />
              </RequireAuth>
            }
          />
          <Route
            path="/todos/:id"
            element={
              <RequireAuth>
                <TodoDetail />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
