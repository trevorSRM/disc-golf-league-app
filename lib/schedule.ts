// Deterministic league schedule.
//
// Rules:
//  - League night is every Thursday at 6:00 PM.
//  - Locations alternate weekly between Akron and Rochester.
//  - Every 4th Thursday is Random Doubles (it still rotates location and
//    consumes a slot in the alternation).
//  - Special end-of-year events:
//      * Thursday, Nov 5, 2026  -> End of Year Doubles Tournament
//      * Saturday, Nov 7, 2026  -> End of Year Tournament (season finale)
//
// The rotation is anchored to Thursday, July 23, 2026 = Akron, singles (index 0).
// From that anchor everything else is computed, so the schedule is stable and
// does not depend on the current date (today only affects which entry is
// highlighted as "next").

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

// Rotation anchor: Thursday, July 23, 2026.
const ANCHOR = new Date(2026, 6, 23) // month is 0-indexed (6 = July)

// How many Thursdays to generate from the anchor (through the season).
// The last regular league Thursday is Nov 5, 2026, which is index 15.
const LAST_INDEX = 15

// Special dates.
const DOUBLES_TOURNAMENT = new Date(2026, 10, 5) // Thu, Nov 5, 2026
const SEASON_FINALE = new Date(2026, 10, 7) // Sat, Nov 7, 2026

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
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
  const entries: ScheduleEntry[] = []

  // Start at index 1: the Jul 23 anchor night is removed from the schedule,
  // but the anchor itself stays so the rotation is unchanged.
  for (let i = 1; i <= LAST_INDEX; i++) {
    const date = addDays(ANCHOR, i * 7)
    const location = locationForIndex(i)
    const doubles = isDoublesIndex(i)
    const isDoublesTournament = isSameDay(date, DOUBLES_TOURNAMENT)

    entries.push({
      date,
      time: "6:00 PM",
      location,
      isDoubles: doubles || isDoublesTournament,
      isTournament: isDoublesTournament,
      label: isDoublesTournament
        ? "End of Year Doubles Tournament"
        : doubles
          ? "Random Doubles"
          : "Singles",
    })
  }

  // Season finale (Saturday) — standalone tournament with no rotation slot.
  entries.push({
    date: SEASON_FINALE,
    time: "TBD",
    location: null,
    isDoubles: false,
    isTournament: true,
    label: "End of Year Tournament",
  })

  return entries
}

/**
 * Index of the next upcoming entry relative to `now` (its date is today or
 * later). Returns -1 if the whole season is in the past.
 */
export function getNextUpcomingIndex(schedule: ScheduleEntry[], now: Date = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return schedule.findIndex((e) => e.date.getTime() >= startOfToday.getTime())
}
