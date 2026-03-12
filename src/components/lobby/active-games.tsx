"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getGameState, ApiError } from "@/lib/api";
import { getActiveGameIds, removeActiveGame, addActiveGame } from "@/lib/active-games";
import type { GameStateResponse, TableResponse } from "@/types/api";

interface MyTablesProps {
  /** Waiting tables owned by the current user */
  myWaitingTables: TableResponse[];
}

async function loadActiveGames(): Promise<GameStateResponse[]> {
  const ids = getActiveGameIds();
  const results: GameStateResponse[] = [];
  for (const id of ids) {
    try {
      const game = await getGameState(id);
      if (game.status === "IN_PROGRESS") {
        results.push(game);
      } else {
        removeActiveGame(id);
      }
    } catch {
      removeActiveGame(id);
    }
  }
  return results;
}

async function searchGameForTable(tableId: number): Promise<number | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let consecutiveNotFound = 0;
    for (let candidateId = 1; consecutiveNotFound < 5; candidateId++) {
      try {
        const game = await getGameState(candidateId);
        consecutiveNotFound = 0;
        if (game.tableId === tableId) {
          addActiveGame(game.gameId);
          return game.gameId;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          consecutiveNotFound++;
        } else {
          consecutiveNotFound = 0;
        }
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

export function MyTables({ myWaitingTables }: MyTablesProps) {
  const router = useRouter();
  const [games, setGames] = useState<GameStateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const prevWaitingIdsRef = useRef<Set<number>>(new Set());
  const searchingTableRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  // Fetch active games on mount
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;
    loadActiveGames().then((results) => {
      if (!cancelled) {
        setGames(results);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const refreshGames = useCallback(() => {
    loadActiveGames().then((results) => {
      setGames(results);
    });
  }, []);

  // Detect when a waiting table disappears → opponent joined → find the game
  const handleTableDisappeared = useCallback((tableId: number) => {
    searchingTableRef.current = tableId;
    setIsSearching(true);
    searchGameForTable(tableId).then((gameId) => {
      searchingTableRef.current = null;
      setIsSearching(false);
      if (gameId !== null) {
        refreshGames();
      }
    });
  }, [refreshGames]);

  useEffect(() => {
    const currentIds = new Set(myWaitingTables.map((t) => t.id));
    const prevIds = prevWaitingIdsRef.current;

    for (const prevId of prevIds) {
      if (!currentIds.has(prevId) && searchingTableRef.current !== prevId) {
        handleTableDisappeared(prevId);
      }
    }

    prevWaitingIdsRef.current = currentIds;
  }, [myWaitingTables, handleTableDisappeared]);

  const hasWaiting = myWaitingTables.length > 0;
  const hasGames = games.length > 0;

  if (loading || (!hasWaiting && !hasGames && !isSearching)) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-medieval text-sm font-bold text-amber-400 tracking-wide">Your Tables</h2>

      {/* Searching for game notification */}
      {isSearching && (
        <div className="p-3 bg-[#2a1a0e]/60 border border-amber-700/30 rounded-lg text-center animate-pulse">
          <p className="text-amber-200/80 text-sm font-medium">Opponent found! Finding game...</p>
        </div>
      )}

      {/* Waiting tables */}
      {myWaitingTables.map((table) => (
        <div key={`table-${table.id}`} className="flex items-center justify-between p-3 bg-[#2a1a0e]/60 border border-amber-900/25 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider text-amber-300 border-amber-600/40 bg-amber-900/20">
              Waiting
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-200/50">Looking for opponent...</span>
            </span>
            <span className="text-[10px] text-amber-200/30">
              {table.stakeGold} Gold &middot; Target: {table.targetScore.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => router.push(`/lobby/waiting/${table.id}`)}
            className="text-xs px-4 py-1.5 rounded bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/40 text-amber-100 font-bold hover:from-amber-600 hover:to-amber-800 transition-all"
          >
            Waiting Room
          </button>
        </div>
      ))}

      {/* Active games */}
      {games.map((game) => {
        const isMyTurn = game.activeSeat === game.mySeat;
        return (
          <div key={`game-${game.gameId}`} className="flex items-center justify-between p-3 bg-[#2a1a0e]/60 border border-amber-900/25 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                isMyTurn
                  ? "text-emerald-400 border-emerald-600/40 bg-emerald-900/20"
                  : "text-amber-200/50 border-amber-900/30 bg-amber-900/10"
              }`}>
                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
              </span>
              <span className="text-xs text-amber-200/70">
                You: <strong className="text-amber-200">{game.totalScores[game.mySeat].toLocaleString()}</strong>
                {" / "}
                Opp: <strong className="text-red-400/80">{game.totalScores[game.mySeat === 0 ? 1 : 0].toLocaleString()}</strong>
              </span>
              <span className="text-[10px] text-amber-200/30">
                Target: {game.targetScore.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => router.push(`/game/${game.gameId}`)}
              className="text-xs px-4 py-1.5 rounded bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/40 text-amber-100 font-bold hover:from-amber-600 hover:to-amber-800 transition-all"
            >
              {isMyTurn ? "Play" : "Watch"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
