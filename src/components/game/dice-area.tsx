"use client";

import { Suspense, lazy, Component, type ReactNode, useMemo, useCallback } from "react";
import type { GameStateResponse, RolledDieDto } from "@/types/api";
import { useGameUIStore } from "@/stores/game-ui-store";
import { getScoringSlots, calculateSelectionScore } from "@/lib/scoring";

const DiceScene = lazy(() =>
  import("./dice3d/dice-scene").then((mod) => ({ default: mod.DiceScene }))
);

function DiceSceneFallback() {
  return (
    <div className="w-full rounded-xl bg-[#1a0f08] border border-amber-900/30 flex items-center justify-center" style={{ height: "min(420px, 55vh)" }}>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin h-6 w-6 border-2 border-amber-600/50 border-t-amber-400 rounded-full" />
        <p className="text-amber-200/40 text-sm font-mono">Loading dice...</p>
      </div>
    </div>
  );
}

// Error boundary to catch Three.js rendering errors
class DiceErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-xl bg-[#1a0f08] border border-amber-900/30 flex items-center justify-center" style={{ height: "min(420px, 55vh)" }}>
          <div className="text-center">
            <p className="text-amber-200/70 text-sm">3D dice failed to load</p>
            <p className="text-amber-200/30 text-xs mt-1">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface DiceAreaProps {
  game: GameStateResponse;
  rollTrigger: number;
  bustAnimation: boolean;
  opponentSlots?: number[];
  bustDice?: RolledDieDto[] | null;
}

export function DiceArea({ game, rollTrigger, bustAnimation, opponentSlots = [], bustDice }: DiceAreaProps) {
  const { selectedSlots, toggleSlot } = useGameUIStore();
  const isMyTurn = game.activeSeat === game.mySeat;
  const canSelect = isMyTurn && game.phase === "MUST_KEEP_OR_BUST";

  // Calculate which slots contain scoring dice
  const scoringSlots = useMemo(() => {
    if (!game.lastRoll) return new Set<number>();
    return getScoringSlots(game.lastRoll);
  }, [game.lastRoll]);

  // Only allow toggling scoring dice
  const handleToggleSlot = useCallback(
    (slot: number) => {
      if (scoringSlots.has(slot)) {
        toggleSlot(slot);
      }
    },
    [scoringSlots, toggleSlot]
  );

  // Calculate score for my selected dice
  const mySelectionScore = useMemo(() => {
    if (!game.lastRoll || selectedSlots.length === 0) return 0;
    const selectedDice = game.lastRoll.filter((d) => selectedSlots.includes(d.slot));
    return calculateSelectionScore(selectedDice);
  }, [game.lastRoll, selectedSlots]);

  // Calculate score for opponent's selected dice
  const opponentSelectionScore = useMemo(() => {
    if (!game.lastRoll || opponentSlots.length === 0) return 0;
    const oppDice = game.lastRoll.filter((d) => opponentSlots.includes(d.slot));
    return calculateSelectionScore(oppDice);
  }, [game.lastRoll, opponentSlots]);

  return (
    <div className="flex flex-col items-center gap-3">
      <DiceErrorBoundary>
        <Suspense fallback={<DiceSceneFallback />}>
          <DiceScene
            game={game}
            selectedSlots={selectedSlots}
            canSelect={canSelect}
            onToggleSlot={handleToggleSlot}
            scoringSlots={scoringSlots}
            rollTrigger={rollTrigger}
            bustAnimation={bustAnimation}
            opponentSlots={opponentSlots}
            bustDice={bustDice}
          />
        </Suspense>
      </DiceErrorBoundary>
      {canSelect && selectedSlots.length > 0 && (
        <p className="text-sm text-amber-300/80 font-mono">
          {selectedSlots.length} die(s) selected — <span className="text-amber-200 font-bold">{mySelectionScore.toLocaleString()} pts</span>
        </p>
      )}
      {!isMyTurn && opponentSlots.length > 0 && (
        <p className="text-sm text-red-300/60 font-mono">
          Opponent is considering {opponentSlots.length} die(s) — <span className="text-red-300/80 font-bold">{opponentSelectionScore.toLocaleString()} pts</span>
        </p>
      )}
    </div>
  );
}
