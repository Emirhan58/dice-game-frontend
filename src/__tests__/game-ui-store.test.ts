import { describe, it, expect, beforeEach } from "vitest";
import { useGameUIStore } from "@/stores/game-ui-store";

describe("game-ui-store", () => {
  beforeEach(() => {
    useGameUIStore.getState().clearSelection();
  });

  it("starts with empty selection", () => {
    expect(useGameUIStore.getState().selectedSlots).toEqual([]);
  });

  it("toggleSlot adds a slot", () => {
    useGameUIStore.getState().toggleSlot(2);
    expect(useGameUIStore.getState().selectedSlots).toEqual([2]);
  });

  it("toggleSlot removes an existing slot", () => {
    useGameUIStore.getState().toggleSlot(3);
    useGameUIStore.getState().toggleSlot(3);
    expect(useGameUIStore.getState().selectedSlots).toEqual([]);
  });

  it("toggleSlot handles multiple slots", () => {
    useGameUIStore.getState().toggleSlot(0);
    useGameUIStore.getState().toggleSlot(3);
    useGameUIStore.getState().toggleSlot(5);
    expect(useGameUIStore.getState().selectedSlots).toEqual([0, 3, 5]);
  });

  it("toggleSlot removes one without affecting others", () => {
    useGameUIStore.getState().toggleSlot(1);
    useGameUIStore.getState().toggleSlot(4);
    useGameUIStore.getState().toggleSlot(1);
    expect(useGameUIStore.getState().selectedSlots).toEqual([4]);
  });

  it("clearSelection resets to empty", () => {
    useGameUIStore.getState().toggleSlot(0);
    useGameUIStore.getState().toggleSlot(2);
    useGameUIStore.getState().clearSelection();
    expect(useGameUIStore.getState().selectedSlots).toEqual([]);
  });
});
