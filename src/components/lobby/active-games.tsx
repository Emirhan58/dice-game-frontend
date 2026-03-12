"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGameState } from "@/lib/api";
import { getActiveGameIds, removeActiveGame } from "@/lib/active-games";
import type { GameStateResponse } from "@/types/api";

export function ActiveGames() {
  const router = useRouter();
  const [games, setGames] = useState<GameStateResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchActiveGames() {
      const ids = getActiveGameIds();
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

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

      if (!cancelled) {
        setGames(results);
        setLoading(false);
      }
    }

    fetchActiveGames();
    return () => { cancelled = true; };
  }, []);

  if (loading || games.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-medieval text-sm font-bold text-amber-400 tracking-wide">Your Active Games</h2>
      {games.map((game) => {
        const isMyTurn = game.activeSeat === game.mySeat;
        return (
          <div key={game.gameId} className="flex items-center justify-between p-3 bg-[#2a1a0e]/60 border border-amber-900/25 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                isMyTurn
                  ? "text-emerald-400 border-emerald-600/40 bg-emerald-900/20"
                  : "text-amber-200/50 border-amber-900/30 bg-amber-900/10"
              }`}>
                {isMyTurn ? "Your Turn" : "Waiting"}
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
