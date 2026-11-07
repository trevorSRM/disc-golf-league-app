// Deterministic league schedule.
//
// Rules:
//  - League night is every Thursday (default 6:00 PM).
//  - Locations alternate weekly between Akron and Rochester.
//  - Every 4th Thursday is Random Doubles (it still rotates location and
//    consumes a slot in the alternation).
//  - Extra one-off events (e.g. the end-of-year tournaments) go in `extras`.
//
// The rotation is anchored to SEASON.anchor = Akron, singles (index 0).
// Everything else is computed from it, so the schedule is stable and does not
// depend on the current date (today only affects which entry is "next").
//
// SEASON is null between seasons: the Schedule page then shows "coming soon".

export type ScheduleLocation = "Akron" | "Rochester"

export interface ScheduleEntry {
  /** Local calendar date at midnight for the event. */
  date: Date
  /** Time label, e.g. "6:00 PM". Tournaments may differ. */
  time: string
  /** Course/location, or null when not applicable. */
  location: ScheduleLocation | null
  /** True for random doubles nights and the doubles tournament. */
  isDoubles: boolean
  /** True for the season-ending tournaments (special styling). */
  isTournament: boolean
  /** Human label for the entry, e.g. "Random Doubles" or "End of Year Tournament". */
  label: string
}

interface SeasonConfig {
  /** First rotation Thursday (index 0 = Akron, singles). */
  anchor: Date
  /** Rotation indexes to generate, inclusive. */
  firstIndex: number
  lastIndex: number
  /** One-off changes to a rotation night, keyed by "YYYY-MM-DD". */
  overrides?: Record<string, { location?: ScheduleLocation; doubles?: boolean; time?: string; label?: string; tournament?: boolean }>
  /** Standalone events outside the Thursday rotation. */
  extras?: ScheduleEntry[]
}

// 2027 season: not set yet.
// Example: { anchor: new Date(2027, 3, 1), firstIndex: 0, lastIndex: 30 }  (month is 0-indexed)
const SEASON: SeasonConfig | null = null

function dateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/** Location for a given rotation index: even = Akron, odd = Rochester. */
function locationForIndex(index: number): ScheduleLocation {
  return index % 2 === 0 ? "Akron" : "Rochester"
}

/** Every 4th Thursday (the 4th, 8th, ...) is doubles. */
function isDoublesIndex(index: number): boolean {
  return index % 4 === 3
}

/**
 * Build the full season schedule, oldest first.
 * Deterministic — does not depend on the current date.
 */
export function getSchedule(): ScheduleEntry[] {
  const season = SEASON as SeasonConfig | null
  if (!season) return []

  const entries: ScheduleEntry[] = []
  for (let i = season.firstIndex; i <= season.lastIndex; i++) {
    const date = addDays(season.anchor, i * 7)
    const override = season.overrides?.[dateKey(date)]
    const doubles = override?.doubles ?? isDoublesIndex(i)
    entries.push({
      date,
      time: override?.time ?? "6:00 PM",
      location: override?.location ?? locationForIndex(i),
      isDoubles: doubles,
      isTournament: override?.tournament ?? false,
      label: override?.label ?? (doubles ? "Random Doubles" : "Singles"),
    })
  }

  entries.push(...(season.extras ?? []))
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Index of the next upcoming entry relative to `now` (its date is today or
 * later). Returns -1 if the whole season is in the past.
 */
export function getNextUpcomingIndex(schedule: ScheduleEntry[], now: Date = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return schedule.findIndex((e) => e.date.getTime() >= startOfToday.getTime())
}
