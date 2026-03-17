"use client";

import { useEffect, useRef } from "react";
import type { GameStateResponse } from "@/types/api";

interface UseAutoRollOptions {
  game: GameStateResponse | undefined;
  gameOver: boolean;
  bustAnimation: boolean;
  rollPending: boolean;
  rollMutate: () => void;
}

const AUTO_ROLL_DELAY = 1200; // ms — enough time after bust animation clears

export function useAutoRoll({ game, gameOver, bustAnimation, rollPending, rollMutate }: UseAutoRollOptions) {
  const autoRolledRef = useRef(false);
  const rollMutateRef = useRef(rollMutate);
  const bustEndTimeRef = useRef(0);

  useEffect(() => {
    rollMutateRef.current = rollMutate;
  });

  // Track when bust animation ends so auto-roll waits a bit after
  useEffect(() => {
    if (!bustAnimation) {
      bustEndTimeRef.current = Date.now();
    }
  }, [bustAnimation]);

  // Reset auto-roll guard on turn change so it's never stuck
  const activeSeat = game?.activeSeat;
  useEffect(() => {
    autoRolledRef.current = false;
  }, [activeSeat]);

  useEffect(() => {
    if (!game || gameOver) return;
    const isMyTurn = game.activeSeat === game.mySeat;
    const mustRoll = game.phase === "MUST_ROLL";

    if (isMyTurn && mustRoll && !rollPending && !bustAnimation) {
      if (game.turnScore === 0 && game.remainingDiceCount === 6 && !autoRolledRef.current) {
        autoRolledRef.current = true;

        // If bust animation just ended, wait extra so the transition feels natural
        const sinceBustEnd = Date.now() - bustEndTimeRef.current;
        const delay = sinceBustEnd < AUTO_ROLL_DELAY ? AUTO_ROLL_DELAY - sinceBustEnd : AUTO_ROLL_DELAY;

        const timer = setTimeout(() => {
          rollMutateRef.current();
        }, delay);
        return () => {
          clearTimeout(timer);
        };
      }
    }
  }, [game, gameOver, bustAnimation, rollPending]);
}
