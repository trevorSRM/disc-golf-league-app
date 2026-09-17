"use server"

import { actionErrorMessage } from "@/lib/action-error"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { LeagueFinances } from "@/lib/types"

export async function updateFinances(
  updates: Partial<LeagueFinances>
): Promise<{ success: boolean; finances?: LeagueFinances; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    // Get existing finances
    const { data: existing } = await supabase
      .from("league_finances")
      .select("*")
      .limit(1)
      .single()
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("league_finances")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      
      if (error) throw error
      
      revalidatePath("/")
      revalidatePath("/admin")
      revalidatePath("/money")
      
      return { success: true, finances: data }
    } else {
      // Create new
      const { data, error } = await supabase
        .from("league_finances")
        .insert({
          ace_pool: updates.ace_pool || 0,
          total_collected: updates.total_collected || 0,
          total_paid_out: updates.total_paid_out || 0
        })
        .select()
        .single()
      
      if (error) throw error
      
      revalidatePath("/")
      revalidatePath("/admin")
      revalidatePath("/money")
      
      return { success: true, finances: data }
    }
  } catch (error) {
    console.error("Error updating finances:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to update finances") }
  }
}

export async function deleteAce(
  aceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("aces")
      .delete()
      .eq("id", aceId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/money")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting ace:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to delete ace") }
  }
}

export async function recordAce(
  playerId: string,
  date: string,
  payout: number,
  holeNumber: number | null,
  courseName: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    // Record the ace
    const { error: aceError } = await supabase
      .from("aces")
      .insert({
        player_id: playerId,
        date,
        payout,
        hole_number: holeNumber,
        course_name: courseName
      })
    
    if (aceError) throw aceError
    
    // Reset ace pool to 0 and add to paid out
    const { data: existing } = await supabase
      .from("league_finances")
      .select("*")
      .limit(1)
      .single()
    
    if (existing) {
      await supabase
        .from("league_finances")
        .update({
          ace_pool: 0,
          total_paid_out: (existing.total_paid_out || 0) + payout,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
    }
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/money")
    
    return { success: true }
  } catch (error) {
    console.error("Error recording ace:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to record ace") }
  }
}
