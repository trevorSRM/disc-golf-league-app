import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("week_id", weekId)
    
    if (error) throw error
    
    return NextResponse.json({ attendance: data })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 })
  }
}
