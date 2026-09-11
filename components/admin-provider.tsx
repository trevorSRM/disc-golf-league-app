"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { loginAdmin, logoutAdmin } from "@/app/actions/auth"

interface AdminContextType {
  isAdmin: boolean
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: async () => false,
  logout: async () => {},
})

export function AdminProvider({
  children,
  initialIsAdmin,
}: {
  children: ReactNode
  initialIsAdmin: boolean
}) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)

  const login = async (password: string): Promise<boolean> => {
    const { success } = await loginAdmin(password)
    if (success) {
      setIsAdmin(true)
      router.refresh()
    }
    return success
  }

  const logout = async (): Promise<void> => {
    await logoutAdmin()
    setIsAdmin(false)
    router.push("/")
    router.refresh()
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextType {
  return useContext(AdminContext)
}
