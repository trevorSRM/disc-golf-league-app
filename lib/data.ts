import { createClient } from "@/lib/supabase/server"
import { 
  Player, 
  Week, 
  Attendance, 
  DoublesEvent,
  DoublesTeam,
  Ace,
  LeagueFinances,
  PlayerWithStats,
  WeekWithDetails,
  DoublesEventWithTeams,
  DoublesTeamWithPlayers,
  AceWithPlayer,
  calculateHandicap,
  PAR,
  getSinglesPayouts
} from "@/lib/types"

// Players
export async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name")
  
  if (error) throw error
  return data || []
}

export async function getPlayersWithStats(): Promise<PlayerWithStats[]> {
  const supabase = await createClient()
  
  // Get all players
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*")
    .order("name")
  
  if (playersError) throw playersError
  
  // Get all attendance with scores. NOTE: PostgREST does not reliably order root
  // rows by an embedded table's column, so we sort by week_number in JS below to
  // guarantee newest-first order (required for calculateHandicap's most-recent-10 rule).
  const { data: attendanceRaw, error: attendanceError } = await supabase
    .from("attendance")
    .select("player_id, score, week_id, weeks!inner(week_number, is_doubles)")
  
  if (attendanceError) throw attendanceError
  
  const attendance = [...(attendanceRaw || [])].sort((a, b) => {
    const aw = (a.weeks as { week_number: number }).week_number
    const bw = (b.weeks as { week_number: number }).week_number
    return bw - aw // newest week first
  })

  // Get SINGLES weeks to determine winners (with week_number for ordering)
  const { data: singlesWeeks, error: singlesWeeksError } = await supabase
    .from("weeks")
    .select("id, week_number, playoff_winner_id")
    .eq("is_doubles", false)
    .eq("is_submitted", true)
    .order("week_number", { ascending: true })
  
  if (singlesWeeksError) throw singlesWeeksError
  
  // Get DOUBLES weeks
  const { data: doublesWeeks, error: doublesWeeksError } = await supabase
    .from("weeks")
    .select("id, week_number, doubles_scoring_type, playoff_winner_team_id")
    .eq("is_doubles", true)
    .eq("is_submitted", true)
    .order("week_number", { ascending: true })
  
  if (doublesWeeksError) throw doublesWeeksError
  
  // Get doubles teams
  const { data: doublesTeams, error: doublesTeamsError } = await supabase
    .from("doubles_teams")
    .select("id, week_id, player1_id, player2_id, score, team_handicap")
  
  if (doublesTeamsError) throw doublesTeamsError
  
  // Build membership map
  const membershipMap = new Map<string, boolean>()
  for (const p of (players || [])) {
    membershipMap.set(p.id, p.is_member)
  }
  
  // Pre-calculate doubles wins for all players
  const doublesWinsMap = new Map<string, number>()
  
  for (const week of (doublesWeeks || [])) {
    const weekTeams = (doublesTeams || []).filter(t => t.week_id === week.id && t.score !== null)
    if (weekTeams.length === 0) continue
    
    let winningTeam: typeof weekTeams[0] | null = null
    
    if (week.doubles_scoring_type === 'raw') {
      const minScore = Math.min(...weekTeams.map(t => t.score as number))
      const tiedTeams = weekTeams.filter(t => t.score === minScore)
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.id === week.playoff_winner_team_id) || tiedTeams[0]
      } else {
        winningTeam = tiedTeams[0] || null
      }
    } else {
      const teamFinalScores = weekTeams.map(t => ({
        team: t,
        finalScore: (t.score as number) - PAR + (t.team_handicap || 0)
      }))
      const minFinal = Math.min(...teamFinalScores.map(t => t.finalScore))
      const tiedTeams = teamFinalScores.filter(t => t.finalScore === minFinal)
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.team.id === week.playoff_winner_team_id)?.team || tiedTeams[0]?.team
      } else {
        winningTeam = tiedTeams[0]?.team || null
      }
    }
    
    if (winningTeam) {
      doublesWinsMap.set(winningTeam.player1_id, (doublesWinsMap.get(winningTeam.player1_id) || 0) + 1)
      doublesWinsMap.set(winningTeam.player2_id, (doublesWinsMap.get(winningTeam.player2_id) || 0) + 1)
    }
  }
  
  // Calculate stats for each player
  const playersWithStats: PlayerWithStats[] = (players || []).map(player => {
    // Only count singles attendance for handicap and rounds
    const playerAttendance = (attendance || []).filter(a => {
      const weekInfo = a.weeks as { week_number: number; is_doubles: boolean }
      return a.player_id === player.id && a.score !== null && !weekInfo.is_doubles
    })
    const scores = playerAttendance.map(a => a.score as number)
    // Raw handicap (what they'd have if they were a member)
    const handicap = player.is_member ? calculateHandicap(scores) : 0

    // Count SINGLES wins and calculate average final score
    let singlesWins = 0
    const playerFinalScores: number[] = []
    
    for (const week of (singlesWeeks || [])) {
      const weekAttendance = (attendance || []).filter(a => a.week_id === week.id && a.score !== null)
      if (weekAttendance.length === 0) continue
      
      // Get prior weeks for handicap calculation
      const priorWeekIds = (singlesWeeks || [])
        .filter(w => w.week_number < week.week_number)
        .map(w => w.id)
      
      // Calculate raw handicaps for this week's attendance
      const rawHandicaps = new Map<string, number>()
      const hasEnoughRounds = new Map<string, boolean>()
      for (const a of weekAttendance) {
        const priorScores = (attendance || [])
          .filter(att => att.player_id === a.player_id && att.score !== null && priorWeekIds.includes(att.week_id))
          .map(att => att.score as number)
        rawHandicaps.set(a.player_id, calculateHandicap(priorScores))
        hasEnoughRounds.set(a.player_id, priorScores.length >= 3)
      }
      
      // Find best member handicap among attending players who have enough rounds
      let bestMemberHandicap = 0
      for (const a of weekAttendance) {
        const isMember = membershipMap.get(a.player_id) || false
        const hc = rawHandicaps.get(a.player_id) || 0
        const hasRounds = hasEnoughRounds.get(a.player_id) || false
        if (isMember && hasRounds && hc > bestMemberHandicap) {
          bestMemberHandicap = hc
        }
      }
      
      // Calculate final scores with member rule applied
      const finalScores = weekAttendance.map(a => {
        const isMember = membershipMap.get(a.player_id) || false
        const rawHc = rawHandicaps.get(a.player_id) || 0
        const hasRounds = hasEnoughRounds.get(a.player_id) || false
        const effectiveHandicap = (isMember && hasRounds) ? rawHc : bestMemberHandicap
        const rawScore = a.score as number
        const finalScore = (rawScore - PAR) + effectiveHandicap
        return {
          player_id: a.player_id,
          final_score: finalScore
        }
      })
      
      // Track this player's final score for this week (exclude week 1 from average since no handicap)
      const playerResult = finalScores.find(s => s.player_id === player.id)
      if (playerResult && week.week_number > 1) {
        playerFinalScores.push(playerResult.final_score)
      }
      
      const minFinal = Math.min(...finalScores.map(s => s.final_score))
      const tiedPlayers = finalScores.filter(s => s.final_score === minFinal)
      
      // Check if this player won (handle playoff)
      let isWinner = false
      if (tiedPlayers.length > 1 && week.playoff_winner_id) {
        isWinner = week.playoff_winner_id === player.id
      } else if (tiedPlayers.length === 1 && tiedPlayers[0].player_id === player.id) {
        isWinner = true
      }
      
      if (isWinner) {
        singlesWins++
      }
    }

    // Average final score (not raw stroke average)
    const average_score = playerFinalScores.length > 0 
      ? Math.round((playerFinalScores.reduce((a, b) => a + b, 0) / playerFinalScores.length) * 10) / 10
      : 0
    
    const doublesWins = doublesWinsMap.get(player.id) || 0

    return {
      ...player,
      handicap,
      total_rounds: scores.length,
      singles_wins: singlesWins,
      doubles_wins: doublesWins,
      wins: singlesWins + doublesWins,
      average_score
    }
  })

  return playersWithStats
}

export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) return null
  return data
}

// Returns the set of week IDs (singles + doubles) that a specific player WON.
// Mirrors the exact winner logic in getPlayersWithStats (handicap-adjusted final
// scores, member rule, and playoff tie-breaks) so the badges stay consistent with
// the Win Leaderboard.
export async function getPlayerWinWeekIds(playerId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const winWeekIds = new Set<string>()

  // All players (for membership rule) and all scored attendance (for prior handicaps)
  const { data: players } = await supabase.from("players").select("id, is_member")
  const { data: attendance } = await supabase
    .from("attendance")
    .select("player_id, score, week_id, weeks!inner(week_number, is_doubles)")

  const { data: singlesWeeks } = await supabase
    .from("weeks")
    .select("id, week_number, playoff_winner_id")
    .eq("is_doubles", false)
    .eq("is_submitted", true)
    .order("week_number", { ascending: true })

  const { data: doublesWeeks } = await supabase
    .from("weeks")
    .select("id, week_number, doubles_scoring_type, playoff_winner_team_id")
    .eq("is_doubles", true)
    .eq("is_submitted", true)
    .order("week_number", { ascending: true })

  const { data: doublesTeams } = await supabase
    .from("doubles_teams")
    .select("id, week_id, player1_id, player2_id, score, team_handicap")

  const membershipMap = new Map<string, boolean>()
  for (const p of (players || [])) {
    membershipMap.set(p.id, p.is_member)
  }

  // Doubles wins
  for (const week of (doublesWeeks || [])) {
    const weekTeams = (doublesTeams || []).filter(t => t.week_id === week.id && t.score !== null)
    if (weekTeams.length === 0) continue

    let winningTeam: typeof weekTeams[0] | null = null
    if (week.doubles_scoring_type === 'raw') {
      const minScore = Math.min(...weekTeams.map(t => t.score as number))
      const tiedTeams = weekTeams.filter(t => t.score === minScore)
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.id === week.playoff_winner_team_id) || tiedTeams[0]
      } else {
        winningTeam = tiedTeams[0] || null
      }
    } else {
      const teamFinalScores = weekTeams.map(t => ({
        team: t,
        finalScore: (t.score as number) - PAR + (t.team_handicap || 0)
      }))
      const minFinal = Math.min(...teamFinalScores.map(t => t.finalScore))
      const tiedTeams = teamFinalScores.filter(t => t.finalScore === minFinal)
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.team.id === week.playoff_winner_team_id)?.team || tiedTeams[0]?.team
      } else {
        winningTeam = tiedTeams[0]?.team || null
      }
    }

    if (winningTeam && (winningTeam.player1_id === playerId || winningTeam.player2_id === playerId)) {
      winWeekIds.add(week.id)
    }
  }

  // Singles wins
  for (const week of (singlesWeeks || [])) {
    const weekAttendance = (attendance || []).filter(a => a.week_id === week.id && a.score !== null)
    if (weekAttendance.length === 0) continue

    const priorWeekIds = (singlesWeeks || [])
      .filter(w => w.week_number < week.week_number)
      .map(w => w.id)

    const rawHandicaps = new Map<string, number>()
    const hasEnoughRounds = new Map<string, boolean>()
    for (const a of weekAttendance) {
      const priorScores = (attendance || [])
        .filter(att => att.player_id === a.player_id && att.score !== null && priorWeekIds.includes(att.week_id))
        .map(att => att.score as number)
      rawHandicaps.set(a.player_id, calculateHandicap(priorScores))
      hasEnoughRounds.set(a.player_id, priorScores.length >= 3)
    }

    let bestMemberHandicap = 0
    for (const a of weekAttendance) {
      const isMember = membershipMap.get(a.player_id) || false
      const hc = rawHandicaps.get(a.player_id) || 0
      const hasRounds = hasEnoughRounds.get(a.player_id) || false
      if (isMember && hasRounds && hc > bestMemberHandicap) {
        bestMemberHandicap = hc
      }
    }

    const finalScores = weekAttendance.map(a => {
      const isMember = membershipMap.get(a.player_id) || false
      const rawHc = rawHandicaps.get(a.player_id) || 0
      const hasRounds = hasEnoughRounds.get(a.player_id) || false
      const effectiveHandicap = (isMember && hasRounds) ? rawHc : bestMemberHandicap
      const rawScore = a.score as number
      return { player_id: a.player_id, final_score: (rawScore - PAR) + effectiveHandicap }
    })

    const minFinal = Math.min(...finalScores.map(s => s.final_score))
    const tiedPlayers = finalScores.filter(s => s.final_score === minFinal)

    let isWinner = false
    if (tiedPlayers.length > 1 && week.playoff_winner_id) {
      isWinner = week.playoff_winner_id === playerId
    } else if (tiedPlayers.length === 1 && tiedPlayers[0].player_id === playerId) {
      isWinner = true
    }

    if (isWinner) {
      winWeekIds.add(week.id)
    }
  }

  return winWeekIds
}

// Weeks
export async function getWeeks(): Promise<Week[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .order("date", { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getWeekWithDetails(id: string): Promise<WeekWithDetails | null> {
  const supabase = await createClient()
  
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("*")
    .eq("id", id)
    .single()
  
  if (weekError) return null
  
  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance")
    .select("*, player:players(*)")
    .eq("week_id", id)
  
  if (attendanceError) throw attendanceError
  
  let ctpWinner = null
  if (week.ctp_winner_id) {
    const { data: ctp } = await supabase
      .from("players")
      .select("*")
      .eq("id", week.ctp_winner_id)
      .single()
    ctpWinner = ctp
  }
  
  // Fetch doubles teams if this is a doubles event
  let doublesTeams: DoublesTeamWithPlayers[] = []
  let doublesCTPTeam: DoublesTeamWithPlayers | null = null
  
  if (week.is_doubles) {
    const { data: teams } = await supabase
      .from("doubles_teams")
      .select("*, player1:players!doubles_teams_player1_id_fkey(*), player2:players!doubles_teams_player2_id_fkey(*)")
      .eq("week_id", id)
    
    doublesTeams = (teams || []) as DoublesTeamWithPlayers[]
    
    // Fetch doubles CTP team if set
    if (week.doubles_ctp_team_id) {
      doublesCTPTeam = doublesTeams.find(t => t.id === week.doubles_ctp_team_id) || null
    }
  }
  
  return {
    ...week,
    attendance: attendance || [],
    ctp_winner: ctpWinner,
    doubles_teams: doublesTeams,
    doubles_ctp_team: doublesCTPTeam
  }
}

export async function getLatestWeek(): Promise<WeekWithDetails | null> {
  const supabase = await createClient()
  
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single()
  
  if (weekError) return null
  
  return getWeekWithDetails(week.id)
}

// Get the current (non-submitted) event
export async function getCurrentEvent(): Promise<WeekWithDetails | null> {
  const supabase = await createClient()
  
  const { data: event, error: eventError } = await supabase
    .from("weeks")
    .select("*")
    .eq("is_submitted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  
  if (eventError || !event) return null
  
  return getWeekWithDetails(event.id)
}

// Get only submitted events (for public events page)
export async function getSubmittedEvents(): Promise<Week[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .eq("is_submitted", true)
    .order("week_number", { ascending: false })
  
  if (error) throw error
  return data || []
}

// Get latest submitted event (for dashboard)
export async function getLatestSubmittedEvent(): Promise<WeekWithDetails | null> {
  const supabase = await createClient()
  
  const { data: event, error: eventError } = await supabase
    .from("weeks")
    .select("*")
    .eq("is_submitted", true)
    .order("week_number", { ascending: false })
    .limit(1)
    .single()
  
  if (eventError || !event) return null
  
  return getWeekWithDetails(event.id)
}

// Attendance
export async function getAttendanceForWeek(weekId: string): Promise<Attendance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("week_id", weekId)
  
  if (error) throw error
  return data || []
}

// Doubles
export async function getDoublesEvents(): Promise<DoublesEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("doubles_events")
    .select("*")
    .order("event_date", { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getDoublesEventWithTeams(id: string): Promise<DoublesEventWithTeams | null> {
  const supabase = await createClient()
  
  const { data: event, error: eventError } = await supabase
    .from("doubles_events")
    .select("*")
    .eq("id", id)
    .single()
  
  if (eventError) return null
  
  const { data: teams, error: teamsError } = await supabase
    .from("doubles_teams")
    .select("*, player1:players!doubles_teams_player1_id_fkey(*), player2:players!doubles_teams_player2_id_fkey(*)")
    .eq("event_id", id)
  
  if (teamsError) throw teamsError
  
  return {
    ...event,
    teams: teams || []
  }
}

// Doubles teams for a week
export async function getDoublesTeamsForWeek(weekId: string): Promise<DoublesTeamWithPlayers[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("doubles_teams")
    .select("*, player1:players!doubles_teams_player1_id_fkey(*), player2:players!doubles_teams_player2_id_fkey(*)")
    .eq("week_id", weekId)
  
  if (error) throw error
  return data || []
}

// Aces
export async function getAces(): Promise<AceWithPlayer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("aces")
    .select("*, player:players(*)")
    .order("date", { ascending: false })
  
  if (error) throw error
  return data || []
}

// Finances
export async function getFinances(): Promise<LeagueFinances | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("league_finances")
    .select("*")
    .limit(1)
    .single()
  
  if (error) return null
  return data
}

// Auto-calculated finances based on actual data
export interface CalculatedFinances {
  ace_pool: number
  total_collected: number
  total_paid_out: number
  breakdown: {
    membership_fees: number
    weekly_fees: number
    hot_round_payouts: number
    second_place_payouts: number
    low_raw_payouts: number
    ctp_payouts: number
    ace_payouts: number
    member_count: number
    total_attendance: number
    weeks_with_scores: number
    weeks_with_ctp: number
  }
}

export async function getCalculatedFinances(): Promise<CalculatedFinances> {
  const supabase = await createClient()
  
  // Get member count
  const { data: members } = await supabase
    .from("players")
    .select("id")
    .eq("is_member", true)
  const memberCount = members?.length || 0
  
  // Get total attendance records (each = $5)
  const { data: attendance } = await supabase
    .from("attendance")
    .select("id, score, week_id")
  const totalAttendance = attendance?.length || 0
  
  // Get all submitted weeks to determine singles vs doubles
  // week_number is required so the payout-tier cutoff (Week 9+) is applied correctly.
  const { data: allWeeks } = await supabase
    .from("weeks")
    .select("id, week_number, is_doubles, ctp_winner_id, doubles_ctp_team_id")
    .eq("is_submitted", true)
  
  // Count singles weeks with scores (hot round = $20)
  const singlesWeeksWithScores = new Set<string>()
  for (const a of attendance || []) {
    if (a.score !== null) {
      const week = allWeeks?.find(w => w.id === a.week_id)
      if (week && !week.is_doubles) {
        singlesWeeksWithScores.add(a.week_id)
      }
    }
  }
  
  // Get doubles teams with scores for doubles hot round calculation
  const { data: doublesTeams } = await supabase
    .from("doubles_teams")
    .select("id, week_id, score")
  
  // Count doubles weeks with scores (hot round = $40 = 2 players x $20)
  const doublesWeeksWithScores = new Set<string>()
  for (const t of doublesTeams || []) {
    if (t.score !== null) {
      const week = allWeeks?.find(w => w.id === t.week_id)
      if (week && week.is_doubles) {
        doublesWeeksWithScores.add(t.week_id)
      }
    }
  }
  
  // Tiered SINGLES prize payouts (Hot Round bump + 2nd Place + Low Raw on high-attendance weeks)
  let singlesHotRoundPayouts = 0
  let secondPlacePayouts = 0
  let lowRawPayouts = 0
  for (const weekId of singlesWeeksWithScores) {
    const weekRows = (attendance || []).filter(a => a.week_id === weekId)
    const attendanceCount = weekRows.length
    const scorerCount = weekRows.filter(a => a.score !== null).length
    const weekNumber = allWeeks?.find(w => w.id === weekId)?.week_number
    const payouts = getSinglesPayouts(attendanceCount, weekNumber)
    singlesHotRoundPayouts += payouts.hotRound
    if (scorerCount >= 1) lowRawPayouts += payouts.lowRaw
    if (scorerCount >= 2) secondPlacePayouts += payouts.secondPlace
  }
  
  // Count singles CTP (individual = $20)
  const singlesCTPCount = allWeeks?.filter(w => !w.is_doubles && w.ctp_winner_id)?.length || 0
  
  // Count doubles CTP (team = $40 = 2 players x $20)
  const doublesCTPCount = allWeeks?.filter(w => w.is_doubles && w.doubles_ctp_team_id)?.length || 0
  
  // Get total ace payouts
  const { data: aces } = await supabase
    .from("aces")
    .select("payout")
  const acePayouts = aces?.reduce((sum, ace) => sum + Number(ace.payout), 0) || 0
  
  // Get current ace pool from league_finances
  const { data: finances } = await supabase
    .from("league_finances")
    .select("ace_pool")
    .limit(1)
    .single()
  const acePool = finances?.ace_pool || 0
  
  // Calculate totals
  const membershipFees = memberCount * 25
  const weeklyFees = totalAttendance * 5
  // Singles hot round is tiered ($20 base, $25 on 20+ weeks); Doubles hot round = $40 (both team members get $20)
  const hotRoundPayouts = singlesHotRoundPayouts + (doublesWeeksWithScores.size * 40)
  // Singles CTP = $20, Doubles CTP = $40 (both team members get $20)
  const ctpPayouts = (singlesCTPCount * 20) + (doublesCTPCount * 40)
  
  const totalCollected = membershipFees + weeklyFees
  const totalPaidOut = hotRoundPayouts + secondPlacePayouts + lowRawPayouts + ctpPayouts + acePayouts
  
  const totalWeeksWithScores = singlesWeeksWithScores.size + doublesWeeksWithScores.size
  const totalCTPCount = singlesCTPCount + doublesCTPCount
  
  return {
    ace_pool: acePool,
    total_collected: totalCollected,
    total_paid_out: totalPaidOut,
    breakdown: {
      membership_fees: membershipFees,
      weekly_fees: weeklyFees,
      hot_round_payouts: hotRoundPayouts,
      second_place_payouts: secondPlacePayouts,
      low_raw_payouts: lowRawPayouts,
      ctp_payouts: ctpPayouts,
      ace_payouts: acePayouts,
      member_count: memberCount,
      total_attendance: totalAttendance,
      weeks_with_scores: totalWeeksWithScores,
      weeks_with_ctp: totalCTPCount
    }
  }
}

// Helper to get handicap for a specific player
export async function getPlayerHandicap(playerId: string): Promise<number> {
  const supabase = await createClient()
  // Order by week_number descending to get most recent rounds first
  const { data, error } = await supabase
    .from("attendance")
    .select("score, weeks!inner(week_number)")
    .eq("player_id", playerId)
    .not("score", "is", null)
    .order("week_number", { referencedTable: "weeks", ascending: false })
  
  if (error || !data) return 0
  
  const scores = data.map(a => a.score as number)
  return calculateHandicap(scores)
}

// Get all player handicaps (singles only - doubles scores do not affect handicaps)
export async function getAllPlayerHandicaps(): Promise<Map<string, number>> {
  const supabase = await createClient()
  // Only get scores from singles weeks (is_doubles = false).
  // NOTE: PostgREST does not reliably order root rows by an embedded table's column,
  // so we sort by week_number in JS to guarantee newest-first order (required for
  // calculateHandicap's most-recent-10 rule).
  const { data, error } = await supabase
    .from("attendance")
    .select("player_id, score, weeks!inner(week_number, is_doubles)")
    .not("score", "is", null)
    .eq("weeks.is_doubles", false)
  
  if (error || !data) return new Map()
  
  const sorted = [...data].sort((a, b) => {
    const aw = (a.weeks as { week_number: number }).week_number
    const bw = (b.weeks as { week_number: number }).week_number
    return bw - aw // newest week first
  })
  
  // Group scores by player (now ordered newest first)
  const playerScores = new Map<string, number[]>()
  for (const record of sorted) {
    const scores = playerScores.get(record.player_id) || []
    scores.push(record.score as number)
    playerScores.set(record.player_id, scores)
  }
  
  const handicaps = new Map<string, number>()
  for (const [playerId, scores] of playerScores) {
    handicaps.set(playerId, calculateHandicap(scores))
  }
  
  return handicaps
}

// Get player money rankings (how much each player has won)
export type PlayerMoneyRanking = {
  player_id: string
  player_name: string
  singles_hot_round_wins: number
  doubles_hot_round_wins: number
  hot_round_wins: number
  second_place_wins: number
  low_raw_wins: number
  ctp_wins: number
  doubles_winnings: number
  ace_payouts: number
  total_winnings: number
}

export async function getPlayerMoneyRankings(): Promise<PlayerMoneyRanking[]> {
  const supabase = await createClient()
  
  // Get all players
  const { data: players } = await supabase.from("players").select("id, name, is_member")
  if (!players) return []
  
  // Get all submitted SINGLES weeks with their attendance and scores
  // Doubles scores don't affect singles handicaps or hot round calculations
  const { data: singlesWeeks } = await supabase
    .from("weeks")
    .select("id, week_number, ctp_winner_id, playoff_winner_id, is_submitted")
    .eq("is_submitted", true)
    .eq("is_doubles", false)
    .order("week_number", { ascending: true })
  
  // Get all submitted DOUBLES weeks
  const { data: doublesWeeks } = await supabase
    .from("weeks")
    .select("id, week_number, doubles_ctp_team_id, doubles_scoring_type, playoff_winner_team_id, is_submitted")
    .eq("is_submitted", true)
    .eq("is_doubles", true)
    .order("week_number", { ascending: true })
  
  // Get all attendance records (for singles)
  const { data: attendance } = await supabase
    .from("attendance")
    .select("player_id, score, week_id")
  
  // Get all doubles teams with scores
  const { data: doublesTeams } = await supabase
    .from("doubles_teams")
    .select("id, week_id, player1_id, player2_id, score, team_handicap")
  
  // Get all aces
  const { data: aces } = await supabase
    .from("aces")
    .select("player_id, payout")
  
  // Build membership map
  const membershipMap = new Map<string, boolean>()
  for (const player of players) {
    membershipMap.set(player.id, player.is_member)
  }
  
  // Calculate SINGLES hot round winners per week (using proper final score with prior handicaps)
  // Non-members get the best member's handicap from attending players
  const singlesHotRoundWins = new Map<string, number>()
  const secondPlaceWins = new Map<string, number>()
  const lowRawWins = new Map<string, number>()
  // Actual dollar winnings from singles prizes (tiered by attendance)
  const prizeWinnings = new Map<string, number>()
  const addWinnings = (playerId: string, amount: number) => {
    if (amount > 0) prizeWinnings.set(playerId, (prizeWinnings.get(playerId) || 0) + amount)
  }
  // Doubles-only dollar winnings, tracked separately so they can be shown on the rankings.
  // (These dollars are ALSO included in each player's total via prizeWinnings/ctp totals.)
  const doublesWinnings = new Map<string, number>()
  const addDoublesWinnings = (playerId: string, amount: number) => {
    if (amount > 0) doublesWinnings.set(playerId, (doublesWinnings.get(playerId) || 0) + amount)
  }
  
  for (const week of (singlesWeeks || [])) {
    const weekAttendance = (attendance || []).filter(a => a.week_id === week.id && a.score !== null)
    if (weekAttendance.length === 0) continue
    
    // Determine payout tier from total attendance (everyone who paid in), not just scorers.
    // Tiers only apply starting Week 9; earlier weeks use the original flat payout.
    const weekAttendanceCount = (attendance || []).filter(a => a.week_id === week.id).length
    const payouts = getSinglesPayouts(weekAttendanceCount, week.week_number)
    
    // Get prior week IDs for handicap calculation
    const priorWeekIds = (singlesWeeks || [])
      .filter(w => w.week_number < week.week_number)
      .map(w => w.id)
    
    // Calculate raw handicaps for each player and track if they have enough rounds
    const rawHandicaps = new Map<string, number>()
    const hasEnoughRounds = new Map<string, boolean>()
    for (const a of weekAttendance) {
      const priorScores = (attendance || [])
        .filter(att => att.player_id === a.player_id && att.score !== null && priorWeekIds.includes(att.week_id))
        .map(att => att.score as number)
      rawHandicaps.set(a.player_id, calculateHandicap(priorScores))
      hasEnoughRounds.set(a.player_id, priorScores.length >= 3)
    }
    
    // Find best member handicap among attending players who have enough rounds
    let bestMemberHandicap = 0
    for (const a of weekAttendance) {
      const isMember = membershipMap.get(a.player_id) || false
      const handicap = rawHandicaps.get(a.player_id) || 0
      const hasRounds = hasEnoughRounds.get(a.player_id) || false
      if (isMember && hasRounds && handicap > bestMemberHandicap) {
        bestMemberHandicap = handicap
      }
    }
    
    // Calculate final scores with member rule applied
    // Players without 3 rounds OR non-members get the best member handicap (hardest)
    const finalScores = weekAttendance.map(a => {
      const isMember = membershipMap.get(a.player_id) || false
      const rawHandicap = rawHandicaps.get(a.player_id) || 0
      const hasRounds = hasEnoughRounds.get(a.player_id) || false
      // Use best member handicap if: not a member OR doesn't have 3+ rounds
      const playerHandicap = (isMember && hasRounds) ? rawHandicap : bestMemberHandicap
      const rawScore = a.score as number
      const finalScore = (rawScore - PAR) + playerHandicap
      return { player_id: a.player_id, final_score: finalScore }
    })
    
    const minFinal = Math.min(...finalScores.map(s => s.final_score))
    const tiedPlayers = finalScores.filter(s => s.final_score === minFinal)
    
    // If there's a tie and a playoff winner is recorded, use that
    // Otherwise use the first tied player (which would be a bug if there's actually a tie)
    let winner: typeof tiedPlayers[0] | undefined
    if (tiedPlayers.length > 1 && week.playoff_winner_id) {
      winner = tiedPlayers.find(s => s.player_id === week.playoff_winner_id)
    }
    if (!winner && tiedPlayers.length > 0) {
      winner = tiedPlayers[0]
    }
    
    if (winner) {
      singlesHotRoundWins.set(winner.player_id, (singlesHotRoundWins.get(winner.player_id) || 0) + 1)
      addWinnings(winner.player_id, payouts.hotRound)
      
      // 2nd Place: best final score that isn't the winner (only paid on high-attendance weeks)
      if (payouts.secondPlace > 0) {
        const sortedByFinal = [...finalScores].sort((a, b) => a.final_score - b.final_score)
        const secondPlace = sortedByFinal.find(s => s.player_id !== winner!.player_id)
        if (secondPlace) {
          secondPlaceWins.set(secondPlace.player_id, (secondPlaceWins.get(secondPlace.player_id) || 0) + 1)
          addWinnings(secondPlace.player_id, payouts.secondPlace)
        }
      }
    }
    
    // Low Raw: lowest gross (raw) score, independent of handicap (only paid on high-attendance weeks)
    if (payouts.lowRaw > 0) {
      const minRaw = Math.min(...weekAttendance.map(a => a.score as number))
      const lowRawPlayer = weekAttendance.find(a => (a.score as number) === minRaw)
      if (lowRawPlayer) {
        lowRawWins.set(lowRawPlayer.player_id, (lowRawWins.get(lowRawPlayer.player_id) || 0) + 1)
        addWinnings(lowRawPlayer.player_id, payouts.lowRaw)
      }
    }
  }
  
  // Calculate DOUBLES hot round winners - both team members get a win
  // Each team member gets $20 (total $40 from pot)
  const doublesHotRoundWins = new Map<string, number>()
  for (const week of (doublesWeeks || [])) {
    const weekTeams = (doublesTeams || []).filter(t => t.week_id === week.id && t.score !== null)
    if (weekTeams.length === 0) continue
    
    let winningTeam: typeof weekTeams[0] | null = null
    
    if (week.doubles_scoring_type === 'raw') {
      // RAW scoring: lowest raw score wins
      const minScore = Math.min(...weekTeams.map(t => t.score as number))
      const tiedTeams = weekTeams.filter(t => t.score === minScore)
      
      // If there's a tie and a playoff winner team is recorded, use that
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.id === week.playoff_winner_team_id) || tiedTeams[0]
      } else {
        winningTeam = tiedTeams[0] || null
      }
    } else {
      // Handicap scoring: lowest final score wins
      // Final score = raw score - PAR + team_handicap
      const teamFinalScores = weekTeams.map(t => ({
        team: t,
        finalScore: (t.score as number) - PAR + (t.team_handicap || 0)
      }))
      const minFinal = Math.min(...teamFinalScores.map(t => t.finalScore))
      const tiedTeams = teamFinalScores.filter(t => t.finalScore === minFinal)
      
      // If there's a tie and a playoff winner team is recorded, use that
      if (tiedTeams.length > 1 && week.playoff_winner_team_id) {
        winningTeam = tiedTeams.find(t => t.team.id === week.playoff_winner_team_id)?.team || tiedTeams[0]?.team
      } else {
        winningTeam = tiedTeams[0]?.team || null
      }
    }
    
    if (winningTeam) {
      // Both team members get a "win" and $20 each (a $40 team prize split 50/50)
      doublesHotRoundWins.set(winningTeam.player1_id, (doublesHotRoundWins.get(winningTeam.player1_id) || 0) + 1)
      doublesHotRoundWins.set(winningTeam.player2_id, (doublesHotRoundWins.get(winningTeam.player2_id) || 0) + 1)
      addWinnings(winningTeam.player1_id, 20)
      addWinnings(winningTeam.player2_id, 20)
      addDoublesWinnings(winningTeam.player1_id, 20)
      addDoublesWinnings(winningTeam.player2_id, 20)
    }
  }
  
  // Count SINGLES CTP wins per player
  const ctpWins = new Map<string, number>()
  for (const week of (singlesWeeks || [])) {
    if (week.ctp_winner_id) {
      ctpWins.set(week.ctp_winner_id, (ctpWins.get(week.ctp_winner_id) || 0) + 1)
    }
  }
  
  // Count DOUBLES CTP wins - both team members get a win and $20 each
  for (const week of (doublesWeeks || [])) {
    if (week.doubles_ctp_team_id) {
      const ctpTeam = (doublesTeams || []).find(t => t.id === week.doubles_ctp_team_id)
      if (ctpTeam) {
        ctpWins.set(ctpTeam.player1_id, (ctpWins.get(ctpTeam.player1_id) || 0) + 1)
        ctpWins.set(ctpTeam.player2_id, (ctpWins.get(ctpTeam.player2_id) || 0) + 1)
        // $20 each ($40 team CTP split 50/50) — track as doubles winnings for display
        addDoublesWinnings(ctpTeam.player1_id, 20)
        addDoublesWinnings(ctpTeam.player2_id, 20)
      }
    }
  }
  
  // Sum ace payouts per player
  const acePayouts = new Map<string, number>()
  for (const ace of (aces || [])) {
    acePayouts.set(ace.player_id, (acePayouts.get(ace.player_id) || 0) + Number(ace.payout))
  }
  
  // Build rankings
  const rankings: PlayerMoneyRanking[] = players.map(player => {
    const singlesHR = singlesHotRoundWins.get(player.id) || 0
    const doublesHR = doublesHotRoundWins.get(player.id) || 0
    const hrWins = singlesHR + doublesHR
    const secondPlace = secondPlaceWins.get(player.id) || 0
    const lowRaw = lowRawWins.get(player.id) || 0
    const ctpWinCount = ctpWins.get(player.id) || 0
    const acePayout = acePayouts.get(player.id) || 0
    const doublesMoney = doublesWinnings.get(player.id) || 0
    // prizeWinnings already holds tiered hot round + 2nd place + low raw dollars
    const total = (prizeWinnings.get(player.id) || 0) + (ctpWinCount * 20) + acePayout
    
    return {
      player_id: player.id,
      player_name: player.name,
      singles_hot_round_wins: singlesHR,
      doubles_hot_round_wins: doublesHR,
      hot_round_wins: hrWins,
      second_place_wins: secondPlace,
      low_raw_wins: lowRaw,
      ctp_wins: ctpWinCount,
      doubles_winnings: doublesMoney,
      ace_payouts: acePayout,
      total_winnings: total
    }
  })
  
  // Sort by total winnings descending, filter out zero
  return rankings
    .filter(r => r.total_winnings > 0)
    .sort((a, b) => b.total_winnings - a.total_winnings)
}

// Get player handicaps as of a specific event (using only scores from SINGLES events with lower week_number)
// Non-members get the best member's handicap from attending players
// Doubles scores never affect singles handicaps
export async function getHandicapsForEvent(eventWeekNumber: number, attendingPlayerIds?: string[]): Promise<Map<string, number>> {
  const supabase = await createClient()
  
  // Get all SINGLES weeks with week_number less than the current event, ordered descending
  const { data: priorWeeks, error: weeksError } = await supabase
    .from("weeks")
    .select("id, week_number")
    .lt("week_number", eventWeekNumber)
    .eq("is_doubles", false)
    .order("week_number", { ascending: false })
  
  // Get player membership status
  const { data: players } = await supabase
    .from("players")
    .select("id, is_member")
  
  const membershipMap = new Map<string, boolean>()
  for (const player of players || []) {
    membershipMap.set(player.id, player.is_member)
  }
  
  if (weeksError || !priorWeeks || priorWeeks.length === 0) {
    // No prior events, everyone has 0 handicap
    return new Map()
  }
  
  const priorWeekIds = priorWeeks.map(w => w.id)
  
  // Get attendance/scores only from prior weeks, ordered by week_number descending
  const { data, error } = await supabase
    .from("attendance")
    .select("player_id, score, weeks!inner(week_number)")
    .in("week_id", priorWeekIds)
    .not("score", "is", null)
    .order("week_number", { referencedTable: "weeks", ascending: false })
  
  if (error || !data) return new Map()
  
  // Group scores by player (already ordered newest first)
  const playerScores = new Map<string, number[]>()
  for (const record of data) {
    const scores = playerScores.get(record.player_id) || []
    scores.push(record.score as number)
    playerScores.set(record.player_id, scores)
  }
  
// Calculate raw handicaps for all players and track if they have 3+ rounds
  const rawHandicaps = new Map<string, number>()
  const hasEnoughRounds = new Map<string, boolean>()
  for (const [playerId, scores] of playerScores) {
    rawHandicaps.set(playerId, calculateHandicap(scores))
    hasEnoughRounds.set(playerId, scores.length >= 3)
  }
  
  // Find the best (highest) member handicap among attending players WITH 3+ rounds
  // Higher handicap = better player (e.g., +10 is better than +5)
  let bestMemberHandicap = 0
  const attendingSet = attendingPlayerIds ? new Set(attendingPlayerIds) : null
  
  for (const [playerId, handicap] of rawHandicaps) {
    const isMember = membershipMap.get(playerId) || false
    const isAttending = attendingSet ? attendingSet.has(playerId) : true
    const hasRounds = hasEnoughRounds.get(playerId) || false
  
    if (isMember && isAttending && hasRounds && handicap > bestMemberHandicap) {
      bestMemberHandicap = handicap
    }
  }
  
  // Apply the rule: 
  // - Members with 3+ rounds get their own handicap
  // - Non-members OR anyone with < 3 rounds gets best member's handicap
  const handicaps = new Map<string, number>()
  for (const [playerId, handicap] of rawHandicaps) {
    const isMember = membershipMap.get(playerId) || false
    const hasRounds = hasEnoughRounds.get(playerId) || false
    if (isMember && hasRounds) {
      handicaps.set(playerId, handicap)
    } else {
      handicaps.set(playerId, bestMemberHandicap)
    }
  }
  
  // Also set handicap for players with no prior rounds at all
  // They get the best member handicap (hardest)
  if (attendingPlayerIds) {
    for (const playerId of attendingPlayerIds) {
      if (!handicaps.has(playerId)) {
        handicaps.set(playerId, bestMemberHandicap)
      }
    }
  }
  
  return handicaps
}
