"use client";

import type { GameStateResponse } from "@/types/api";
import { useGameUIStore } from "@/stores/game-ui-store";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  game: GameStateResponse;
  onRoll: () => void;
  onKeep: (slots: number[]) => void;
  onBank: () => void;
  loading: boolean;
}

export function ActionBar({ game, onRoll, onKeep, onBank, loading }: ActionBarProps) {
  const { selectedSlots, clearSelection } = useGameUIStore();
  const isMyTurn = game.activeSeat === game.mySeat;

  if (!isMyTurn) return null;

  const handleKeep = () => {
    onKeep(selectedSlots);
    clearSelection();
  };

  const btnBase =
    "inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed border";

  return (
    <div className="flex justify-center gap-3">
      {game.phase === "MUST_ROLL" && (
        <button
          onClick={onRoll}
          disabled={loading}
          className={cn(
            btnBase,
            "bg-amber-700/80 text-amber-100 hover:bg-amber-600/80 border-amber-600/50 active:scale-95 shadow-lg shadow-black/40"
          )}
        >
          {loading ? "Rolling..." : "Roll Dice"}
        </button>
      )}

      {game.phase === "MUST_KEEP_OR_BUST" && (
        <button
          onClick={handleKeep}
          disabled={loading || selectedSlots.length === 0}
          className={cn(
            btnBase,
            "bg-sky-800/70 text-sky-100 hover:bg-sky-700/70 border-sky-600/40 active:scale-95 shadow-lg shadow-black/40"
          )}
        >
          {loading
            ? "Keeping..."
            : `Keep ${selectedSlots.length} Die${selectedSlots.length !== 1 ? "s" : ""}`}
        </button>
      )}

      {game.phase === "CAN_ROLL_OR_BANK" && (
        <>
          <button
            onClick={onRoll}
            disabled={loading}
            className={cn(
              btnBase,
              "bg-white/10 text-white/80 hover:bg-white/15 border-white/10 active:scale-95"
            )}
          >
            {loading ? "Rolling..." : "Roll Again"}
          </button>
          <button
            onClick={onBank}
            disabled={loading}
            className={cn(
              btnBase,
              "bg-amber-700/80 text-amber-100 hover:bg-amber-600/80 border-amber-600/50 active:scale-95 shadow-lg shadow-black/40"
            )}
          >
            {loading ? "Banking..." : `Bank ${game.turnScore.toLocaleString()}`}
          </button>
        </>
      )}
    </div>
  );
}
