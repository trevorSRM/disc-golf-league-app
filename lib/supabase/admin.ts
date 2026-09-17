import { createServerClient } from '@supabase/ssr'

/**
 * Service-role client for admin server actions. It bypasses Row Level
 * Security, so it must only be used after requireAdmin() has passed and must
 * never be imported from client code.
 *
 * SUPABASE_SERVICE_ROLE_KEY is added by the Vercel <-> Supabase integration
 * (Supabase dashboard -> Project Settings -> API -> service_role).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    },
  )
}
