import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

function applyAuthResult(setUser, result) {
  if (!result?.requiresVerification) {
    setUser({
      userId: result.userId,
      name: result.name,
      email: result.email,
      healthId: result.healthId,
      role: result.role,
      profileImageUrl: result.profileImageUrl,
    })
  }
  return result
}

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
    if (res.requiresVerification) {
      return res
    }
    applyAuthResult(setUser, res)
    await refreshProfile()
    return res
  }

  const register = async (data) => {
    const res = await api.register(data)
    if (res.requiresVerification) {
      return res
    }
    applyAuthResult(setUser, res)
    await refreshProfile()
    return res
  }

  const verifyEmail = useCallback(async (data) => {
    const res = await api.verifyEmail(data)
    applyAuthResult(setUser, res)
    await refreshProfile()
    return res
  }, [refreshProfile])

  const resendVerification = useCallback(async (data) => api.resendVerification(data), [])

  const googleLogin = async (code, redirectUri) => {
    const res = await api.googleAuth({ code, redirectUri })
    setUser(res)
    await refreshProfile()
    return res
  }

  const logout = () => {
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      register,
      verifyEmail,
      resendVerification,
      googleLogin,
      logout,
      refreshProfile,
      setProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
