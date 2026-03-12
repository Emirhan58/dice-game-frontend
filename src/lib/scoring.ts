/**
 * Farkle dice scoring rules.
 *
 * Scoring combinations:
 *   Single 1            = 100
 *   Single 5            = 50
 *   Three 1s            = 1000
 *   Three Ns (N≠1)      = N × 100
 *   Four of a kind      = 2 × three-of-a-kind
 *   Five of a kind      = 4 × three-of-a-kind
 *   Six of a kind       = 8 × three-of-a-kind
 *   1-2-3-4-5-6 straight = 3000
 *   Three pairs         = 1500
 *   Two triples         = 2500
 *
 * A die is "scoring" if it participates in at least one scoring combination
 * among the currently rolled (unkept) dice.
 */

interface DieInfo {
  slot: number;
  value: number;
}

/**
 * Given the set of rolled dice, returns which slots are part of a
 * scoring combination and can be legally selected for keeping.
 */
export function getScoringSlots(dice: DieInfo[]): Set<number> {
  if (dice.length === 0) return new Set();

  const scoring = new Set<number>();

  // Count values
  const counts = new Map<number, DieInfo[]>();
  for (const die of dice) {
    if (!counts.has(die.value)) counts.set(die.value, []);
    counts.get(die.value)!.push(die);
  }

  // Check straight (1-2-3-4-5-6)
  if (dice.length === 6 && counts.size === 6) {
    for (const die of dice) scoring.add(die.slot);
    return scoring;
  }

  // Check two triples (e.g. three 2s + three 5s)
  if (dice.length === 6) {
    const tripleCount = [...counts.values()].filter((g) => g.length === 3).length;
    if (tripleCount === 2) {
      for (const die of dice) scoring.add(die.slot);
      return scoring;
    }
  }

  // Check three pairs
  if (dice.length === 6) {
    const pairCount = [...counts.values()].filter((g) => g.length === 2).length;
    if (pairCount === 3) {
      for (const die of dice) scoring.add(die.slot);
      return scoring;
    }
  }

  // Check each value for singles and multiples
  for (const [value, group] of counts) {
    // Three or more of a kind — all dice of this value score
    if (group.length >= 3) {
      for (const die of group) scoring.add(die.slot);
    } else {
      // Singles: only 1s and 5s score individually
      if (value === 1 || value === 5) {
        for (const die of group) scoring.add(die.slot);
      }
    }
  }

  return scoring;
}

/**
 * Calculate the Farkle score for a set of selected dice.
 * Uses the same scoring rules as getScoringSlots.
 */
export function calculateSelectionScore(dice: DieInfo[]): number {
  if (dice.length === 0) return 0;

  const counts = new Map<number, number>();
  for (const die of dice) {
    counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
  }

  // Straight (1-2-3-4-5-6)
  if (dice.length === 6 && counts.size === 6) return 3000;

  // Two triples
  if (dice.length === 6) {
    const tripleCount = [...counts.values()].filter((c) => c === 3).length;
    if (tripleCount === 2) return 2500;
  }

  // Three pairs
  if (dice.length === 6) {
    const pairCount = [...counts.values()].filter((c) => c === 2).length;
    if (pairCount === 3) return 1500;
  }

  let score = 0;
  for (const [value, count] of counts) {
    if (count >= 3) {
      // Three of a kind base
      const base = value === 1 ? 1000 : value * 100;
      const multiplier = count === 3 ? 1 : count === 4 ? 2 : count === 5 ? 4 : 8;
      score += base * multiplier;
    } else {
      // Singles
      if (value === 1) score += count * 100;
      else if (value === 5) score += count * 50;
    }
  }

  return score;
}
