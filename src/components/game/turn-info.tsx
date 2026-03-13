import type { GameStateResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { TurnTimer } from "./turn-timer";

interface TurnInfoProps {
  game: GameStateResponse;
  gameOver: boolean;
  onTimeout: () => void;
}

const phaseLabels: Record<string, string> = {
  MUST_ROLL: "Roll the dice",
  MUST_KEEP_OR_BUST: "Pick dice to keep",
  CAN_ROLL_OR_BANK: "Roll again or bank",
};

export function TurnInfo({ game, gameOver, onTimeout }: TurnInfoProps) {
  const isMyTurn = game.activeSeat === game.mySeat;

  return (
    <div className="flex items-center justify-center gap-2">
      <TurnTimer
        gameId={game.gameId}
        activeSeat={game.activeSeat}
        gameOver={gameOver}
        onTimeout={onTimeout}
      />
      <div className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium border",
        isMyTurn
          ? "bg-amber-900/30 border-amber-700/40 text-amber-200"
          : "bg-white/5 border-white/10 text-white/50"
      )}>
        {isMyTurn
          ? phaseLabels[game.phase] ?? game.phase
          : "Waiting for opponent..."}
      </div>
    </div>
  );
}
