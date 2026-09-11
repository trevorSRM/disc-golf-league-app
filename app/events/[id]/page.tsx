import { getWeekWithDetails, getHandicapsForEvent, getDoublesTeamsForWeek } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Flame, Target, Trophy, ArrowLeft, Medal, Users2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PAR, calculateFinalScore, getSinglesPayouts } from "@/lib/types"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const event = await getWeekWithDetails(id)
  
  if (!event) {
    notFound()
  }
  
  // Get attending player IDs for handicap calculation
  const attendingPlayerIds = event.attendance.map(a => a.player_id)
  const handicaps = await getHandicapsForEvent(event.week_number, attendingPlayerIds)
  
  // Fetch doubles teams if this is a doubles event
  const doublesTeams = event.is_doubles ? await getDoublesTeamsForWeek(id) : []

  // For regular events - calculate standings
  // Handicap: if you averaged 10 under par, your HC is +10 (penalty)
  // Final Score = (raw score - 54) + handicap
  const playersWithScores = event.attendance
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

  // Get winners for regular events
  const hotRoundWinner = playersWithScores[0]
  const secondPlaceWinner = playersWithScores[1]
  const rawWinner = [...playersWithScores].sort((a, b) => a.rawScore - b.rawScore)[0]
  
  // Determine payout tier from total attendance (everyone who paid in).
  // Tiers only apply starting Week 9; earlier weeks use the original flat payout.
  const singlesPayouts = getSinglesPayouts(event.attendance.length, event.week_number)
  
  // For doubles - calculate standings based on scoring type
  const isRawScoring = event.doubles_scoring_type === 'raw'
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
    .sort((a, b) => isRawScoring 
      ? a.rawScore - b.rawScore  // RAW: sort by raw score
      : a.finalScore - b.finalScore  // Handicap: sort by final score
    )
  
  // Get CTP winning team for doubles
  const ctpWinningTeam = event.doubles_ctp_team_id 
    ? doublesTeams.find(t => t.id === event.doubles_ctp_team_id)
    : null

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
    <div className="container mx-auto px-4 py-8">
      <Link href="/events">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold">Event {event.week_number}</h1>
          {event.is_doubles && (
            <Badge variant="default" className="bg-primary text-xs sm:text-sm">
              <Users2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Doubles
            </Badge>
          )}
          {event.is_doubles && (
            <Badge variant="outline" className="text-xs sm:text-sm">
              {event.doubles_scoring_type === 'raw' ? 'RAW Scoring' : 'Handicap Scoring'}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="text-xs sm:text-base">
            {format(new Date(event.date), "MMM d, yyyy")}
          </Badge>
          {event.course_name && (
            <span className="text-sm sm:text-base text-muted-foreground truncate">{event.course_name}</span>
          )}
        </div>
      </div>

      {/* Doubles Event View */}
      {event.is_doubles ? (
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
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {/* Hot Round Winner */}
                <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Trophy className="h-5 w-5" />
                      Winning Team
                      {event.playoff_winner_team_id && (
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50 ml-auto">
                          by Playoff
                        </Badge>
                      )}
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
                      {!isRawScoring && (
                        <span className="ml-2">(Final: {teamsWithScores[0].finalScore > 0 ? '+' : ''}{teamsWithScores[0].finalScore.toFixed(1)})</span>
                      )}
                    </div>
                    <Badge variant="default" className="mt-2 text-xs">$20 each</Badge>
                  </CardContent>
                </Card>
                
                {/* CTP Winner Team */}
                <Card className={ctpWinningTeam ? "border-success/50 bg-gradient-to-br from-success/10 to-transparent" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-success">
                      <Target className="h-5 w-5" />
                      CTP Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ctpWinningTeam ? (
                      <>
                        <div className="text-2xl font-bold">
                          {ctpWinningTeam.player1?.name}
                          {ctpWinningTeam.player1_id !== ctpWinningTeam.player2_id && (
                            <span> & {ctpWinningTeam.player2?.name}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className="mt-2 text-xs">$20 each</Badge>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-sm">Not recorded</div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
                            {!isRawScoring && (
                              <div className="text-sm text-muted-foreground">
                                Final: {team.finalScore > 0 ? '+' : ''}{team.finalScore.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // No scores yet - show teams without scores
                    doublesTeams.map((team) => (
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
        /* Regular Event View */
        playersWithScores.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">
                No scores recorded for this event yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {/* Winners Section */}
            <div className={`grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 ${singlesPayouts.secondPlace > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {/* Hot Round Winner */}
              <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    Hot Round
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold truncate">{hotRoundWinner.player.name}</div>
                  <div className="text-sm sm:text-base text-muted-foreground">
                    Score: {hotRoundWinner.rawScore}
                  </div>
                  <Badge variant="default" className="mt-2 text-xs">${singlesPayouts.hotRound} Payout</Badge>
                </CardContent>
              </Card>

              {/* 2nd Place Winner - only on high-attendance weeks */}
              {singlesPayouts.secondPlace > 0 && secondPlaceWinner && (
                <Card className="border-silver/50 bg-gradient-to-br from-silver/10 to-transparent">
                  <CardHeader className="pb-2 px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-silver text-base sm:text-lg">
                      <Medal className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      2nd Place
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="text-lg sm:text-2xl font-bold truncate">{secondPlaceWinner.player.name}</div>
                    <div className="text-sm sm:text-base text-muted-foreground">
                      Final: {secondPlaceWinner.finalScore > 0 ? "+" : ""}{secondPlaceWinner.finalScore.toFixed(1)}
                    </div>
                    <Badge variant="secondary" className="mt-2 text-xs">${singlesPayouts.secondPlace} Payout</Badge>
                  </CardContent>
                </Card>
              )}

              {/* Raw Score Winner */}
              <Card className="border-accent/50 bg-gradient-to-br from-accent/10 to-transparent">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-accent text-base sm:text-lg">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    Low Raw
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold truncate">{rawWinner.player.name}</div>
                  <div className="text-sm sm:text-base text-muted-foreground">
                    Score: {rawWinner.rawScore}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {rawWinner.toPar > 0 ? "+" : ""}{rawWinner.toPar} to par
                  </div>
                  {singlesPayouts.lowRaw > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">${singlesPayouts.lowRaw} Payout</Badge>
                  )}
                </CardContent>
              </Card>

              {/* CTP Winner */}
              <Card className={event.ctp_winner ? "border-success/50 bg-gradient-to-br from-success/10 to-transparent" : ""}>
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-success text-base sm:text-lg">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    CTP
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {event.ctp_winner ? (
                    <>
                      <div className="text-lg sm:text-2xl font-bold truncate">{event.ctp_winner.name}</div>
                      <Badge variant="secondary" className="mt-2 text-xs">$20 Payout</Badge>
                    </>
                  ) : (
                    <div className="text-muted-foreground text-sm">Not recorded</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Full Standings */}
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Standings ({playersWithScores.length})</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[320px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">#</th>
                        <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Player</th>
                        <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Score</th>
                        <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">HC</th>
                        <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playersWithScores.map((p, index) => (
                        <tr 
                          key={p.id}
                          className={`border rounded-lg ${getRowBg(index)}`}
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <Medal className={`h-4 w-4 sm:h-5 sm:w-5 ${getMedalColor(index)}`} />
                              ) : (
                                <span className="font-bold text-muted-foreground text-xs sm:text-sm w-4 sm:w-5 text-center">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <Link href={`/players/${p.player_id}`} className="hover:text-primary transition-colors">
                              <span className="font-medium text-xs sm:text-sm">{p.player.name}</span>
                              {p.player.is_member && (
                                <Badge variant="default" className="ml-1 text-[10px] sm:text-xs hidden sm:inline-flex">M</Badge>
                              )}
                            </Link>
                          </td>
                          <td className="py-2 px-2 text-center font-medium text-xs sm:text-sm">{p.rawScore}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            {p.handicap >= 0 ? "+" : ""}{p.handicap.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-xs sm:text-sm font-medium ${p.finalScore <= 0 ? "text-accent" : "text-destructive"}`}>
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
