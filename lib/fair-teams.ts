// "Fair Teams": pair players so doubles team handicaps are as close together as possible.
//
// Objective: smallest gap between the highest and lowest team handicap; ties are
// broken by how tightly teams sit around the average. With an odd field, the
// Wild Man's handicap counts as a team too. Uses a seeded search, so the same
// attendance always produces the same teams.

import { calculateTeamHandicap, calculateWildManHandicap } from "@/lib/types"

export interface FairTeamsResult {
  pairs: [string, string][]
  wildManId: string | null
}

// Small deterministic PRNG (mulberry32).
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function fairestTeams(
  players: { id: string; handicap: number }[],
  scale: number = 1
): FairTeamsResult {
  const n = players.length
  if (n < 2) return { pairs: [], wildManId: n === 1 ? players[0].id : null }

  // Stable input order so results don't depend on check-in order.
  const base = [...players].sort((a, b) => a.id.localeCompare(b.id))
  const odd = n % 2 === 1
  const teamCount = Math.floor(n / 2)
  const random = rng(20261105)

  // Team handicaps exactly as the site scores them.
  const teamHc = (a: number, b: number) => calculateTeamHandicap(a, b, scale)
  const wildHc = (a: number) => calculateWildManHandicap(a, scale)

  // An arrangement is an order of players: [0,1] is team 1, [2,3] team 2, ...; the last is the Wild Man when odd.
  const evaluate = (order: number[]): [number, number] => {
    const t: number[] = []
    for (let i = 0; i < teamCount; i++) t.push(teamHc(base[order[2 * i]].handicap, base[order[2 * i + 1]].handicap))
    if (odd) t.push(wildHc(base[order[n - 1]].handicap))
    let min = Infinity, max = -Infinity, sum = 0
    for (const x of t) { if (x < min) min = x; if (x > max) max = x; sum += x }
    const mean = sum / t.length
    let v = 0
    for (const x of t) v += (x - mean) ** 2
    return [max - min, v]
  }
  const better = (a: [number, number], b: [number, number]) =>
    a[0] < b[0] - 1e-9 || (Math.abs(a[0] - b[0]) < 1e-9 && a[1] < b[1] - 1e-9)

  let bestOrder: number[] = base.map((_, i) => i)
  let best = evaluate(bestOrder)

  const restarts = 250
  const steps = 4000
  for (let r = 0; r < restarts; r++) {
    const order = base.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    let cur = evaluate(order)
    for (let s = 0; s < steps; s++) {
      const i = Math.floor(random() * n)
      const j = Math.floor(random() * n)
      if (i === j || (i >> 1) === (j >> 1)) continue // same team: no change
      ;[order[i], order[j]] = [order[j], order[i]]
      const next = evaluate(order)
      if (!better(cur, next)) cur = next
      else [order[i], order[j]] = [order[j], order[i]]
    }
    if (better(cur, best)) {
      best = cur
      bestOrder = [...order]
    }
  }

  const pairs: [string, string][] = []
  for (let i = 0; i < teamCount; i++) pairs.push([base[bestOrder[2 * i]].id, base[bestOrder[2 * i + 1]].id])
  return { pairs, wildManId: odd ? base[bestOrder[n - 1]].id : null }
}
