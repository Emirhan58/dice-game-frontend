import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock browser globals before importing module
const storage = new Map<string, string>();
vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});

const { getActiveGameIds, addActiveGame, removeActiveGame } = await import("@/lib/active-games");

describe("active-games", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("returns empty array when no games stored", () => {
    expect(getActiveGameIds()).toEqual([]);
  });

  it("adds a game ID", () => {
    addActiveGame(42);
    expect(getActiveGameIds()).toEqual([42]);
  });

  it("does not add duplicate IDs", () => {
    addActiveGame(1);
    addActiveGame(1);
    expect(getActiveGameIds()).toEqual([1]);
  });

  it("adds multiple game IDs", () => {
    addActiveGame(1);
    addActiveGame(2);
    addActiveGame(3);
    expect(getActiveGameIds()).toEqual([1, 2, 3]);
  });

  it("removes a game ID", () => {
    addActiveGame(10);
    addActiveGame(20);
    removeActiveGame(10);
    expect(getActiveGameIds()).toEqual([20]);
  });

  it("removing non-existent ID does nothing", () => {
    addActiveGame(5);
    removeActiveGame(99);
    expect(getActiveGameIds()).toEqual([5]);
  });

  it("handles corrupted localStorage gracefully", () => {
    storage.set("activeGameIds", "not-json");
    expect(getActiveGameIds()).toEqual([]);
  });
});
