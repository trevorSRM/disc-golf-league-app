// Season Finale 2026: prize structure and payout math.
//
// Both finale events are free entry and members-only (members with a handicap,
// i.e. at least one singles round). Handicaps are locked after the last regular
// round (Oct 29): finale rounds never count toward a handicap.
//
// Ties on a paid position are settled by playoff (entered in the admin panel);
// until then the tied prizes show as "playoff needed" and are not paid.

import { PAR, type FinaleCtp, type FinaleTiebreaks } from "@/lib/types"

export type FinaleCourse = "Akron" | "Rochester"

export interface FinaleCtpSpec {
  key: string
  label: string
  course?: FinaleCourse
  hole?: number
  /** Team CTP vs. the post-round throw-off (doubles only). */
  kind?: "hole" | "throwoff"
  amount: number
}

export const DOUBLES_FINALE = {
  title: "End of Year Doubles Tournament",
  date: "2026-11-05",
  /** Countdown target (Eastern time). */
  startsAt: "2026-11-05T17:30:00-05:00" as string | null,
  timeLabel: "5:30 PM",
  location: "Akron",
  /** Per team, split between partners. */
  places: [60, 40, 20],
  ctps: [
    { key: "hole-7", label: "Hole 7", hole: 7, kind: "hole", amount: 40 },
    { key: "hole-8", label: "Hole 8", hole: 8, kind: "hole", amount: 40 },
    { key: "throwoff-a", label: "Throw-off A", kind: "throwoff", amount: 40 },
    { key: "throwoff-b", label: "Throw-off B", kind: "throwoff", amount: 40 },
  ] as FinaleCtpSpec[],
}

export const SINGLES_FINALE = {
  title: "End of Year Tournament",
  date: "2026-11-07",
  /** Countdown target (Eastern time). */
  startsAt: "2026-11-07T10:00:00-05:00" as string | null,
  timeLabel: "10:00 AM",
  location: "Starts at Rochester",
  places: [140, 80, 55, 35, 30, 20],
  lowRaw: [50, 30],
  highestHandicap: 40,
  /** Odd holes at Akron, even holes at Rochester. Won by a card, split across it. */
  ctps: Array.from({ length: 18 }, (_, i): FinaleCtpSpec => {
    const hole = i + 1
    const course: FinaleCourse = hole % 2 === 1 ? "Akron" : "Rochester"
    return { key: `${course.toLowerCase()}-${hole}`, label: `Hole ${hole}`, course, hole, kind: "hole", amount: 10 }
  }),
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Stable id for a doubles team (survives teams being re-saved with new row ids). */
export function doublesEntrantId(playerIds: string[]): string {
  return [...new Set(playerIds)].sort().join("|")
}

export const DOUBLES_POOL = sum(DOUBLES_FINALE.places) + sum(DOUBLES_FINALE.ctps.map(c => c.amount))
export const SINGLES_POOL =
  sum(SINGLES_FINALE.places) +
  sum(SINGLES_FINALE.lowRaw) +
  SINGLES_FINALE.highestHandicap +
  sum(SINGLES_FINALE.ctps.map(c => c.amount))
export const FINALE_POOL = DOUBLES_POOL + SINGLES_POOL

// ---------------------------------------------------------------------------
// Ranking with playoff tiebreaks

export interface RankedRow<T> {
  item: T
  /** 1-based finishing position. Tied rows without a playoff share a position. */
  position: number
  /** True when this row is in a tie that has not been settled by playoff. */
  unresolvedTie: boolean
  tiedCount: number
}

export interface PlayoffNeeded {
  /** Which tiebreak map this playoff writes to. */
  key: "places" | "lowRaw"
  ids: string[]
  names: string[]
  /** Positions the tied group covers, e.g. [2, 3]. */
  fromPosition: number
  toPosition: number
}

interface Rankable {
  id: string
  name: string
  score: number
}

// Scores are compared at 0.1 precision (handicaps are rounded to one decimal).
const scoreKey = (score: number) => Math.round(score * 10)

export function rankWithPlayoffs<T extends Rankable>(
  items: T[],
  playoff: Record<string, number> | undefined
): RankedRow<T>[] {
  const sorted = [...items].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
  const rows: RankedRow<T>[] = []
  let position = 1
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && scoreKey(sorted[j].score) === scoreKey(sorted[i].score)) j++
    const group = sorted.slice(i, j)
    if (group.length === 1) {
      rows.push({ item: group[0], position, unresolvedTie: false, tiedCount: 1 })
    } else {
      const ranks = group.map(g => playoff?.[g.id])
      const settled =
        ranks.every(r => typeof r === "number") && new Set(ranks).size === group.length
      if (settled) {
        const ordered = [...group].sort((a, b) => (playoff![a.id] as number) - (playoff![b.id] as number))
        ordered.forEach((g, k) => rows.push({ item: g, position: position + k, unresolvedTie: false, tiedCount: group.length }))
      } else {
        group.forEach(g => rows.push({ item: g, position, unresolvedTie: true, tiedCount: group.length }))
      }
    }
    position += group.length
    i = j
  }
  return rows
}

/** Paid prize for a ranked row, or null while a tie over a paid position awaits a playoff. */
function payoutFor<T>(row: RankedRow<T>, prizes: number[]): number | null {
  if (row.unresolvedTie) return row.position <= prizes.length ? null : 0
  return prizes[row.position - 1] ?? 0
}

function playoffsFor<T extends Rankable>(rows: RankedRow<T>[], prizes: number[], key: "places" | "lowRaw"): PlayoffNeeded[] {
  const out: PlayoffNeeded[] = []
  const seen = new Set<number>()
  for (const row of rows) {
    if (!row.unresolvedTie || row.position > prizes.length || seen.has(row.position)) continue
    seen.add(row.position)
    const group = rows.filter(r => r.unresolvedTie && r.position === row.position)
    out.push({
      key,
      ids: group.map(g => g.item.id),
      names: group.map(g => g.item.name),
      fromPosition: row.position,
      toPosition: row.position + group.length - 1,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Results

export type PrizeStatus = "won" | "leading" | "playoff" | "open"

export interface FinalePrize {
  key: string
  group: "Places" | "Low Raw" | "CTP" | "Handicap"
  label: string
  /** null = no fixed amount (Lowest Handicap). */
  amount: number | null
  winners: string[]
  status: PrizeStatus
  note?: string
}

export interface FinaleStanding {
  id: string
  name: string
  playerIds: string[]
  raw: number
  handicap: number
  /** The score that ranks the field (final score, or raw in RAW doubles). */
  score: number
  position: number
  tied: boolean
  payout: number | null
}

export interface FinaleResult {
  standings: FinaleStanding[]
  lowRaw?: FinaleStanding[]
  prizes: FinalePrize[]
  playoffs: PlayoffNeeded[]
  /** Dollars won per player id (settled prizes only). */
  playerWinnings: Record<string, number>
  awarded: number
  pool: number
}

function addWinnings(map: Record<string, number>, playerIds: string[], amount: number) {
  const ids = [...new Set(playerIds)]
  if (amount <= 0 || ids.length === 0) return
  for (const id of ids) map[id] = (map[id] || 0) + amount / ids.length
}

function ctpPrizes(specs: FinaleCtpSpec[], saved: FinaleCtp[], winnings: Record<string, number>): FinalePrize[] {
  return specs.map(spec => {
    const row = saved.find(c => c.ctp_key === spec.key && c.winner_player_ids.length > 0)
    if (row) addWinnings(winnings, row.winner_player_ids, spec.amount)
    return {
      key: `ctp:${spec.key}`,
      group: "CTP" as const,
      label: spec.course ? `${spec.course} · ${spec.label}` : spec.label,
      amount: spec.amount,
      winners: row ? [row.winner_label || "Winner"] : [],
      status: row ? ("won" as const) : ("open" as const),
    }
  })
}

const placeLabel = (n: number) => ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`

function placePrizes(
  rows: RankedRow<Rankable & { playerIds: string[] }>[],
  prizes: number[],
  group: "Places" | "Low Raw",
  keyPrefix: string,
  submitted: boolean,
  winnings: Record<string, number>
): FinalePrize[] {
  return prizes.map((amount, idx) => {
    const position = idx + 1
    const holder = rows.find(r => !r.unresolvedTie && r.position === position)
    const tied = rows.filter(r => r.unresolvedTie && r.position <= position && position < r.position + r.tiedCount)
    const label = group === "Low Raw" ? `Low Raw ${placeLabel(position)}` : placeLabel(position)
    if (holder) {
      if (submitted) addWinnings(winnings, holder.item.playerIds, amount)
      return { key: `${keyPrefix}:${position}`, group, label, amount, winners: [holder.item.name], status: submitted ? "won" : "leading" }
    }
    if (tied.length > 0) {
      return { key: `${keyPrefix}:${position}`, group, label, amount, winners: tied.map(t => t.item.name), status: "playoff", note: "Tied, playoff needed" }
    }
    return { key: `${keyPrefix}:${position}`, group, label, amount, winners: [], status: "open" }
  })
}

export interface SinglesEntrant {
  id: string
  name: string
  raw: number | null
  handicap: number
}

export function computeSinglesFinale(
  entrants: SinglesEntrant[],
  tiebreaks: FinaleTiebreaks | null,
  ctps: FinaleCtp[],
  submitted: boolean
): FinaleResult {
  const winnings: Record<string, number> = {}
  const scored = entrants
    .filter(e => e.raw !== null)
    .map(e => ({ ...e, raw: e.raw as number, playerIds: [e.id] }))

  const placeRows = rankWithPlayoffs(
    scored.map(e => ({ ...e, score: e.raw - PAR + e.handicap })),
    tiebreaks?.places
  )
  const lowRawRows = rankWithPlayoffs(scored.map(e => ({ ...e, score: e.raw })), tiebreaks?.lowRaw)

  const toStanding = (prizes: number[]) => (r: (typeof placeRows)[number]): FinaleStanding => ({
    id: r.item.id,
    name: r.item.name,
    playerIds: r.item.playerIds,
    raw: r.item.raw,
    handicap: r.item.handicap,
    score: r.item.score,
    position: r.position,
    tied: r.tiedCount > 1,
    payout: payoutFor(r, prizes),
  })

  const prizes: FinalePrize[] = [
    ...placePrizes(placeRows, SINGLES_FINALE.places, "Places", "place", submitted, winnings),
    ...placePrizes(lowRawRows, SINGLES_FINALE.lowRaw, "Low Raw", "lowraw", submitted, winnings),
  ]

  // Highest / lowest handicap among entrants (locked handicaps). Ties split.
  if (entrants.length > 0) {
    const hcs = entrants.map(e => e.handicap)
    const high = entrants.filter(e => e.handicap === Math.max(...hcs))
    const low = entrants.filter(e => e.handicap === Math.min(...hcs))
    if (submitted) addWinnings(winnings, high.map(e => e.id), SINGLES_FINALE.highestHandicap)
    prizes.push(
      { key: "hc:high", group: "Handicap", label: "Highest Handicap", amount: SINGLES_FINALE.highestHandicap, winners: high.map(e => e.name), status: submitted ? "won" : "leading", note: high.length > 1 ? "Tie, split evenly" : undefined },
      { key: "hc:low", group: "Handicap", label: "Lowest Handicap", amount: null, winners: low.map(e => e.name), status: submitted ? "won" : "leading", note: "Prize: whatever's on hand" }
    )
  } else {
    prizes.push(
      { key: "hc:high", group: "Handicap", label: "Highest Handicap", amount: SINGLES_FINALE.highestHandicap, winners: [], status: "open" },
      { key: "hc:low", group: "Handicap", label: "Lowest Handicap", amount: null, winners: [], status: "open", note: "Prize: whatever's on hand" }
    )
  }

  prizes.push(...ctpPrizes(SINGLES_FINALE.ctps, ctps, winnings))

  return {
    standings: placeRows.map(toStanding(SINGLES_FINALE.places)),
    lowRaw: lowRawRows.map(toStanding(SINGLES_FINALE.lowRaw)),
    prizes,
    playoffs: [
      ...playoffsFor(placeRows, SINGLES_FINALE.places, "places"),
      ...playoffsFor(lowRawRows, SINGLES_FINALE.lowRaw, "lowRaw"),
    ],
    playerWinnings: winnings,
    awarded: Math.round(sum(Object.values(winnings)) * 100) / 100,
    pool: SINGLES_POOL,
  }
}

export interface DoublesEntrant {
  id: string
  name: string
  playerIds: string[]
  raw: number | null
  teamHandicap: number
}

export function computeDoublesFinale(
  teams: DoublesEntrant[],
  scoringType: "raw" | "handicap",
  tiebreaks: FinaleTiebreaks | null,
  ctps: FinaleCtp[],
  submitted: boolean
): FinaleResult {
  const winnings: Record<string, number> = {}
  const rows = rankWithPlayoffs(
    teams
      .filter(t => t.raw !== null)
      .map(t => ({
        ...t,
        raw: t.raw as number,
        score: scoringType === "raw" ? (t.raw as number) : (t.raw as number) - PAR + t.teamHandicap,
      })),
    tiebreaks?.places
  )

  const prizes: FinalePrize[] = [
    ...placePrizes(rows, DOUBLES_FINALE.places, "Places", "place", submitted, winnings),
    ...ctpPrizes(DOUBLES_FINALE.ctps, ctps, winnings),
  ]

  return {
    standings: rows.map(r => ({
      id: r.item.id,
      name: r.item.name,
      playerIds: r.item.playerIds,
      raw: r.item.raw,
      handicap: r.item.teamHandicap,
      score: r.item.score,
      position: r.position,
      tied: r.tiedCount > 1,
      payout: payoutFor(r, DOUBLES_FINALE.places),
    })),
    prizes,
    playoffs: playoffsFor(rows, DOUBLES_FINALE.places, "places"),
    playerWinnings: winnings,
    awarded: Math.round(sum(Object.values(winnings)) * 100) / 100,
    pool: DOUBLES_POOL,
  }
}
