import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './context'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth は AuthProvider の内側でしか使えません')
  }
  return context
}
