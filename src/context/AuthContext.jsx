import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ccrs_token'))
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('ccrs_user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('ccrs_token')
    if (!currentToken) {
      setUser(null)
      setLoading(false)
      return null
    }

    try {
      const freshUser = await authAPI.getMe()
      if (freshUser) {
        setUser(freshUser)
        localStorage.setItem('ccrs_user', JSON.stringify(freshUser))
        return freshUser
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh user profile:', err.message)
      // Only clear if explicitly unauthorized
      if (err.message && (err.message.includes('401') || err.message.includes('expired') || err.message.includes('Invalid'))) {
        authAPI.logout()
        setToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const setAuthSession = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    if (newToken) {
      localStorage.setItem('ccrs_token', newToken)
    } else {
      localStorage.removeItem('ccrs_token')
    }
    if (newUser) {
      localStorage.setItem('ccrs_user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('ccrs_user')
    }
  }

  const login = async (arg1, arg2) => {
    // If called as login(token, userObj)
    if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
      setAuthSession(arg1, arg2)
      return { access_token: arg1, user: arg2 }
    }
    // If called as login(identifier, password)
    const data = await authAPI.login(arg1, arg2)
    if (data.access_token) {
      setAuthSession(data.access_token, data.user)
    }
    return data
  }

  const logout = () => {
    authAPI.logout()
    setAuthSession(null, null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    if (userData) {
      localStorage.setItem('ccrs_user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('ccrs_user')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        setAuthSession,
        logout,
        refreshUser,
        setUser: updateUser,
        isAuthenticated: !!token && !!user,
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

export default AuthContext

