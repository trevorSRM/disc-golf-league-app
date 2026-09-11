import { getDoublesEventWithTeams } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Target, Users, Trophy, ArrowLeft, Medal } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DoublesDetailPage({ params }: Props) {
  const { id } = await params
  const event = await getDoublesEventWithTeams(id)
  
  if (!event) {
    notFound()
  }

  // Sort teams by score if scores are entered
  const teamsWithScores = event.teams
    .filter(t => t.score !== null)
    .map(t => ({
      ...t,
      netScore: (t.score as number) - (t.team_handicap || 0)
    }))
    .sort((a, b) => a.netScore - b.netScore)

  const teamsWithoutScores = event.teams.filter(t => t.score === null)

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
      <Link href="/doubles">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Doubles
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Doubles Event</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base">
            {format(new Date(event.event_date), "MMMM d, yyyy")}
          </Badge>
          {event.course_name && (
            <span className="text-muted-foreground">{event.course_name}</span>
          )}
        </div>
      </div>

      {event.teams.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              No teams have been drawn for this event yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Winner Highlight */}
          {teamsWithScores.length > 0 && (
            <Card className="border-gold/50 bg-gradient-to-br from-gold/10 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gold">
                  <Trophy className="h-5 w-5" />
                  Winning Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">
                      {teamsWithScores[0].player1.name} & {teamsWithScores[0].player2.name}
                    </div>
                    <div className="text-muted-foreground">
                      Score: {teamsWithScores[0].score}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teams with Scores */}
          {teamsWithScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Final Standings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamsWithScores.map((team, index) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${getRowBg(index)}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {index < 3 ? (
                            <Medal className={`h-6 w-6 ${getMedalColor(index)}`} />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {team.player1.name} & {team.player2.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Team HC: {team.team_handicap?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">Score: {team.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teams without Scores */}
          {teamsWithoutScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams ({teamsWithoutScores.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {teamsWithoutScores.map((team, index) => (
                    <div
                      key={team.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Team {index + 1}</Badge>
                        <Badge variant="secondary">
                          HC: {team.team_handicap?.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="font-medium">
                        {team.player1.name}
                      </div>
                      <div className="font-medium">
                        {team.player2.name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
