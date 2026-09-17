"use server"

import { actionErrorMessage } from "@/lib/action-error"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { DoublesEvent } from "@/lib/types"

export async function createDoublesEvent(
  eventDate: string,
  courseName: string | null
): Promise<{ success: boolean; event?: DoublesEvent; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("doubles_events")
      .insert({ 
        event_date: eventDate,
        course_name: courseName 
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/doubles")
    
    return { success: true, event: data }
  } catch (error) {
    console.error("Error creating doubles event:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to create event") }
  }
}

export async function deleteDoublesEvent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    
    // Delete teams first
    await supabase.from("doubles_teams").delete().eq("event_id", id)
    
    const { error } = await supabase
      .from("doubles_events")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/doubles")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting doubles event:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to delete event") }
  }
}

export async function saveDoublesTeams(
  eventId: string,
  teams: { player1_id: string; player2_id: string; team_handicap: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    
    // Delete existing teams for this event
    await supabase.from("doubles_teams").delete().eq("event_id", eventId)
    
    // Insert new teams
    if (teams.length > 0) {
      const records = teams.map(t => ({
        event_id: eventId,
        player1_id: t.player1_id,
        player2_id: t.player2_id,
        team_handicap: t.team_handicap
      }))
      
      const { error } = await supabase
        .from("doubles_teams")
        .insert(records)
      
      if (error) throw error
    }
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/doubles")
    
    return { success: true }
  } catch (error) {
    console.error("Error saving doubles teams:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to save teams") }
  }
}

export async function updateDoublesScores(
  teams: { id: string; score: number | null }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    
    for (const team of teams) {
      const { error } = await supabase
        .from("doubles_teams")
        .update({ score: team.score })
        .eq("id", team.id)
      
      if (error) throw error
    }
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/doubles")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating doubles scores:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to update scores") }
  }
}
