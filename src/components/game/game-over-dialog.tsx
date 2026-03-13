"use client";

import { useRouter } from "next/navigation";
import type { GameStateResponse, ForfeitReason } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GameOverDialogProps {
  game: GameStateResponse;
  open: boolean;
  winnerSeat?: number;
  forfeit?: boolean;
  forfeitReason?: ForfeitReason;
}

function getForfeitMessage(isWinner: boolean, reason?: ForfeitReason): string {
  if (isWinner) {
    switch (reason) {
      case "VOLUNTARY":
        return "Your opponent has surrendered.";
      case "DEACTIVATED":
        return "Your opponent's account was deactivated.";
      case "DISCONNECT":
        return "Your opponent disconnected.";
      case "TIMEOUT":
        return "Your opponent ran out of time.";
      default:
        return "Your opponent has forfeited.";
    }
  }
  switch (reason) {
    case "VOLUNTARY":
      return "You forfeited the game.";
    case "DEACTIVATED":
      return "Your account was deactivated.";
    case "DISCONNECT":
      return "You were disconnected.";
    case "TIMEOUT":
      return "You ran out of time.";
    default:
      return "You forfeited the game.";
  }
}

export function GameOverDialog({ game, open, winnerSeat, forfeit, forfeitReason }: GameOverDialogProps) {
  const router = useRouter();

  const winner = winnerSeat ?? (game.totalScores[0] >= game.targetScore ? 0 : 1);
  const isWinner = winner === game.mySeat;
  const myScore = game.totalScores[game.mySeat];
  const oppScore = game.totalScores[game.mySeat === 0 ? 1 : 0];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-amber-900/40 bg-[#1a0f08]/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle
            className={`text-center text-3xl font-extrabold font-mono tracking-wider ${
              isWinner ? "text-amber-300" : "text-red-400"
            }`}
          >
            {isWinner ? "Victory!" : "Defeat"}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {forfeit ? (
              getForfeitMessage(isWinner, forfeitReason)
            ) : (
              <>
                {"You: " + myScore.toLocaleString() + " — Opponent: " + oppScore.toLocaleString()}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-2">
          <Button
            size="lg"
            onClick={() => router.push("/lobby")}
            className="px-8 font-bold bg-amber-700 hover:bg-amber-600 text-amber-100 border border-amber-600/50"
          >
            Back to Lobby
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
