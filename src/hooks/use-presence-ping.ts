"use client";

import { useEffect } from "react";
import { pingGame } from "@/lib/api";

export function usePresencePing(gameId: number, gameOver: boolean) {
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      pingGame(gameId).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [gameId, gameOver]);
}
