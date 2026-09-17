import { getCurrentEvent, getDoublesTeamsForWeek, getPlayers } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users2, AlertCircle, PlayCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CurrentEventPage() {
  const currentEvent = await getCurrentEvent()
  
  if (!currentEvent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No Current Event</h2>
            <p className="text-muted-foreground mb-4">
              There is no active event at the moment. Check back soon!
            </p>
            <Link href="/events" className="text-primary hover:underline">
              View Past Events
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const players = await getPlayers()
  const doublesTeams = currentEvent.is_doubles 
    ? await getDoublesTeamsForWeek(currentEvent.id)
    : []
  
  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || "Unknown"
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PlayCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Current Event</h1>
          <p className="text-muted-foreground">Live event information</p>
        </div>
      </div>
      
      {/* Event Details */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex flex-wrap items-center gap-3">
              <span className="text-2xl sm:text-4xl font-bold text-primary">Event {currentEvent.week_number}</span>
              {currentEvent.is_doubles && (
                <Badge variant="default" className="bg-primary text-sm sm:text-lg py-1">
                  <Users2 className="h-4 w-4 mr-1" />
                  Doubles
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-muted-foreground text-sm sm:text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>{formatDate(currentEvent.date, "EEE, MMM d, yyyy")}</span>
            </div>
            {currentEvent.course_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>{currentEvent.course_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>{currentEvent.attendance.length} Players</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Show Cards & Teams only after admin has saved them */}
      {currentEvent.cards_saved ? (
        <>
          {/* Doubles Teams */}
          {currentEvent.is_doubles && doublesTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doublesTeams.map((team, idx) => (
                    <div key={team.id} className="p-4 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-primary mb-2">Team {idx + 1}</div>
                      <div className="space-y-1">
                        <div className="font-medium">{team.player1.name}</div>
                        <div className="font-medium">{team.player2.name}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Team Handicap: {team.team_handicap?.toFixed(1) || "0"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Card Assignments */}
          {currentEvent.card_assignments && currentEvent.card_assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Card Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentEvent.card_assignments.map((card, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${card.sanctioned ? "bg-muted border-2 border-accent" : "bg-muted"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-2xl font-bold text-primary">Hole {card.hole}</div>
                        {card.sanctioned && (
                          <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-accent text-accent-foreground">
                            PDGA Sanctioned
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {card.teams ? (
                          // Doubles - show teams
                          card.teams.map((team, tidx) => (
                            <div key={tidx} className="p-2 bg-background rounded border">
                              <div className="text-sm text-muted-foreground">Team {tidx + 1}</div>
                              <div className="font-medium">{getPlayerName(team.player1_id)}</div>
                              <div className="font-medium">{getPlayerName(team.player2_id)}</div>
                            </div>
                          ))
                        ) : (
                          // Solo - show players
                          card.players.map(pid => (
                            <div key={pid} className="font-medium">{getPlayerName(pid)}</div>
                          ))
                        )}
                        {/* Show wild man if on this card */}
                        {card.players.length % 2 === 1 && currentEvent.is_doubles && (
                          <div className="p-2 bg-primary/20 rounded border border-primary">
                            <div className="text-sm text-primary font-medium">Wild Man</div>
                            <div className="font-medium">
                              {getPlayerName(card.players[card.players.length - 1])}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Cards Not Yet Assigned</h3>
            <p className="text-muted-foreground">
              The admin has not yet saved the card assignments. Check back shortly before the event starts.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Player List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Players Attending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {currentEvent.attendance.map(a => (
              <div key={a.id} className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{a.player.name}</div>
                {a.player.is_member && (
                  <Badge variant="secondary" className="text-xs mt-1">Member</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
