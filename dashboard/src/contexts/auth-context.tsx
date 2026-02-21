import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import api from '@/lib/axios'
import type { Salon, LoginCredentials, RegisterData } from '@/types'

interface AuthContextValue {
  salon: Salon | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setIsLoading(false)
      return
    }

    api
      .get('/auth/me')
      .then((data: unknown) => {
        const { salon } = data as { salon: Salon }
        setSalon(salon)
      })
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = (await api.post('/auth/login', credentials)) as {
      token: string
      salon: Salon
    }
    localStorage.setItem('token', data.token)
    setSalon(data.salon)
  }, [])

  const register = useCallback(async (regData: RegisterData) => {
    const data = (await api.post('/auth/register', regData)) as {
      token: string
      salon: Salon
    }
    localStorage.setItem('token', data.token)
    setSalon(data.salon)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setSalon(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        salon,
        isLoading,
        isAuthenticated: !!salon,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
