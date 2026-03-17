import { describe, it, expect } from "vitest";
import { getScoringSlots, calculateSelectionScore } from "@/lib/scoring";

// Helper: create dice from values (slot = index)
function dice(...values: number[]) {
  return values.map((value, slot) => ({ slot, value }));
}

// Helper: create dice with explicit slots
function diceWithSlots(pairs: [number, number][]) {
  return pairs.map(([slot, value]) => ({ slot, value }));
}

// ─── getScoringSlots ────────────────────────────────────────

describe("getScoringSlots", () => {
  it("returns empty set for empty input", () => {
    expect(getScoringSlots([])).toEqual(new Set());
  });

  // ── Singles ──

  it("marks single 1 as scoring", () => {
    const result = getScoringSlots(dice(1, 2, 3));
    expect(result.has(0)).toBe(true); // 1
    expect(result.has(1)).toBe(false); // 2
    expect(result.has(2)).toBe(false); // 3
  });

  it("marks single 5 as scoring", () => {
    const result = getScoringSlots(dice(5, 2, 3));
    expect(result.has(0)).toBe(true); // 5
    expect(result.has(1)).toBe(false); // 2
    expect(result.has(2)).toBe(false); // 3
  });

  it("marks multiple 1s and 5s as scoring (under 3)", () => {
    const result = getScoringSlots(dice(1, 5, 2, 4));
    expect(result.has(0)).toBe(true); // 1
    expect(result.has(1)).toBe(true); // 5
    expect(result.has(2)).toBe(false); // 2
    expect(result.has(3)).toBe(false); // 4
  });

  it("does not mark 2, 3, 4, 6 as scoring singles", () => {
    const result = getScoringSlots(dice(2, 3, 4, 6));
    expect(result.size).toBe(0);
  });

  // ── Three of a kind ──

  it("marks three 1s as scoring", () => {
    const result = getScoringSlots(dice(1, 1, 1, 2, 3));
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it("marks three of any value as scoring", () => {
    const result = getScoringSlots(dice(4, 4, 4, 2, 3));
    expect(result).toEqual(new Set([0, 1, 2]));
  });

  it("marks three of a kind + singles together", () => {
    const result = getScoringSlots(dice(3, 3, 3, 1, 5));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  // ── Four / Five / Six of a kind ──

  it("marks four of a kind as scoring", () => {
    const result = getScoringSlots(dice(2, 2, 2, 2, 3));
    expect(result).toEqual(new Set([0, 1, 2, 3]));
  });

  it("marks five of a kind as scoring", () => {
    const result = getScoringSlots(dice(6, 6, 6, 6, 6, 3));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("marks six of a kind as scoring", () => {
    const result = getScoringSlots(dice(4, 4, 4, 4, 4, 4));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  // ── Straight ──

  it("marks straight 1-2-3-4-5-6 as all scoring", () => {
    const result = getScoringSlots(dice(1, 2, 3, 4, 5, 6));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it("marks straight in any order as all scoring", () => {
    const result = getScoringSlots(dice(6, 3, 1, 4, 2, 5));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  // ── Three pairs ──

  it("marks three pairs as all scoring", () => {
    const result = getScoringSlots(dice(2, 2, 3, 3, 4, 4));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it("marks three pairs with 1s and 5s as all scoring", () => {
    const result = getScoringSlots(dice(1, 1, 5, 5, 6, 6));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  // ── Two triples ──

  it("marks two triples as all scoring", () => {
    const result = getScoringSlots(dice(2, 2, 2, 5, 5, 5));
    expect(result).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  // ── Bust (no scoring dice) ──

  it("returns empty set for bust roll", () => {
    const result = getScoringSlots(dice(2, 3, 4, 6));
    expect(result.size).toBe(0);
  });

  it("returns empty set for bust with 6 dice", () => {
    const result = getScoringSlots(dice(2, 3, 4, 6, 2, 4));
    expect(result.size).toBe(0);
  });

  // ── Slot correctness ──

  it("returns correct slots regardless of input order", () => {
    const d = diceWithSlots([[3, 1], [0, 2], [5, 5], [1, 4]]);
    const result = getScoringSlots(d);
    expect(result.has(3)).toBe(true); // slot 3 = value 1
    expect(result.has(5)).toBe(true); // slot 5 = value 5
    expect(result.has(0)).toBe(false); // slot 0 = value 2
    expect(result.has(1)).toBe(false); // slot 1 = value 4
  });
});

// ─── calculateSelectionScore ────────────────────────────────

describe("calculateSelectionScore", () => {
  it("returns 0 for empty input", () => {
    expect(calculateSelectionScore([])).toBe(0);
  });

  // ── Singles ──

  it("scores single 1 as 100", () => {
    expect(calculateSelectionScore(dice(1))).toBe(100);
  });

  it("scores single 5 as 50", () => {
    expect(calculateSelectionScore(dice(5))).toBe(50);
  });

  it("scores two 1s as 200", () => {
    expect(calculateSelectionScore(dice(1, 1))).toBe(200);
  });

  it("scores two 5s as 100", () => {
    expect(calculateSelectionScore(dice(5, 5))).toBe(100);
  });

  it("scores 1 + 5 as 150", () => {
    expect(calculateSelectionScore(dice(1, 5))).toBe(150);
  });

  it("scores non-scoring singles as 0", () => {
    expect(calculateSelectionScore(dice(2))).toBe(0);
    expect(calculateSelectionScore(dice(3))).toBe(0);
    expect(calculateSelectionScore(dice(4))).toBe(0);
    expect(calculateSelectionScore(dice(6))).toBe(0);
  });

  // ── Three of a kind ──

  it("scores three 1s as 1000", () => {
    expect(calculateSelectionScore(dice(1, 1, 1))).toBe(1000);
  });

  it("scores three 2s as 200", () => {
    expect(calculateSelectionScore(dice(2, 2, 2))).toBe(200);
  });

  it("scores three 3s as 300", () => {
    expect(calculateSelectionScore(dice(3, 3, 3))).toBe(300);
  });

  it("scores three 4s as 400", () => {
    expect(calculateSelectionScore(dice(4, 4, 4))).toBe(400);
  });

  it("scores three 5s as 500", () => {
    expect(calculateSelectionScore(dice(5, 5, 5))).toBe(500);
  });

  it("scores three 6s as 600", () => {
    expect(calculateSelectionScore(dice(6, 6, 6))).toBe(600);
  });

  // ── Four of a kind (2× triple) ──

  it("scores four 1s as 2000", () => {
    expect(calculateSelectionScore(dice(1, 1, 1, 1))).toBe(2000);
  });

  it("scores four 3s as 600", () => {
    expect(calculateSelectionScore(dice(3, 3, 3, 3))).toBe(600);
  });

  // ── Five of a kind (4× triple) ──

  it("scores five 1s as 4000", () => {
    expect(calculateSelectionScore(dice(1, 1, 1, 1, 1))).toBe(4000);
  });

  it("scores five 2s as 800", () => {
    expect(calculateSelectionScore(dice(2, 2, 2, 2, 2))).toBe(800);
  });

  // ── Six of a kind (8× triple) ──

  it("scores six 1s as 8000", () => {
    expect(calculateSelectionScore(dice(1, 1, 1, 1, 1, 1))).toBe(8000);
  });

  it("scores six 5s as 4000", () => {
    expect(calculateSelectionScore(dice(5, 5, 5, 5, 5, 5))).toBe(4000);
  });

  it("scores six 3s as 2400", () => {
    expect(calculateSelectionScore(dice(3, 3, 3, 3, 3, 3))).toBe(2400);
  });

  // ── Straight ──

  it("scores straight 1-2-3-4-5-6 as 3000", () => {
    expect(calculateSelectionScore(dice(1, 2, 3, 4, 5, 6))).toBe(3000);
  });

  it("scores straight in any order as 3000", () => {
    expect(calculateSelectionScore(dice(5, 1, 3, 6, 2, 4))).toBe(3000);
  });

  // ── Three pairs ──

  it("scores three pairs as 1500", () => {
    expect(calculateSelectionScore(dice(2, 2, 3, 3, 4, 4))).toBe(1500);
  });

  it("scores three pairs with 1s as 1500 (not counted as singles)", () => {
    expect(calculateSelectionScore(dice(1, 1, 3, 3, 6, 6))).toBe(1500);
  });

  // ── Two triples ──

  it("scores two triples as 2500", () => {
    expect(calculateSelectionScore(dice(2, 2, 2, 5, 5, 5))).toBe(2500);
  });

  it("scores two triples with 1s as 2500", () => {
    expect(calculateSelectionScore(dice(1, 1, 1, 4, 4, 4))).toBe(2500);
  });

  // ── Combined scoring ──

  it("scores triple + single correctly", () => {
    // Three 3s (300) + single 1 (100) = 400
    expect(calculateSelectionScore(dice(3, 3, 3, 1))).toBe(400);
  });

  it("scores triple + two singles correctly", () => {
    // Three 2s (200) + 1 (100) + 5 (50) = 350
    expect(calculateSelectionScore(dice(2, 2, 2, 1, 5))).toBe(350);
  });

  it("scores four of a kind + singles correctly", () => {
    // Four 3s (600) + 1 (100) + 5 (50) = 750
    expect(calculateSelectionScore(dice(3, 3, 3, 3, 1, 5))).toBe(750);
  });
});
