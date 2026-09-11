import { cookies } from "next/headers"

// Set ADMIN_PASSWORD in the environment (Vercel project settings) to override.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "bedifferent"
export const ADMIN_COOKIE = "fcdgl_admin_session"
const SESSION_DAYS = 30

async function sessionToken(): Promise<string> {
  const bytes = new TextEncoder().encode(`fcdgl-admin:${ADMIN_PASSWORD}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const value = cookieStore.get(ADMIN_COOKIE)?.value
  if (!value) return false
  return value === (await sessionToken())
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized: admin login required")
  }
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}
