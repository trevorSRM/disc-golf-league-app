import { getPlayer, getPlayerHandicap, getPlayerWinWeekIds } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Trophy, Calendar, TrendingUp, ArrowLeft, Users2, Medal } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { calculateHandicap, PAR } from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params
  const player = await getPlayer(id)
  
  if (!player) {
    notFound()
  }
  
  const supabase = await createClient()
  
  // Week IDs this player won (singles + doubles) — used to show a gold medal badge,
  // consistent with the Win Leaderboard.
  const winWeekIds = await getPlayerWinWeekIds(id)
  
  // Get all attendance records for this player
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*, week:weeks(*)")
    .eq("player_id", id)
    .order("created_at", { ascending: false })
  
  // Get all doubles teams this player was part of (without join)
  const { data: doublesTeamsPlayer1 } = await supabase
    .from("doubles_teams")
    .select("*")
    .eq("player1_id", id)
  
  const { data: doublesTeamsPlayer2 } = await supabase
    .from("doubles_teams")
    .select("*")
    .eq("player2_id", id)
  
  // Get partner names separately
  const allPlayerIds = new Set<string>()
  for (const t of (doublesTeamsPlayer1 || [])) {
    allPlayerIds.add(t.player2_id)
  }
  for (const t of (doublesTeamsPlayer2 || [])) {
    allPlayerIds.add(t.player1_id)
  }
  
  const { data: partnerPlayers } = await supabase
    .from("players")
    .select("id, name")
    .in("id", Array.from(allPlayerIds))
  
  const partnerNameMap = new Map<string, string>()
  for (const p of (partnerPlayers || [])) {
    partnerNameMap.set(p.id, p.name)
  }
  
  // Combine both lists with partner names
  const doublesTeams = [
    ...(doublesTeamsPlayer1 || []).map(t => ({ 
      ...t, 
      isPlayer1: true, 
      partnerName: partnerNameMap.get(t.player2_id) || "Unknown"
    })),
    ...(doublesTeamsPlayer2 || []).map(t => ({ 
      ...t, 
      isPlayer1: false,
      partnerName: partnerNameMap.get(t.player1_id) || "Unknown"
    }))
  ]
  
  // Get all weeks (both singles and doubles)
  const { data: allWeeks } = await supabase
    .from("weeks")
    .select("*")
    .eq("is_submitted", true)
    .order("week_number", { ascending: false })
  
  // Sort by week_number descending so calculateHandicap sees the most recent rounds
  // first (its most-recent-10 rule). This matches getPlayersWithStats/getAllPlayerHandicaps.
  const singlesAttendance = (attendance || [])
    .filter(a => a.score !== null && !a.week?.is_doubles)
    .sort((a, b) => (b.week?.week_number ?? 0) - (a.week?.week_number ?? 0))
  const scores = singlesAttendance.map(a => a.score as number)
  
  const handicap = calculateHandicap(scores)
  const totalRounds = scores.length
  const averageScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0
  const bestScore = scores.length > 0 ? Math.min(...scores) : null
  const worstScore = scores.length > 0 ? Math.max(...scores) : null
  
  // Build combined history of all weeks (singles attendance + doubles teams)
  type HistoryEntry = {
    weekId: string
    weekNumber: number
    date: string
    courseName: string | null
    isDoubles: boolean
    score: number | null
    partnerName?: string
    teamScore?: number | null
  }
  
  const historyEntries: HistoryEntry[] = []
  
  // Add singles attendance
  for (const record of (attendance || [])) {
    if (record.week && !record.week.is_doubles) {
      historyEntries.push({
        weekId: record.week_id,
        weekNumber: record.week.week_number,
        date: record.week.date,
        courseName: record.week.course_name,
        isDoubles: false,
        score: record.score
      })
    }
  }
  
  // Create a map of weeks by ID for quick lookup
  const weeksMap = new Map<string, typeof allWeeks extends (infer T)[] | null ? T : never>()
  for (const w of (allWeeks || [])) {
    weeksMap.set(w.id, w)
  }
  
  // Add doubles participation
  for (const team of doublesTeams) {
    const week = weeksMap.get(team.week_id)
    if (week && week.is_submitted) {
      historyEntries.push({
        weekId: team.week_id,
        weekNumber: week.week_number,
        date: week.date,
        courseName: week.course_name,
        isDoubles: true,
        score: null,
        partnerName: team.partnerName,
        teamScore: team.score
      })
    }
  }
  
  // Sort by week number descending
  historyEntries.sort((a, b) => b.weekNumber - a.weekNumber)

  // Mirror calculateHandicap's selection so we can visually mark which singles weeks
  // count toward the handicap and which are the dropped (worst) rounds.
  // - The most recent 10 singles rounds form the "handicap window".
  // - Within that window we drop the worst (highest) scores: 0 for 3 rounds,
  //   1 for 4-5 rounds, 2 for 6+ rounds.
  const handicapEstablished = scores.length >= 3
  const windowEntries = singlesAttendance.slice(0, 10)
  const numRounds = windowEntries.length
  let scoresToDrop = 0
  if (numRounds >= 6) scoresToDrop = 2
  else if (numRounds >= 4) scoresToDrop = 1
  // Sort a copy ascending by score; the last N entries are the dropped worst rounds.
  const droppedEntries = handicapEstablished
    ? [...windowEntries].sort((a, b) => (a.score as number) - (b.score as number)).slice(numRounds - scoresToDrop)
    : []
  const droppingWeekIds = new Set(droppedEntries.map(e => e.week_id))
  const countingWeekIds = new Set(
    handicapEstablished
      ? windowEntries.filter(e => !droppingWeekIds.has(e.week_id)).map(e => e.week_id)
      : []
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/players">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Players
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Player Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Player Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">
                  {player.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{player.name}</h2>
              {player.is_member ? (
                <Badge variant="default" className="mt-2">Member</Badge>
              ) : (
                <Badge variant="secondary" className="mt-2">Visitor</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-center">
                <div className="text-2xl font-bold text-accent">
                  {handicap > 0 ? "+" : ""}{handicap.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Handicap</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
                <div className="text-2xl font-bold text-primary">{totalRounds}</div>
                <div className="text-xs text-muted-foreground">Rounds</div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-medium">{averageScore ? averageScore.toFixed(1) : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Best Score</span>
                <span className="font-medium text-accent">{bestScore ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Worst Score</span>
                <span className="font-medium">{worstScore ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Score History
            </CardTitle>
            {handicapEstablished && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border-2 border-success bg-success/10" />
                  Counts toward handicap
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border-2 border-destructive bg-destructive/10" />
                  Dropped (worst {scoresToDrop === 1 ? "round" : `${scoresToDrop} rounds`})
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {historyEntries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No rounds recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {historyEntries.map((entry) => {
                  const isCounting = !entry.isDoubles && countingWeekIds.has(entry.weekId)
                  const isDropped = !entry.isDoubles && droppingWeekIds.has(entry.weekId)
                  const isWin = winWeekIds.has(entry.weekId)
                  return (
                  <Link
                    key={`${entry.weekId}-${entry.isDoubles ? 'doubles' : 'singles'}`}
                    href={entry.isDoubles ? `/events/${entry.weekId}` : `/weeks/${entry.weekId}`}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isCounting
                        ? "border-success/60 bg-success/10 hover:bg-success/20"
                        : isDropped
                        ? "border-destructive/60 bg-destructive/10 hover:bg-destructive/20"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Week {entry.weekNumber}</span>
                        {isWin && (
                          <Badge variant="outline" className="text-xs gap-1 border-gold/50 bg-gold/10 text-gold">
                            <Medal className="h-3 w-3" />
                            Winner
                          </Badge>
                        )}
                        {entry.isDoubles && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users2 className="h-3 w-3" />
                            Doubles
                          </Badge>
                        )}
                        {isCounting && (
                          <Badge variant="outline" className="text-xs border-success/60 text-success">
                            Counting
                          </Badge>
                        )}
                        {isDropped && (
                          <Badge variant="outline" className="text-xs border-destructive/60 text-destructive">
                            Dropped
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.date && formatDate(entry.date, "MMM d, yyyy")}
                        {entry.courseName && ` • ${entry.courseName}`}
                        {entry.isDoubles && entry.partnerName && (
                          <span className="text-primary"> • w/ {entry.partnerName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.isDoubles ? (
                        entry.teamScore !== null ? (
                          <>
                            <div className="text-xl font-bold">{entry.teamScore}</div>
                            <div className="text-xs text-muted-foreground">team score</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">Played</span>
                        )
                      ) : entry.score !== null ? (
                        <>
                          <div className="text-xl font-bold">{entry.score}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.score - PAR > 0 ? "+" : ""}{entry.score - PAR} to par
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No score</span>
                      )}
                    </div>
                  </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
