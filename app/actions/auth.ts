"use server"

import { checkPassword, setAdminSession, clearAdminSession } from "@/lib/admin-auth"

export async function loginAdmin(password: string): Promise<{ success: boolean }> {
  if (!checkPassword(password)) {
    // Small delay to slow down brute-force attempts
    await new Promise((r) => setTimeout(r, 500))
    return { success: false }
  }
  await setAdminSession()
  return { success: true }
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession()
}
