import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AuthError, authRequest } from '../lib/auth'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const request = useRef(null)

  const authenticate = useCallback((nextUser) => {
    request.current?.abort()
    setUser(nextUser)
    setLoading(false)
    setError('')
  }, [])

  const refresh = useCallback(() => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    authRequest('me', undefined, controller.signal)
      .then(nextUser => {
        if (!controller.signal.aborted) setUser(nextUser)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        if (err instanceof AuthError && err.status === 401) setUser(null)
        else setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    refresh()
    return () => request.current?.abort()
  }, [refresh])

  const logout = async () => {
    await authRequest('logout', {})
    authenticate(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
