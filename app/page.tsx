import { getPlayersWithStats, getLatestSubmittedEvent, getFinances, getAces, getSubmittedEvents, getHandicapsForEvent } from "@/lib/data"
import { DashboardHero } from "@/components/dashboard-hero"
import { LeaderboardCard } from "@/components/leaderboard-card"
import { LatestWeekCard } from "@/components/latest-week-card"
import { AcePoolCard } from "@/components/ace-pool-card"
import { QuickStatsCard } from "@/components/quick-stats-card"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [players, latestEvent, finances, aces, events] = await Promise.all([
    getPlayersWithStats(),
    getLatestSubmittedEvent(),
    getFinances(),
    getAces(),
    getSubmittedEvents()
  ])
  
  // Get handicaps for the latest event (based on prior events only)
  const attendingPlayerIds = latestEvent?.attendance?.map(a => a.player_id) || []
  const handicaps = latestEvent 
    ? await getHandicapsForEvent(latestEvent.week_number, attendingPlayerIds)
    : new Map<string, number>()

  const members = players.filter(p => p.is_member)
  const topPlayers = [...players]
    .filter(p => p.total_rounds > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5)

  return (
    <div className="min-h-screen">
      <DashboardHero 
        memberCount={members.length}
        totalWeeks={events.length}
        acePool={finances?.ace_pool || 0}
      />
      
      <div className="container mx-auto px-4 pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Latest Event Results */}
          <div className="lg:col-span-2">
            <LatestWeekCard 
              week={latestEvent} 
              handicaps={Object.fromEntries(handicaps)}
            />
          </div>
          
          {/* Ace Pool */}
          <div>
            <AcePoolCard 
              acePool={finances?.ace_pool || 0} 
              latestAce={aces[0] || null}
            />
          </div>
          
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <LeaderboardCard players={topPlayers} />
          </div>
          
          {/* Quick Stats */}
          <div>
            <QuickStatsCard 
              totalPlayers={players.length}
              totalMembers={members.length}
              totalRounds={events.length}
              totalAces={aces.length}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
