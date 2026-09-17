"use server"

import { actionErrorMessage } from "@/lib/action-error"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { Player } from "@/lib/types"

export async function addPlayer(
  name: string, 
  isMember: boolean
): Promise<{ success: boolean; player?: Player; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("players")
      .insert({ name, is_member: isMember })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/players")
    
    return { success: true, player: data }
  } catch (error) {
    console.error("Error adding player:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to add player") }
  }
}

export async function updatePlayer(
  id: string,
  name: string,
  isMember: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("players")
      .update({ name, is_member: isMember })
      .eq("id", id)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/players")
    
    return { success: true }
  } catch (error) {
    console.error("Error updating player:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to update player") }
  }
}

export async function deletePlayer(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/players")
    
    return { success: true }
  } catch (error) {
    console.error("Error deleting player:", error)
    return { success: false, error: actionErrorMessage(error, "Failed to delete player") }
  }
}
