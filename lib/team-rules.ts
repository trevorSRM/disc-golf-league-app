// Doubles pairing rules that apply to every team draw (random, fair, or manual).

// Players who must never be on the same doubles team. Keyed by player id so a
// rename doesn't break the rule.
const NEVER_PAIR: [string, string][] = [
  // Tim L & Trevor Kempton
  ["7acf773a-3ae4-4731-9e65-c1ef562f7ed5", "0a4ac402-dc4d-472a-9ae2-41fd2790b901"],
]

export function isBlockedPair(a: string, b: string): boolean {
  return NEVER_PAIR.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}
