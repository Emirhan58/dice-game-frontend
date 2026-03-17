"use client";

import { useState, useCallback } from "react";
import type { RolledDieDto } from "@/types/api";

export function useGameAnimations() {
  const [bustAnimation, setBustAnimation] = useState(false);
  const [bustOverlay, setBustOverlay] = useState<string | null>(null);
  const [bankAnimation, setBankAnimation] = useState<number | null>(null);
  const [bustDice, setBustDice] = useState<RolledDieDto[] | null>(null);

  const triggerBust = useCallback((message: string, dice: RolledDieDto[] | null) => {
    setBustAnimation(true);
    setBustOverlay(message);
    if (dice) setBustDice(dice);
    setTimeout(() => {
      setBustAnimation(false);
      setBustOverlay(null);
      setBustDice(null);
    }, 2500);
  }, []);

  const triggerBank = useCallback((amount: number) => {
    setBankAnimation(amount);
    setTimeout(() => setBankAnimation(null), 2000);
  }, []);

  return {
    bustAnimation,
    bustOverlay,
    bankAnimation,
    bustDice,
    setBustDice,
    triggerBust,
    triggerBank,
  };
}
