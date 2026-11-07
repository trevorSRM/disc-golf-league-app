// Locked season summaries (the `season_summaries` table). A summary is a frozen
// snapshot written once by "Lock Season" in Admin; the database refuses any
// update or delete afterwards. Everything is stored by name, not by player id,
// so wiping players for a new season can't change a past year.

import type { FinaleCtpSpec, FinalePrize, FinaleStanding } from "@/lib/finale"

export interface FinaleSnapshot {
  title: string
  date: string
  location: string
  pool: number
  mode: "singles" | "doubles-handicap" | "doubles-raw"
  paidPlaces: number
  standings: FinaleStanding[]
  lowRaw?: FinaleStanding[]
  lowRawPaid?: number
  prizes: FinalePrize[]
  ctpSpecs: FinaleCtpSpec[]
  ctpNote: string
}

export interface SeasonSummary {
  year: number
  /** "finale" = finale results only (2026); "full" = whole-season recap. */
  recap: "finale" | "full"
  singles: FinaleSnapshot | null
  doubles: FinaleSnapshot | null
  aces: { name: string; course: string | null; hole: number | null; date: string; payout: number }[]
  /** Full recaps only. */
  stats?: { events: number; players: number; members: number; rounds: number }
  moneyLeaders?: { name: string; total: number }[]
  winsLeaders?: { name: string; wins: number; singles: number; doubles: number }[]
}

export interface SeasonSummaryRow {
  year: number
  data: SeasonSummary
  locked_at: string
}

/** 2026 lost its regular-season data mid-year, so only the finale is summarized. */
export const FINALE_ONLY_SEASONS = [2026]
