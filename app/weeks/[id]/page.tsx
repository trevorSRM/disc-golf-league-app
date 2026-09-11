import { getWeekWithDetails, getHandicapsForEvent, getDoublesTeamsForWeek } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Flame, Target, Trophy, ArrowLeft, Medal, Users2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PAR, calculateFinalScore } from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function WeekDetailPage({ params }: Props) {
  const { id } = await params
  const week = await getWeekWithDetails(id)
  
  if (!week) {
    notFound()
  }
  
  // Get attending player IDs for handicap calculation
  const attendingPlayerIds = week.attendance.map(a => a.player_id)
  const handicaps = await getHandicapsForEvent(week.week_number, attendingPlayerIds)
  
  // Fetch doubles teams if this is a doubles week
  const doublesTeams = week.is_doubles ? await getDoublesTeamsForWeek(id) : []

  // For regular weeks - calculate standings
  const playersWithScores = week.attendance
    .filter(a => a.score !== null)
    .map(a => {
      const handicap = handicaps.get(a.player_id) || 0
      const rawScore = a.score as number
      const finalScore = calculateFinalScore(rawScore, handicap)
      return {
        ...a,
        handicap,
        rawScore,
        finalScore,
        toPar: rawScore - PAR
      }
    })
    .sort((a, b) => a.finalScore - b.finalScore)

  // Get winners for regular weeks
  const hotRoundWinner = playersWithScores[0]
  const rawWinner = [...playersWithScores].sort((a, b) => a.rawScore - b.rawScore)[0]
  
  // For doubles - calculate standings
  const teamsWithScores = doublesTeams
    .filter(t => t.score !== null)
    .map(t => {
      const rawScore = t.score as number
      const teamHandicap = t.team_handicap || 0
      const finalScore = calculateFinalScore(rawScore, teamHandicap)
      return {
        ...t,
        rawScore,
        finalScore,
        toPar: rawScore - PAR
      }
    })
    .sort((a, b) => a.finalScore - b.finalScore)

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-gold"
      case 1: return "text-silver"
      case 2: return "text-bronze"
      default: return "text-muted-foreground"
    }
  }

  const getRowBg = (index: number) => {
    switch (index) {
      case 0: return "bg-gold/10 border-gold/30"
      case 1: return "bg-silver/10 border-silver/30"
      case 2: return "bg-bronze/10 border-bronze/30"
      default: return "bg-secondary/30 border-border"
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 overflow-x-hidden">
      <Link href="/weeks">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Weeks
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Week {week.week_number}</h1>
          {week.is_doubles && (
            <Badge variant="default" className="bg-primary">
              <Users2 className="h-4 w-4 mr-1" />
              Doubles
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base">
            {format(new Date(week.date), "MMMM d, yyyy")}
          </Badge>
          {week.course_name && (
            <span className="text-muted-foreground">{week.course_name}</span>
          )}
        </div>
      </div>

      {/* Doubles Week View */}
      {week.is_doubles ? (
        doublesTeams.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">
                No teams have been created for this doubles event yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Doubles Winners */}
            {teamsWithScores.length > 0 && (
              <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Trophy className="h-5 w-5" />
                    Winning Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamsWithScores[0].player1?.name}
                    {teamsWithScores[0].player1_id !== teamsWithScores[0].player2_id && (
                      <span> & {teamsWithScores[0].player2?.name}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    Score: {teamsWithScores[0].rawScore}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  Teams ({doublesTeams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamsWithScores.length > 0 ? (
                    teamsWithScores.map((team, index) => (
                      <div
                        key={team.id}
                        className={`p-4 rounded-lg border ${getRowBg(index)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {index < 3 ? (
                              <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                            ) : (
                              <span className="font-bold text-muted-foreground w-5 text-center">
                                {index + 1}
                              </span>
                            )}
                            <div>
                              <span className="font-medium">{team.player1?.name}</span>
                              {team.player1_id !== team.player2_id && (
                                <span className="font-medium"> & {team.player2?.name}</span>
                              )}
                              <div className="text-sm text-muted-foreground">
                                Team Handicap: {team.team_handicap?.toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">Score: {team.rawScore}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // No scores yet - show teams without scores
                    doublesTeams.map((team, index) => (
                      <div
                        key={team.id}
                        className="p-4 rounded-lg border bg-secondary/30 border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{team.player1?.name}</span>
                            {team.player1_id !== team.player2_id && (
                              <span className="font-medium"> & {team.player2?.name}</span>
                            )}
                            <div className="text-sm text-muted-foreground">
                              Team Handicap: {team.team_handicap?.toFixed(1)}
                            </div>
                          </div>
                          <Badge variant="outline">No score</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        /* Regular Week View */
        playersWithScores.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">
                No scores recorded for this week yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {/* Winners Section */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              {/* Hot Round Winner */}
              <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-primary text-sm sm:text-base">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    Hot Round
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold truncate">{hotRoundWinner.player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {hotRoundWinner.rawScore}
                  </div>
                  <Badge variant="default" className="mt-2 text-xs">$20</Badge>
                </CardContent>
              </Card>

              {/* Raw Score Winner */}
              <Card className="border-accent/50 bg-gradient-to-br from-accent/10 to-transparent">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-accent text-sm sm:text-base">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    Low Raw
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold truncate">{rawWinner.player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {rawWinner.rawScore} ({rawWinner.toPar > 0 ? "+" : ""}{rawWinner.toPar})
                  </div>
                </CardContent>
              </Card>

              {/* CTP Winner */}
              <Card className={week.ctp_winner ? "border-success/50 bg-gradient-to-br from-success/10 to-transparent" : ""}>
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-success text-sm sm:text-base">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    CTP
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {week.ctp_winner ? (
                    <>
                      <div className="text-lg sm:text-2xl font-bold truncate">{week.ctp_winner.name}</div>
                      <Badge variant="secondary" className="mt-2 text-xs">$20</Badge>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Not recorded</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Full Standings */}
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Standings ({playersWithScores.length} players)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[300px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-muted-foreground">#</th>
                        <th className="text-left py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-muted-foreground">Player</th>
                        <th className="text-center py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-muted-foreground">Raw</th>
                        <th className="text-center py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-muted-foreground">HC</th>
                        <th className="text-center py-2 px-1 sm:px-2 text-xs sm:text-sm font-medium text-muted-foreground">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playersWithScores.map((p, index) => (
                        <tr 
                          key={p.id}
                          className={`border-b ${getRowBg(index)}`}
                        >
                          <td className="py-2 px-1 sm:px-2">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <Medal className={`h-4 w-4 sm:h-5 sm:w-5 ${getMedalColor(index)}`} />
                              ) : (
                                <span className="font-bold text-xs sm:text-sm text-muted-foreground w-4 sm:w-5 text-center">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 sm:px-2">
                            <Link href={`/players/${p.player_id}`} className="hover:text-primary transition-colors">
                              <span className="font-medium text-xs sm:text-sm">{p.player.name}</span>
                              {p.player.is_member && (
                                <Badge variant="default" className="ml-1 text-[10px] hidden sm:inline-flex">M</Badge>
                              )}
                            </Link>
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center text-xs sm:text-sm font-medium">{p.rawScore}</td>
                          <td className="py-2 px-1 sm:px-2 text-center text-xs sm:text-sm text-muted-foreground">
                            {p.handicap >= 0 ? "+" : ""}{p.handicap.toFixed(1)}
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-center">
                            <span className={`font-medium text-xs sm:text-sm ${p.finalScore <= 0 ? "text-accent" : "text-destructive"}`}>
                              {p.finalScore > 0 ? "+" : ""}{p.finalScore.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  )
}
