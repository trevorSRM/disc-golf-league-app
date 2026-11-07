"use server"

import { actionErrorMessage } from "@/lib/action-error"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { buildSeasonSummary } from "@/lib/data"

// Freeze a season's results. The database rejects any later update or delete.
export async function lockSeason(year: number): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { data: existing } = await supabase.from("season_summaries").select("year").eq("year", year).maybeSingle()
    if (existing) return { success: false, error: `${year} is already locked.` }

    const summary = await buildSeasonSummary(year)
    if (!summary.singles && !summary.doubles && !summary.stats?.events) {
      return { success: false, error: `No ${year} results found to lock.` }
    }

    const { error } = await supabase.from("season_summaries").insert({ year, data: summary })
    if (error) throw error

    revalidatePath("/")
    revalidatePath("/seasons")
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Error locking season:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to lock season") }
  }
}
