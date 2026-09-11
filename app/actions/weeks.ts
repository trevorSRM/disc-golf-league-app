"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Week } from "@/lib/types"

export async function createWeek(
  weekNumber: number,
  date: string,
  courseName: string | null,
  isDoubles: boolean = false
): Promise<{ success: boolean; week?: Week; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("weeks")
      .insert({ 
        week_number: weekNumber, 
        date,
        course_name: courseName,
        is_doubles: isDoubles
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true, week: data }
  } catch (error) {
    console.error("Error creating week:", error)
    return { success: false, error: "Failed to create week" }
  }
}

export async function getWeekAttendance(
  weekId: string
): Promise<{ player_id: string; player_name: string; score: number | null; sanctioned: boolean }[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("attendance")
      .select("player_id, score, sanctioned, players(name)")
      .eq("week_id", weekId)
    
    if (error) throw error
    
    return (data || []).map(a => ({
      player_id: a.player_id,
      player_name: ((a.players as unknown) as { name: string } | null)?.name || "Unknown",
      score: a.score,
      sanctioned: a.sanctioned ?? false
    }))
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return []
  }
}

export async function updateWeek(
  id: string,
  data: { date?: string; course_name?: string | null; ctp_winner_id?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("weeks")
      .update(data)
      .eq("id", id)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    revalidatePath("/events")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating week:", error)
    return { success: false, error: "Failed to update week" }
  }
}

export async function deleteWeek(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Delete attendance first (cascade should handle this, but being explicit)
    await supabase.from("attendance").delete().eq("week_id", id)
    
    const { error } = await supabase
      .from("weeks")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting week:", error)
    return { success: false, error: "Failed to delete week" }
  }
}

export async function updateAttendance(
  weekId: string,
  attendanceData: { player_id: string; score: number | null; sanctioned?: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Delete existing attendance for this week
    await supabase.from("attendance").delete().eq("week_id", weekId)
    
    // Insert new attendance records
    if (attendanceData.length > 0) {
      const records = attendanceData.map(a => ({
        week_id: weekId,
        player_id: a.player_id,
        score: a.score,
        sanctioned: a.sanctioned ?? false
      }))
      
      const { error } = await supabase
        .from("attendance")
        .insert(records)
      
      if (error) throw error
    }
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating attendance:", error)
    return { success: false, error: "Failed to update attendance" }
  }
}

export async function updateCTPWinner(
  weekId: string,
  playerId: string | null,
  playoffWinnerId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("weeks")
      .update({ 
        ctp_winner_id: playerId,
        playoff_winner_id: playoffWinnerId
      })
      .eq("id", weekId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating CTP winner:", error)
    return { success: false, error: "Failed to update CTP winner" }
  }
}

export async function saveDoublesTeams(
  weekId: string,
  teams: { player1_id: string; player2_id: string; team_handicap: number }[]
): Promise<{ success: boolean; error?: string; teams?: { id: string; player1_id: string; player2_id: string }[] }> {
  try {
    const supabase = await createClient()
    
    // Delete existing teams for this week
    await supabase.from("doubles_teams").delete().eq("week_id", weekId)
    
    // Insert new teams
    let savedTeams: { id: string; player1_id: string; player2_id: string }[] = []
    if (teams.length > 0) {
      const records = teams.map(t => ({
        week_id: weekId,
        player1_id: t.player1_id,
        player2_id: t.player2_id,
        team_handicap: t.team_handicap
      }))
      
      const { data, error } = await supabase
        .from("doubles_teams")
        .insert(records)
        .select("id, player1_id, player2_id")
      
      if (error) throw error
      savedTeams = data || []
    }
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true, teams: savedTeams }
  } catch (error) {
    console.error("Error saving doubles teams:", error)
    return { success: false, error: "Failed to save doubles teams" }
  }
}

export async function updateDoublesTeamScore(
  teamId: string,
  score: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("doubles_teams")
      .update({ score })
      .eq("id", teamId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating team score:", error)
    return { success: false, error: "Failed to update team score" }
  }
}

// Save card assignments and push to public
export async function saveCards(
  eventId: string,
  cardAssignments: { hole: number; players: string[]; teams?: { player1_id: string; player2_id: string }[] }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("weeks")
      .update({ 
        card_assignments: cardAssignments,
        cards_saved: true 
      })
      .eq("id", eventId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/events")
    revalidatePath("/current-event")
    
    return { success: true }
  } catch (error) {
    console.error("Error saving cards:", error)
    return { success: false, error: "Failed to save cards" }
  }
}

// Submit event results (finalize to public)
export async function submitEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("weeks")
      .update({ is_submitted: true })
      .eq("id", eventId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/events")
    revalidatePath("/current-event")
    
    return { success: true }
  } catch (error) {
    console.error("Error submitting event:", error)
    return { success: false, error: "Failed to submit event" }
  }
}

// Update doubles CTP team, scoring type, and playoff winner
export async function updateDoublesCTPAndScoringType(
  weekId: string,
  doublesCTPTeamId: string | null,
  scoringType: 'raw' | 'handicap',
  playoffWinnerTeamId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("weeks")
      .update({ 
        doubles_ctp_team_id: doublesCTPTeamId,
        doubles_scoring_type: scoringType,
        playoff_winner_team_id: playoffWinnerTeamId
      })
      .eq("id", weekId)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/weeks")
    revalidatePath("/events")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating doubles CTP and scoring type:", error)
    return { success: false, error: "Failed to update doubles settings" }
  }
}
