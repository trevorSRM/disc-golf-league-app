export interface Player {
  id: string
  name: string
  is_member: boolean
  created_at: string
}

export interface Week {
  id: string
  week_number: number
  date: string
  course_name: string | null
  ctp_winner_id: string | null
  is_doubles: boolean
  is_submitted: boolean
  cards_saved: boolean
  card_assignments: CardAssignment[] | null
  doubles_scoring_type: 'raw' | 'handicap' | null
  doubles_ctp_team_id: string | null
  playoff_winner_id: string | null
  playoff_winner_team_id: string | null
  created_at: string
}

// Alias for clarity - Event is the same as Week in the database
export type Event = Week

export interface CardAssignment {
  hole: number
  players: string[] // player IDs
  teams?: { player1_id: string; player2_id: string }[] // for doubles
  sanctioned?: boolean // true when this is a PDGA sanctioned card (singles)
}

export interface Attendance {
  id: string
  week_id: string
  player_id: string
  score: number | null
  sanctioned: boolean
  created_at: string
}

export interface DoublesEvent {
  id: string
  event_date: string
  course_name: string | null
  created_at: string
}

export interface DoublesTeam {
  id: string
  event_id: string | null
  week_id: string | null
  player1_id: string
  player2_id: string
  team_handicap: number | null
  score: number | null
  created_at: string
}

export interface Ace {
  id: string
  player_id: string
  week_id: string | null
  event_id: string | null
  payout: number
  hole_number: number | null
  course_name: string | null
  date: string
  created_at: string
}

export interface LeagueFinances {
  id: string
  ace_pool: number
  total_collected: number
  total_paid_out: number
  updated_at: string
}

// Extended types with joins
export interface PlayerWithStats extends Player {
  handicap: number
  total_rounds: number
  singles_wins: number
  doubles_wins: number
  wins: number
  average_score: number
}

export interface AttendanceWithPlayer extends Attendance {
  player: Player
}

export interface WeekWithDetails extends Week {
  attendance: AttendanceWithPlayer[]
  ctp_winner: Player | null
  doubles_teams?: DoublesTeamWithPlayers[]
  doubles_ctp_team?: DoublesTeamWithPlayers | null
}

export interface DoublesTeamWithPlayers extends DoublesTeam {
  player1: Player
  player2: Player
}

export interface DoublesEventWithTeams extends DoublesEvent {
  teams: DoublesTeamWithPlayers[]
}

export interface AceWithPlayer extends Ace {
  player: Player
}

// Calculation helpers
export const PAR = 54

// Handicap = inverse of average under par
// If you shot 10 under par on average (44), your handicap is +10
// If you shot 5 over par on average (59), your handicap is -5
//
// Rules:
// - Use only the most recent 10 rounds
// - Require minimum 3 rounds to establish a handicap
// - Scale drops based on rounds played:
//   - 3 rounds: drop 0
//   - 4-5 rounds: drop 1
//   - 6+ rounds: drop 2
export function calculateHandicap(scores: number[]): number {
  if (scores.length < 3) return 0 // Need at least 3 rounds
  
  // Take only the most recent 10 rounds (scores should already be ordered newest first)
  const recentScores = scores.slice(0, 10)
  const numRounds = recentScores.length
  
  // Sort ascending to find worst scores (highest = worst in golf)
  const sorted = [...recentScores].sort((a, b) => a - b)
  
  // Scale drops based on rounds played
  let scoresToDrop = 0
  if (numRounds >= 6) {
    scoresToDrop = 2
  } else if (numRounds >= 4) {
    scoresToDrop = 1
  }
  
  const trimmedScores = sorted.slice(0, sorted.length - scoresToDrop)
  
  const average = trimmedScores.reduce((a, b) => a + b, 0) / trimmedScores.length
  // PAR - average gives the inverse
  // Good player (avg 44) -> 54 - 44 = +10 handicap (penalty)
  // Bad player (avg 59) -> 54 - 59 = -5 handicap (bonus)
  return Math.round((PAR - average) * 10) / 10
}

// In doubles, each partner can only bring a handicap between -10 and +10 to the team.
// A player's singles handicap is clamped to this range before the team handicap is computed.
export const DOUBLES_HANDICAP_CAP = 10

function clampDoublesHandicap(handicap: number): number {
  return Math.max(-DOUBLES_HANDICAP_CAP, Math.min(DOUBLES_HANDICAP_CAP, handicap))
}

// Team Handicap = (Player A's capped handicap + Player B's capped handicap) / 3
export function calculateTeamHandicap(player1Handicap: number, player2Handicap: number): number {
  const p1 = clampDoublesHandicap(player1Handicap)
  const p2 = clampDoublesHandicap(player2Handicap)
  return Math.round(((p1 + p2) / 3) * 10) / 10
}

// Wild Man Handicap = (Wild Man's capped singles handicap × 2) / 3
export function calculateWildManHandicap(singlesHandicap: number): number {
  const capped = clampDoublesHandicap(singlesHandicap)
  return Math.round(((capped * 2) / 3) * 10) / 10
}

// Final Score = (raw score - PAR) + handicap
// Example: Shot 44, handicap +10 (good player) -> (44-54) + 10 = 0
export function calculateFinalScore(rawScore: number, handicap: number): number {
  return (rawScore - PAR) + handicap
}

// Attendance-based payout tiers for SINGLES weeks.
// On high-attendance weeks we redistribute a small portion of the extra buy-ins
// as additional prizes (a Hot Round bump plus 2nd Place and Low Raw payouts).
// The bulk of the surplus is intentionally banked for the year-end tournament.
//
// These tiers only take effect starting Week 9. Weeks 1-8 use the original
// flat payout (Hot Round $20, CTP $20) so historical/banked numbers are unchanged.
//
//   Under 20 players: Hot Round $20, CTP $20
//   20-24 players:    Hot Round $25, CTP $20, 2nd Place $10, Low Raw $5
//   25+ players:      Hot Round $30, CTP $20, 2nd Place $15, Low Raw $10
export interface SinglesPayouts {
  hotRound: number
  ctp: number
  secondPlace: number
  lowRaw: number
  tier: "standard" | "large" | "huge"
}

export const ATTENDANCE_TIER_LARGE = 20
export const ATTENDANCE_TIER_HUGE = 25
// Tiered payouts only apply to this week number and later.
export const PAYOUT_TIERS_EFFECTIVE_WEEK = 9

const STANDARD_PAYOUTS: SinglesPayouts = { hotRound: 20, ctp: 20, secondPlace: 0, lowRaw: 0, tier: "standard" }

// weekNumber is optional; when provided, tiers only apply on/after PAYOUT_TIERS_EFFECTIVE_WEEK.
export function getSinglesPayouts(attendanceCount: number, weekNumber?: number): SinglesPayouts {
  // Weeks before the effective week always use the original flat payout.
  if (weekNumber !== undefined && weekNumber < PAYOUT_TIERS_EFFECTIVE_WEEK) {
    return STANDARD_PAYOUTS
  }
  if (attendanceCount >= ATTENDANCE_TIER_HUGE) {
    return { hotRound: 30, ctp: 20, secondPlace: 15, lowRaw: 10, tier: "huge" }
  }
  if (attendanceCount >= ATTENDANCE_TIER_LARGE) {
    return { hotRound: 25, ctp: 20, secondPlace: 10, lowRaw: 5, tier: "large" }
  }
  return STANDARD_PAYOUTS
}
