"use client";

import { useRouter } from "next/navigation";
import type { GameStateResponse } from "@/types/api";
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
}

export function GameOverDialog({ game, open, winnerSeat, forfeit }: GameOverDialogProps) {
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
              isWinner
                ? "Your opponent has surrendered."
                : "You forfeited the game."
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
