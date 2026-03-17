"use client";

import { useEffect, useRef } from "react";
import type { GameStateResponse, RolledDieDto } from "@/types/api";

async function fetchBustDice(gameId: number): Promise<RolledDieDto[] | null> {
  try {
    const res = await fetch(`/api/bust-relay?gameId=${gameId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.dice ?? null;
  } catch {
    return null;
  }
}

interface UseBustDetectionOptions {
  gameId: number;
  game: GameStateResponse | undefined;
  bustAnimation: boolean;
  wsConnected: boolean;
  triggerBust: (message: string, dice: RolledDieDto[] | null) => void;
  setBustDice: (dice: RolledDieDto[] | null) => void;
}

export function useBustDetection({
  gameId,
  game,
  bustAnimation,
  wsConnected,
  triggerBust,
  setBustDice,
}: UseBustDetectionOptions) {
  const prevGameRef = useRef<{
    activeSeat: number;
    turnScore: number;
    totalScores: [number, number];
  } | null>(null);

  useEffect(() => {
    if (!game || bustAnimation) return;
    const prev = prevGameRef.current;
    prevGameRef.current = {
      activeSeat: game.activeSeat,
      turnScore: game.turnScore,
      totalScores: [...game.totalScores] as [number, number],
    };

    if (!prev) return;
    if (!wsConnected) {
      const wasOpponentTurn = prev.activeSeat !== game.mySeat;
      const nowMyTurn = game.activeSeat === game.mySeat;
      if (wasOpponentTurn && nowMyTurn) {
        const opponentSeat = game.mySeat === 0 ? 1 : 0;
        const scoreSame = game.totalScores[opponentSeat] === prev.totalScores[opponentSeat];
        if (scoreSame) {
          fetchBustDice(gameId).then((dice) => {
            triggerBust("Opponent busted!", dice);
            if (dice) setBustDice(dice);
          });
        }
      }
    }
  }, [game, bustAnimation, wsConnected, triggerBust, setBustDice, gameId]);
}

export { fetchBustDice };
