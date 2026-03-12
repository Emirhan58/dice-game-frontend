import { create } from "zustand";

interface GameUIState {
  selectedSlots: number[];
  toggleSlot: (slot: number) => void;
  clearSelection: () => void;
}

export const useGameUIStore = create<GameUIState>((set) => ({
  selectedSlots: [],
  toggleSlot: (slot: number) =>
    set((state) => ({
      selectedSlots: state.selectedSlots.includes(slot)
        ? state.selectedSlots.filter((s) => s !== slot)
        : [...state.selectedSlots, slot],
    })),
  clearSelection: () => set({ selectedSlots: [] }),
}));
