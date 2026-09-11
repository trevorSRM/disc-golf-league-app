import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, UserCheck, Calendar, Disc } from "lucide-react"

interface QuickStatsCardProps {
  totalPlayers: number
  totalMembers: number
  totalRounds: number
  totalAces: number
}

export function QuickStatsCard({ 
  totalPlayers, 
  totalMembers, 
  totalRounds,
  totalAces 
}: QuickStatsCardProps) {
  const stats = [
    { label: "Total Players", value: totalPlayers, icon: Users },
    { label: "Members", value: totalMembers, icon: UserCheck },
    { label: "Weeks Played", value: totalRounds, icon: Calendar },
    { label: "Total Aces", value: totalAces, icon: Disc },
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          League Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div 
                key={stat.label}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-lg font-bold">{stat.value}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
