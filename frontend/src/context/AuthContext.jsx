import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const p = await api.getProfile()
      setProfile(p)
      setUser({ userId: p.userId, name: p.name, email: p.email, healthId: p.healthId, role: p.role, profileImageUrl: p.profileImageUrl })
    } catch {
      setUser(null)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  const login = async (email, password) => {
    const res = await api.login({ email, password })
    setUser(res)
    await refreshProfile()
    return res
  }

  const register = async (data) => {
    const res = await api.register(data)
    setUser(res)
    await refreshProfile()
    return res
  }

  const googleLogin = async (code, redirectUri) => {
    const res = await api.googleAuth({ code, redirectUri })
    setUser(res)
    await refreshProfile()
    return res
  }

  const githubLogin = async (code, redirectUri) => {
    const res = await api.githubAuth({ code, redirectUri })
    setUser(res)
    await refreshProfile()
    return res
  }

  const logout = () => {
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, googleLogin, githubLogin, logout, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
