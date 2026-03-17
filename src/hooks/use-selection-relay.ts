"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameUIStore } from "@/stores/game-ui-store";
import type { GameStateResponse } from "@/types/api";
import type { GameConnection } from "@/lib/websocket";

// ── Relay helpers ──

async function postSelections(gameId: number, seat: number, slots: number[]) {
  try {
    await fetch("/api/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, seat, slots }),
    });
  } catch {
    // silent — best-effort
  }
}

async function fetchOpponentSelections(gameId: number, mySeat: number): Promise<number[]> {
  try {
    const res = await fetch(`/api/selections?gameId=${gameId}&mySeat=${mySeat}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.slots ?? [];
  } catch {
    return [];
  }
}

interface UseSelectionRelayOptions {
  gameId: number;
  game: GameStateResponse | undefined;
  gameOver: boolean;
  connectionRef: React.RefObject<GameConnection | null>;
}

export function useSelectionRelay({ gameId, game, gameOver, connectionRef }: UseSelectionRelayOptions) {
  const selectedSlots = useGameUIStore((s) => s.selectedSlots);
  const [opponentSlots, setOpponentSlots] = useState<number[]>([]);
  const mySeatRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (game) mySeatRef.current = game.mySeat;
  }, [game]);

  // Publish own selections via both WS and HTTP relay
  useEffect(() => {
    connectionRef.current?.publishSelections(selectedSlots);
    const seat = mySeatRef.current;
    if (seat != null) {
      postSelections(gameId, seat, selectedSlots);
    }
  }, [selectedSlots, gameId, connectionRef]);

  // Heartbeat: re-post selections every 5s so they don't expire in the relay
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const seat = mySeatRef.current;
      if (seat != null) {
        postSelections(gameId, seat, useGameUIStore.getState().selectedSlots);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [gameId, gameOver]);

  // Poll opponent selections via HTTP relay (500ms interval)
  useEffect(() => {
    if (!game || gameOver) return;
    const mySeat = game.mySeat;
    const isMyTurn = game.activeSeat === mySeat;
    if (isMyTurn) return;

    const interval = setInterval(async () => {
      const slots = await fetchOpponentSelections(gameId, mySeat);
      setOpponentSlots(slots);
    }, 500);

    return () => clearInterval(interval);
  }, [gameId, game, gameOver]);

  const clearOpponentSlots = useCallback(() => setOpponentSlots([]), []);

  return { opponentSlots, clearOpponentSlots, mySeatRef };
}
