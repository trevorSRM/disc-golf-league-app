import { getDoublesTeamsForWeek } from "@/lib/data"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  const { weekId } = await params
  const teams = await getDoublesTeamsForWeek(weekId)
  return NextResponse.json({ teams })
}
