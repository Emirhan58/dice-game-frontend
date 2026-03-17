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

const NORMAL_DELAY = 800;
const POST_BUST_DELAY = 1500;

export function useAutoRoll({ game, gameOver, bustAnimation, rollPending, rollMutate }: UseAutoRollOptions) {
  const autoRolledRef = useRef(false);
  const rollMutateRef = useRef(rollMutate);
  const wasBustRef = useRef(false);

  useEffect(() => {
    rollMutateRef.current = rollMutate;
  });

  // Track bust: set flag when bust starts, consumed by auto-roll for extra delay
  useEffect(() => {
    if (bustAnimation) {
      wasBustRef.current = true;
    }
  }, [bustAnimation]);

  // Reset auto-roll guard on turn change so it's never stuck
  const activeSeat = game?.activeSeat;
  useEffect(() => {
    autoRolledRef.current = false;
  }, [activeSeat]);

  useEffect(() => {
    if (!game || gameOver || bustAnimation || rollPending) return;
    const isMyTurn = game.activeSeat === game.mySeat;
    const mustRoll = game.phase === "MUST_ROLL";

    if (isMyTurn && mustRoll) {
      if (game.turnScore === 0 && game.remainingDiceCount === 6 && !autoRolledRef.current) {
        autoRolledRef.current = true;

        // Use longer delay right after a bust animation so transition feels natural
        const delay = wasBustRef.current ? POST_BUST_DELAY : NORMAL_DELAY;
        wasBustRef.current = false;

        const timer = setTimeout(() => {
          rollMutateRef.current();
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [game, gameOver, bustAnimation, rollPending]);
}
