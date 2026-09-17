import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Disc, Sparkles } from "lucide-react"
import { AceWithPlayer } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface AcePoolCardProps {
  acePool: number
  latestAce: AceWithPlayer | null
}

export function AcePoolCard({ acePool, latestAce }: AcePoolCardProps) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Disc className="h-5 w-5 text-money" />
          Ace Pool
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <div className="relative inline-block">
            <div className="text-5xl font-bold text-money animate-pulse-glow rounded-full p-6 bg-money/10 border-2 border-money/30">
              ${acePool}
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-money" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Growing $40/week until hit!
          </p>
        </div>
        
        {latestAce && (
          <div className="mt-4 p-3 rounded-lg bg-money/10 border border-money/30">
            <div className="text-xs text-money uppercase tracking-wide mb-1">Last Ace</div>
            <div className="font-medium">{latestAce.player.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatDate(latestAce.date, "MMM d, yyyy")} • ${latestAce.payout}
              {latestAce.course_name && ` • ${latestAce.course_name}`}
              {latestAce.hole_number && ` • Hole ${latestAce.hole_number}`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
