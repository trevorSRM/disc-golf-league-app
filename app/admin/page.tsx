import { 
  getPlayers, 
  getWeeks, 
  getCurrentEvent,
  getDoublesTeamsForWeek,
  getFinances, 
  getCalculatedFinances, 
  getAces,
  getAllPlayerHandicaps,
  getPlayerMoneyRankings
} from "@/lib/data"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { redirect } from "next/navigation"
import { isAdminSession } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  if (!(await isAdminSession())) redirect("/")

  const [players, events, currentEvent, finances, calculatedFinances, aces, handicaps, moneyRankings] = await Promise.all([
    getPlayers(),
    getWeeks(),
    getCurrentEvent(),
    getFinances(),
    getCalculatedFinances(),
    getAces(),
    getAllPlayerHandicaps(),
    getPlayerMoneyRankings()
  ])

  // Get doubles teams for current event if it exists
  const currentEventTeams = currentEvent 
    ? await getDoublesTeamsForWeek(currentEvent.id)
    : []

  return (
    <AdminDashboard 
      players={players}
      events={events}
      currentEvent={currentEvent}
      currentEventTeams={currentEventTeams}
      finances={finances}
      calculatedFinances={calculatedFinances}
      aces={aces}
      handicaps={handicaps}
      moneyRankings={moneyRankings}
    />
  )
}
