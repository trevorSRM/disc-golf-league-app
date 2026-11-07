import { 
  getPlayers, 
  getWeeks, 
  getCurrentEvent,
  getDoublesTeamsForWeek,
  getFinances, 
  getCalculatedFinances, 
  getAces,
  getAllPlayerHandicaps,
  getPlayerMoneyRankings,
  getFinaleCtps,
  getSeasonSummaries
} from "@/lib/data"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { redirect } from "next/navigation"
import { isAdminSession } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  if (!(await isAdminSession())) redirect("/")

  const [players, events, currentEvent, finances, calculatedFinances, aces, handicaps, moneyRankings, seasons] = await Promise.all([
    getPlayers(),
    getWeeks(),
    getCurrentEvent(),
    getFinances(),
    getCalculatedFinances(),
    getAces(),
    getAllPlayerHandicaps(),
    getPlayerMoneyRankings(),
    getSeasonSummaries()
  ])

  // The season being played: year of the latest event (or this year with none yet).
  const seasonYear = events.length
    ? Math.max(...events.map(e => Number(e.date.slice(0, 4))))
    : new Date().getFullYear()

  // Get doubles teams for current event if it exists
  const currentEventTeams = currentEvent
    ? await getDoublesTeamsForWeek(currentEvent.id)
    : []
  const finaleCtps = currentEvent?.is_finale
    ? await getFinaleCtps(currentEvent.id)
    : []

  return (
    <AdminDashboard 
      players={players}
      events={events}
      currentEvent={currentEvent}
      currentEventTeams={currentEventTeams}
      finaleCtps={finaleCtps}
      finances={finances}
      calculatedFinances={calculatedFinances}
      aces={aces}
      handicaps={handicaps}
      moneyRankings={moneyRankings}
      lockedYears={seasons.map(s => s.year)}
      seasonYear={seasonYear}
    />
  )
}
