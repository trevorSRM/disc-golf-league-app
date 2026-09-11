import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Flame, Target, Users2, DollarSign } from "lucide-react"
import { WeekWithDetails, calculateFinalScore, calculateTeamHandicap, PAR, getSinglesPayouts } from "@/lib/types"
import Link from "next/link"
import { format } from "date-fns"

interface LatestWeekCardProps {
  week: WeekWithDetails | null
  handicaps: Record<string, number>
}

export function LatestWeekCard({ week, handicaps }: LatestWeekCardProps) {
  if (!week) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Latest Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No weeks recorded yet. The first week&apos;s results will appear here!
          </p>
        </CardContent>
      </Card>
    )
  }

  // Check if this is a doubles event
  const isDoubles = week.is_doubles
  const isRawScoring = week.doubles_scoring_type === 'raw'

  // Calculate winners for SINGLES
  const playersWithScores = !isDoubles ? week.attendance
    .filter(a => a.score !== null)
    .map(a => {
      const handicap = handicaps[a.player_id] || 0
      const rawScore = a.score as number
      const finalScore = calculateFinalScore(rawScore, handicap)
      return {
        ...a,
        handicap,
        rawScore,
        finalScore
      }
    })
    .sort((a, b) => a.finalScore - b.finalScore) : []

  // Calculate winners for DOUBLES
  const teamsWithScores = isDoubles && week.doubles_teams ? week.doubles_teams
    .filter(t => t.score !== null)
    .map(t => {
      const rawScore = t.score as number
      const p1Hc = handicaps[t.player1_id] || 0
      const p2Hc = handicaps[t.player2_id] || 0
      const teamHandicap = calculateTeamHandicap(p1Hc, p2Hc)
      const finalScore = (rawScore - PAR) + teamHandicap
      return {
        ...t,
        rawScore,
        teamHandicap,
        finalScore
      }
    })
    .sort((a, b) => isRawScoring ? a.rawScore - b.rawScore : a.finalScore - b.finalScore) : []

  const hotRoundWinner = playersWithScores[0]
  const secondPlaceWinner = playersWithScores[1]
  const rawWinner = [...playersWithScores].sort((a, b) => a.rawScore - b.rawScore)[0]
  const winningTeam = teamsWithScores[0]

  // Determine payout tier for singles from total attendance (everyone who paid in).
  // "Extra money" (2nd place + low raw) only kicks in at the large/huge tiers, so we
  // only surface the payout breakdown on the home page when those extra payouts exist.
  const singlesPayouts = !isDoubles
    ? getSinglesPayouts(week.attendance.length, week.week_number)
    : null
  const hasExtraPayouts = !!singlesPayouts && singlesPayouts.tier !== "standard"

  const hasScores = isDoubles ? teamsWithScores.length > 0 : playersWithScores.length > 0

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Week {week.week_number}
            {isDoubles && (
              <Badge variant="default" className="ml-2 text-xs">
                <Users2 className="h-3 w-3 mr-1" />
                Doubles
              </Badge>
            )}
          </CardTitle>
          <Badge variant="secondary">
            {format(new Date(week.date), "MMM d, yyyy")}
          </Badge>
        </div>
        {week.course_name && (
          <p className="text-sm text-muted-foreground">{week.course_name}</p>
        )}
        {isDoubles && (
          <Badge variant="outline" className="w-fit text-xs">
            {isRawScoring ? 'RAW Scoring' : 'Handicap Scoring'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasScores ? (
          <p className="text-muted-foreground text-center py-4">
            Scores not yet entered for this week.
          </p>
        ) : isDoubles ? (
          /* DOUBLES RESULTS */
          <>
            {/* Winners Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Winning Team */}
              {winningTeam && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Winning Team</span>
                    {week.playoff_winner_team_id && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                        by Playoff
                      </Badge>
                    )}
                  </div>
                  <div className="font-bold text-lg">
                    {winningTeam.player1.name} & {winningTeam.player2.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {winningTeam.rawScore}
                    {!isRawScoring && (
                      <span className="ml-2">(Final: {winningTeam.finalScore > 0 ? '+' : ''}{winningTeam.finalScore.toFixed(1)})</span>
                    )}
                  </div>
                </div>
              )}
              
              {/* CTP Team */}
              {week.doubles_ctp_team && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium text-accent">CTP Team</span>
                  </div>
                  <div className="font-bold text-lg">
                    {week.doubles_ctp_team.player1.name} & {week.doubles_ctp_team.player2.name}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Results Table */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Team Standings ({teamsWithScores.length} teams)
              </div>
              {teamsWithScores.slice(0, 5).map((t, i) => (
                <div 
                  key={t.id}
                  className="flex items-center justify-between py-2 px-3 rounded bg-secondary/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span>{t.player1.name} & {t.player2.name}</span>
                  </div>
                  <span className={`font-medium ${isRawScoring ? '' : (t.finalScore <= 0 ? "text-accent" : "text-destructive")}`}>
                    {isRawScoring ? t.rawScore : `${t.finalScore > 0 ? "+" : ""}${t.finalScore.toFixed(1)}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* SINGLES RESULTS */
          <>
            {/* Winners Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Hot Round Winner */}
              {hotRoundWinner && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Hot Round</span>
                    {week.playoff_winner_id && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                        by Playoff
                      </Badge>
                    )}
                  </div>
                  <div className="font-bold text-lg">{hotRoundWinner.player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Final: {hotRoundWinner.finalScore > 0 ? "+" : ""}{hotRoundWinner.finalScore.toFixed(1)}
                  </div>
                </div>
              )}
              
              {/* Raw Score Winner */}
              {rawWinner && (
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Low Raw</span>
                  </div>
                  <div className="font-bold text-lg">{rawWinner.player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {rawWinner.rawScore}
                  </div>
                </div>
              )}
            </div>

            {/* CTP Winner */}
            {week.ctp_winner && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 flex items-center gap-3">
                <Target className="h-5 w-5 text-accent" />
                <div>
                  <span className="text-sm text-accent font-medium">CTP Winner: </span>
                  <span className="font-medium">{week.ctp_winner.name}</span>
                </div>
              </div>
            )}

            {/* Extra Payouts (only shown for large/huge attendance weeks) */}
            {hasExtraPayouts && singlesPayouts && (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-success">
                    Payouts ({week.attendance.length} players)
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Hot Round", amount: singlesPayouts.hotRound, name: hotRoundWinner?.player.name },
                    { label: "2nd Place", amount: singlesPayouts.secondPlace, name: secondPlaceWinner?.player.name },
                    { label: "Low Raw", amount: singlesPayouts.lowRaw, name: rawWinner?.player.name },
                    { label: "CTP", amount: singlesPayouts.ctp, name: week.ctp_winner?.name },
                  ]
                    .filter(row => row.amount > 0)
                    .map(row => (
                      <div key={row.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground">{row.label}</span>
                          <span className="text-muted-foreground truncate">
                            {row.name || "TBD"}
                          </span>
                        </div>
                        <span className="font-semibold text-success shrink-0">${row.amount}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Quick Results Table */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Final Standings ({playersWithScores.length} players)
              </div>
              {playersWithScores.slice(0, 5).map((p, i) => (
                <div 
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded bg-secondary/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span>{p.player.name}</span>
                  </div>
                  <span className={`font-medium ${p.finalScore <= 0 ? "text-accent" : "text-destructive"}`}>
                    {p.finalScore > 0 ? "+" : ""}{p.finalScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        
        <Link 
          href={`/weeks/${week.id}`}
          className="block text-center text-sm text-primary hover:underline"
        >
          View full results
        </Link>
      </CardContent>
    </Card>
  )
}
