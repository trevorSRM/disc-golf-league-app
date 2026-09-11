import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculateHandicap } from "@/lib/types"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("attendance")
      .select("player_id, score")
      .not("score", "is", null)
    
    if (error) throw error
    
    // Group scores by player
    const playerScores: Record<string, number[]> = {}
    for (const record of (data || [])) {
      if (!playerScores[record.player_id]) {
        playerScores[record.player_id] = []
      }
      playerScores[record.player_id].push(record.score)
    }
    
    // Calculate handicaps
    const handicaps: Record<string, number> = {}
    for (const [playerId, scores] of Object.entries(playerScores)) {
      handicaps[playerId] = calculateHandicap(scores)
    }
    
    return NextResponse.json({ handicaps })
  } catch (error) {
    console.error("Error fetching handicaps:", error)
    return NextResponse.json({ error: "Failed to fetch handicaps" }, { status: 500 })
  }
}
