import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Users2 } from "lucide-react"
import { PlayerWithStats } from "@/lib/types"
import Link from "next/link"

interface LeaderboardCardProps {
  players: PlayerWithStats[]
}

export function LeaderboardCard({ players }: LeaderboardCardProps) {
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Win Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No rounds played yet. Check back after the first week!
          </p>
        ) : (
          <div className="space-y-2">
            {players.map((player, index) => (
              <Link 
                key={player.id}
                href={`/players/${player.id}`}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-secondary/50 ${getRowBg(index)}`}
              >
                <div className="flex items-center justify-center w-8 h-8">
                  {index < 3 ? (
                    <Medal className={`h-6 w-6 ${getMedalColor(index)}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{player.name}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {player.singles_wins > 0 && (
                      <span>Singles: {player.singles_wins}</span>
                    )}
                    {player.doubles_wins > 0 && (
                      <span className="flex items-center gap-1">
                        <Users2 className="h-3 w-3" />
                        Doubles: {player.doubles_wins}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{player.wins}</div>
                  <div className="text-xs text-muted-foreground">total wins</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link 
          href="/players"
          className="block text-center text-sm text-primary hover:underline mt-4"
        >
          View all players
        </Link>
      </CardContent>
    </Card>
  )
}
