import { useMemo } from "react";
import type { GameStateResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { useGameUIStore } from "@/stores/game-ui-store";
import { calculateSelectionScore } from "@/lib/scoring";

interface ScorePanelProps {
  game: GameStateResponse;
}

export function ScorePanel({ game }: ScorePanelProps) {
  const selectedSlots = useGameUIStore((s) => s.selectedSlots);
  const mySeat = game.mySeat;
  const opponentSeat = mySeat === 0 ? 1 : 0;
  const myScore = game.totalScores[mySeat];
  const oppScore = game.totalScores[opponentSeat];
  const isMyTurn = game.activeSeat === mySeat;

  // Calculate selected dice score using Farkle rules
  const selectedValue = useMemo(() => {
    if (!game.lastRoll || selectedSlots.length === 0) return 0;
    const selectedDice = game.lastRoll.filter((d) => selectedSlots.includes(d.slot));
    return calculateSelectionScore(selectedDice);
  }, [game.lastRoll, selectedSlots]);

  return (
    <div className="bg-black/70 backdrop-blur-sm border border-amber-900/40 rounded-lg px-3 py-2.5 min-w-[200px] font-mono text-sm">
      {/* Header row */}
      <div className="grid grid-cols-3 text-center text-[10px] tracking-wider mb-0.5">
        <span className="text-sky-300 font-bold">You</span>
        <span className="text-amber-200/60">Goal</span>
        <span className="text-red-400 font-bold">Opponent</span>
      </div>

      {/* Main scores */}
      <div className="grid grid-cols-3 text-center items-baseline mb-1.5">
        <span className={cn(
          "text-xl font-black tabular-nums",
          isMyTurn ? "text-sky-300" : "text-sky-300/60"
        )}>
          {myScore.toLocaleString()}
        </span>
        <span className="text-lg font-bold text-amber-200/70 tabular-nums">
          {game.targetScore.toLocaleString()}
        </span>
        <span className={cn(
          "text-xl font-black tabular-nums",
          !isMyTurn ? "text-red-400" : "text-red-400/60"
        )}>
          {oppScore.toLocaleString()}
        </span>
      </div>

      <div className="border-t border-amber-900/30 mb-1.5" />

      {/* Round row */}
      <div className="grid grid-cols-3 text-center text-xs">
        <span className="text-sky-200/80 font-bold tabular-nums">
          {isMyTurn ? game.turnScore : 0}
        </span>
        <span className="text-amber-200/40 text-[10px]">Round</span>
        <span className="text-red-300/80 font-bold tabular-nums">
          {!isMyTurn ? game.turnScore : 0}
        </span>
      </div>

      {/* Selected row */}
      {isMyTurn && game.phase === "MUST_KEEP_OR_BUST" && (
        <div className="grid grid-cols-3 text-center text-xs mt-0.5">
          <span className="text-sky-200/60 tabular-nums">
            {selectedValue > 0 ? selectedValue : 0}
          </span>
          <span className="text-amber-200/40 text-[10px]">Selected</span>
          <span className="text-red-300/40 tabular-nums">0</span>
        </div>
      )}

      {/* Turn indicator */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          isMyTurn ? "bg-sky-400" : "bg-red-400"
        )} />
        <span className="text-[10px] text-amber-200/50">
          {isMyTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>
    </div>
  );
}
