"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWaitingTables, getGameState, cancelTable, ApiError } from "@/lib/api";
import { addActiveGame } from "@/lib/active-games";
import { AuthGuard } from "@/components/auth-guard";
import { toast } from "sonner";

function WaitingContent() {
  const params = useParams();
  const router = useRouter();
  const tableId = Number(params.tableId);
  const [status, setStatus] = useState<"waiting" | "searching" | "found">("waiting");
  const searchingRef = useRef(false);
  const [cancelling, setCancelling] = useState(false);

  // Search for the game by scanning game IDs for matching tableId
  const findGame = useCallback(async () => {
    if (searchingRef.current) return;
    searchingRef.current = true;

    for (let attempt = 0; attempt < 3; attempt++) {
      let consecutiveNotFound = 0;
      for (let candidateId = 1; consecutiveNotFound < 5; candidateId++) {
        try {
          const game = await getGameState(candidateId);
          consecutiveNotFound = 0;
          if (game.tableId === tableId) {
            setStatus("found");
            addActiveGame(game.gameId);
            router.push(`/game/${game.gameId}`);
            return;
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

    toast.error("Could not find game. Returning to lobby.");
    router.push("/lobby");
  }, [tableId, router]);

  // Poll waiting tables to detect when opponent joins, then search for game
  useEffect(() => {
    if (status !== "waiting") return;

    const check = async () => {
      try {
        const tables = await getWaitingTables();
        const ourTable = tables.find((t) => t.id === tableId);

        if (!ourTable) {
          setStatus("searching");
          findGame();
        }
      } catch {
        // ignore polling errors
      }
    };

    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [tableId, status, findGame]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelTable(tableId);
      toast.success("Table cancelled. Wager refunded.");
      router.push("/lobby");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to cancel table");
      }
      setCancelling(false);
    }
  };

  return (
    <div className="medieval-bg fixed inset-0 flex flex-col items-center justify-center z-40">
      {/* Ambient dice icon */}
      <div className="text-amber-900/30 text-8xl mb-6 select-none">&#9856;</div>

      {status === "waiting" && (
        <>
          <h1 className="font-medieval text-2xl text-amber-400 font-bold tracking-wide mb-2">
            Waiting for Opponent
          </h1>
          <p className="text-amber-200/40 text-sm mb-1">
            Table #{tableId}
          </p>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-200/50 text-xs">Looking for a challenger...</span>
          </div>

          {/* Animated dots */}
          <div className="flex gap-1.5 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-600/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-xs px-4 py-2 rounded border border-red-900/40 text-red-400/70 hover:text-red-300 hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Table"}
          </button>
        </>
      )}

      {status === "searching" && (
        <>
          <h1 className="font-medieval text-2xl text-amber-400 font-bold tracking-wide mb-2">
            Opponent Found!
          </h1>
          <p className="text-amber-200/50 text-sm animate-pulse">Loading game...</p>
        </>
      )}

      {status === "found" && (
        <>
          <h1 className="font-medieval text-2xl text-emerald-400 font-bold tracking-wide mb-2">
            Game Starting!
          </h1>
          <p className="text-amber-200/50 text-sm">Redirecting...</p>
        </>
      )}
    </div>
  );
}

export default function WaitingPage() {
  return (
    <AuthGuard>
      <WaitingContent />
    </AuthGuard>
  );
}
