"use server"

import { actionErrorMessage } from "@/lib/action-error"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { FinaleTiebreaks } from "@/lib/types"

function revalidateFinale() {
  revalidatePath("/")
  revalidatePath("/finale")
  revalidatePath("/admin")
  revalidatePath("/money")
}

// Set (or clear, with no winners) the winner of one finale CTP prize.
export async function saveFinaleCtp(
  weekId: string,
  ctpKey: string,
  winnerPlayerIds: string[],
  winnerLabel: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    if (winnerPlayerIds.length === 0) {
      const { error } = await supabase
        .from("finale_ctps")
        .delete()
        .eq("week_id", weekId)
        .eq("ctp_key", ctpKey)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("finale_ctps")
        .upsert(
          { week_id: weekId, ctp_key: ctpKey, winner_player_ids: winnerPlayerIds, winner_label: winnerLabel },
          { onConflict: "week_id,ctp_key" }
        )
      if (error) throw error
    }

    revalidateFinale()
    return { success: true }
  } catch (error) {
    console.error("Error saving finale CTP:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to save CTP") }
  }
}

// Store playoff results for tied paid positions.
export async function saveFinaleTiebreaks(
  weekId: string,
  tiebreaks: FinaleTiebreaks
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("weeks")
      .update({ finale_tiebreaks: tiebreaks })
      .eq("id", weekId)
    if (error) throw error

    revalidateFinale()
    return { success: true }
  } catch (error) {
    console.error("Error saving finale tiebreaks:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to save playoff results") }
  }
}
