import { getPlayersWithStats } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, TrendingUp, Crown } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PlayersPage() {
  const players = await getPlayersWithStats()
  
  const members = players.filter(p => p.is_member)
  const visitors = players.filter(p => !p.is_member)
  
  // Sort by handicap (best handicap = highest positive number)
  const sortedByHandicap = [...players]
    .filter(p => p.total_rounds > 0)
    .sort((a, b) => b.handicap - a.handicap)

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Players</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {players.length} total • {members.length} members
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {members.map(player => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.total_rounds} rds • {player.wins} wins
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-bold text-primary">
                      {player.handicap > 0 ? "+" : ""}{player.handicap.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">HC</div>
                  </div>
                </Link>
              ))}
              {members.length === 0 && (
                <p className="text-muted-foreground text-center py-4 text-sm">No members yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visitors */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Visitors ({visitors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {visitors.map(player => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.total_rounds} rds • {player.wins} wins
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-bold">
                      {player.handicap > 0 ? "+" : ""}{player.handicap.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">HC</div>
                  </div>
                </Link>
              ))}
              {visitors.length === 0 && (
                <p className="text-muted-foreground text-center py-4 text-sm">No visitors</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Handicap Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
              Handicap Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {sortedByHandicap.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No rounds played yet. Handicaps will appear after players record scores.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full min-w-[320px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">#</th>
                      <th className="text-left py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Player</th>
                      <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Rds</th>
                      <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Avg</th>
                      <th className="text-center py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">Wins</th>
                      <th className="text-right py-2 px-2 text-xs sm:text-sm font-medium text-muted-foreground">HC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByHandicap.map((player, index) => (
                      <tr 
                        key={player.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-2 px-2">
                          <span className={`font-bold text-xs sm:text-sm ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <Link href={`/players/${player.id}`} className="hover:text-primary transition-colors">
                            <span className="font-medium text-xs sm:text-sm">{player.name}</span>
                            {player.is_member && (
                              <Badge variant="default" className="ml-1 text-[10px] sm:text-xs hidden sm:inline-flex">M</Badge>
                            )}
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-center text-xs sm:text-sm hidden sm:table-cell">{player.total_rounds}</td>
                        <td className="py-2 px-2 text-center text-xs sm:text-sm hidden sm:table-cell">{player.average_score.toFixed(1)}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="flex items-center justify-center gap-1 text-xs sm:text-sm">
                            {player.wins > 0 && <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-gold" />}
                            {player.wins}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={`font-bold text-xs sm:text-sm ${player.handicap >= 0 ? "text-accent" : "text-destructive"}`}>
                            {player.handicap > 0 ? "+" : ""}{player.handicap.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
