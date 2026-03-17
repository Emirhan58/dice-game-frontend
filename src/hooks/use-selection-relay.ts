"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameUIStore } from "@/stores/game-ui-store";
import type { GameStateResponse } from "@/types/api";
// ── Relay helpers ──

const RELAY_TIMEOUT = 3000;

function relayFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function postSelections(gameId: number, seat: number, slots: number[]) {
  try {
    await relayFetch("/api/selections", {
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
    const res = await relayFetch(`/api/selections?gameId=${gameId}&mySeat=${mySeat}`);
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
}

export function useSelectionRelay({ gameId, game, gameOver }: UseSelectionRelayOptions) {
  const selectedSlots = useGameUIStore((s) => s.selectedSlots);
  const [opponentSlots, setOpponentSlots] = useState<number[]>([]);
  const mySeatRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (game) mySeatRef.current = game.mySeat;
  }, [game]);

  // Publish own selections via HTTP relay
  useEffect(() => {
    const seat = mySeatRef.current;
    if (seat != null) {
      postSelections(gameId, seat, selectedSlots);
    }
  }, [selectedSlots, gameId]);

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

  // Poll opponent selections via HTTP relay (1s interval)
  useEffect(() => {
    if (!game || gameOver) return;
    const mySeat = game.mySeat;
    const isMyTurn = game.activeSeat === mySeat;
    if (isMyTurn) return;

    const interval = setInterval(async () => {
      const slots = await fetchOpponentSelections(gameId, mySeat);
      setOpponentSlots(slots);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameId, game, gameOver]);

  const clearOpponentSlots = useCallback(() => setOpponentSlots([]), []);

  return { opponentSlots, clearOpponentSlots, mySeatRef };
}
