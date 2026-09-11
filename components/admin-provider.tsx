"use client"

// v2 - No throw on missing context
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AdminContextType {
  isAdmin: boolean
  login: (password: string) => boolean
  logout: () => void
}

const defaultContextValue: AdminContextType = {
  isAdmin: false,
  login: () => false,
  logout: () => {},
}

const AdminContext = createContext<AdminContextType>(defaultContextValue)

const ADMIN_PASSWORD = "bedifferent"
const STORAGE_KEY = "fcdgl_admin"

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "true") {
        setIsAdmin(true)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      try {
        localStorage.setItem(STORAGE_KEY, "true")
      } catch {
        // ignore
      }
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdmin(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const contextValue: AdminContextType = {
    isAdmin: mounted ? isAdmin : false,
    login,
    logout,
  }

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextType {
  return useContext(AdminContext)
}
