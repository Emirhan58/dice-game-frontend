"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGameState, rollDice, keepDice, bankScore, forfeitGame, pingGame, ApiError } from "@/lib/api";
import { connectToGame, type GameConnection } from "@/lib/websocket";
import { queryKeys } from "@/lib/query-keys";
import { useGameUIStore } from "@/stores/game-ui-store";
import type { GameEvent } from "@/types/api";
import { ScorePanel } from "./score-panel";
import { TurnInfo } from "./turn-info";
import { DiceArea } from "./dice-area";
import { ActionBar } from "./action-bar";
import { GameOverDialog } from "./game-over-dialog";
import { addActiveGame, removeActiveGame } from "@/lib/active-games";
import { toast } from "sonner";

interface GameBoardProps {
  gameId: number;
}

// ── Selection relay via Next.js API route (works without WebSocket) ──

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

// ── Bust dice relay ──

async function postBustDice(gameId: number, dice: import("@/types/api").RolledDieDto[]) {
  try {
    await fetch("/api/bust-relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, dice }),
    });
  } catch {
    // silent
  }
}

async function fetchBustDice(gameId: number): Promise<import("@/types/api").RolledDieDto[] | null> {
  try {
    const res = await fetch(`/api/bust-relay?gameId=${gameId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.dice ?? null;
  } catch {
    return null;
  }
}

export function GameBoard({ gameId }: GameBoardProps) {
  const queryClient = useQueryClient();
  const selectedSlots = useGameUIStore((s) => s.selectedSlots);
  const clearSelection = useGameUIStore((s) => s.clearSelection);
  const [gameOver, setGameOver] = useState(false);
  const [winnerSeat, setWinnerSeat] = useState<number | undefined>();
  const [forfeit, setForfeit] = useState(false);
  const [forfeitReason, setForfeitReason] = useState<import("@/types/api").ForfeitReason | undefined>();
  const [wsConnected, setWsConnected] = useState(false);
  const [rollTrigger, setRollTrigger] = useState(0);
  const [bustAnimation, setBustAnimation] = useState(false);
  const [bustOverlay, setBustOverlay] = useState<string | null>(null); // "You busted!" or "Opponent busted!"
  const [bankAnimation, setBankAnimation] = useState<number | null>(null);
  const [bustDice, setBustDice] = useState<import("@/types/api").RolledDieDto[] | null>(null);
  const [opponentSlots, setOpponentSlots] = useState<number[]>([]);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const mySeatRef = useRef<number | undefined>(undefined);
  const connectionRef = useRef<GameConnection | null>(null);
  const prevGameRef = useRef<{ activeSeat: number; turnScore: number; totalScores: [number, number] } | null>(null);

  const { data: game, isLoading, error } = useQuery({
    queryKey: queryKeys.gameState(gameId),
    queryFn: () => getGameState(gameId),
    refetchInterval: (wsConnected || bustAnimation) ? false : 1000,
  });

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
  }, [selectedSlots, gameId]);

  // Heartbeat: re-post selections every 5s so they don't expire in the relay
  useEffect(() => {
    const interval = setInterval(() => {
      const seat = mySeatRef.current;
      if (seat != null) {
        postSelections(gameId, seat, useGameUIStore.getState().selectedSlots);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Presence ping: notify backend every 10s that this player is still active
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      pingGame(gameId).catch(() => {});
    }, 10000);
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

  const handleWsConnectionChange = useCallback((connected: boolean) => {
    setWsConnected(connected);
  }, []);

  const triggerBust = useCallback((message: string, dice: import("@/types/api").RolledDieDto[] | null) => {
    setBustAnimation(true);
    setBustOverlay(message);
    if (dice) setBustDice(dice);
    // Keep bust visible for 2.5s so players can see the rolled dice
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

  const handleEvent = useCallback(
    (event: GameEvent) => {
      const mySeat = mySeatRef.current;

      // For BUST events, delay the state refresh so players can see the bust dice
      if (event.type === "BUST") {
        const msg = event.bySeat === mySeat ? "You busted!" : "Opponent busted!";
        const bustPayload = event.payload as { rolled?: import("@/types/api").RolledDieDto[] } | undefined;
        const bustRolled = bustPayload?.rolled ?? null;
        setRollTrigger((prev) => prev + 1); // show the bust roll animation
        triggerBust(msg, bustRolled);
        clearSelection();
        setOpponentSlots([]);
        // Relay bust dice for polling-only devices
        if (bustRolled) postBustDice(gameId, bustRolled);
        // Delay game state refresh so bust dice stay visible
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.gameState(gameId) });
        }, 2500);
        return;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.gameState(gameId) });

      switch (event.type) {
        case "ROLLED":
          setRollTrigger((prev) => prev + 1);
          setOpponentSlots([]);
          break;
        case "BANKED": {
          const bp = event.payload as { banked: number } | undefined;
          if (event.bySeat === mySeat) {
            triggerBank(bp?.banked ?? 0);
          } else {
            toast.info("Opponent banked their score.");
          }
          clearSelection();
          setOpponentSlots([]);
          break;
        }
        case "TURN_CHANGED":
          clearSelection();
          setOpponentSlots([]);
          break;
        case "FINISHED": {
          const payload = event.payload as { winnerSeat: number } | undefined;
          setWinnerSeat(payload?.winnerSeat);
          setGameOver(true);
          break;
        }
        case "FORFEIT": {
          const payload = event.payload as { winnerSeat?: number; loserSeat?: number; reason?: string } | undefined;
          if (payload?.winnerSeat != null) {
            setWinnerSeat(payload.winnerSeat);
          } else if (payload?.loserSeat != null && mySeat != null) {
            setWinnerSeat(payload.loserSeat === 0 ? 1 : 0);
          }
          setForfeitReason(payload?.reason as import("@/types/api").ForfeitReason | undefined);
          setForfeit(true);
          setGameOver(true);
          setOpponentDisconnected(false);
          break;
        }
        case "PLAYER_DISCONNECTED":
          if (event.bySeat !== mySeat) {
            setOpponentDisconnected(true);
          }
          break;
        case "PLAYER_RECONNECTED":
          if (event.bySeat !== mySeat) {
            setOpponentDisconnected(false);
          }
          break;
      }
    },
    [gameId, queryClient, clearSelection, triggerBust, triggerBank]
  );

  useEffect(() => {
    const conn = connectToGame(
      gameId,
      handleEvent,
      handleWsConnectionChange
    );
    connectionRef.current = conn;
    return () => {
      conn.disconnect();
      connectionRef.current = null;
    };
  }, [gameId, handleEvent, handleWsConnectionChange]);

  // Track active game in localStorage
  useEffect(() => {
    if (!game) return;
    if (game.status === "IN_PROGRESS") {
      addActiveGame(gameId);
    } else if (game.status === "FINISHED") {
      removeActiveGame(gameId);
    }
  }, [game, gameId]);

  // Detect game finished from polling (when WS event was missed)
  if (game && game.status === "FINISHED" && !gameOver) {
    // Use winnerSeat from game state if backend provides it
    if (game.winnerSeat != null) {
      setWinnerSeat(game.winnerSeat);
    }
    // Detect forfeit: if neither player reached targetScore, it was a forfeit
    const noOneReachedTarget = game.totalScores[0] < game.targetScore && game.totalScores[1] < game.targetScore;
    if (noOneReachedTarget || game.forfeitReason) {
      setForfeit(true);
      if (game.forfeitReason) {
        setForfeitReason(game.forfeitReason);
      }
      // If no winnerSeat from backend or WS, the player still viewing the game
      // is the winner (the loser was deactivated/disconnected/timed out)
      if (game.winnerSeat == null) {
        setWinnerSeat(game.mySeat);
      }
    }
    setGameOver(true);
  }

  // Polling-based bust detection: detect opponent bust when WS is unavailable
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
      // Opponent bust: turn was opponent's, now it's mine
      const wasOpponentTurn = prev.activeSeat !== game.mySeat;
      const nowMyTurn = game.activeSeat === game.mySeat;
      if (wasOpponentTurn && nowMyTurn) {
        // Distinguish bust from bank: if opponent's total score didn't increase, it's a bust
        const opponentSeat = game.mySeat === 0 ? 1 : 0;
        const scoreSame = game.totalScores[opponentSeat] === prev.totalScores[opponentSeat];
        if (scoreSame) {
          // Fetch bust dice from relay (posted by WS-connected device)
          fetchBustDice(gameId).then((dice) => {
            triggerBust("Opponent busted!", dice);
            if (dice) setBustDice(dice);
          });
        }
      }
    }
  }, [game, bustAnimation, wsConnected, triggerBust, gameId]);

  const rollMutation = useMutation({
    mutationFn: () => rollDice(gameId),
    onSuccess: (data) => {
      setRollTrigger((prev) => prev + 1);
      clearSelection();

      // Detect self-bust: I rolled but turn moved to opponent (polling-only fallback)
      const wasMySeat = game?.activeSeat === game?.mySeat;
      const nowOpponentTurn = data.activeSeat !== data.mySeat;
      if (wasMySeat && nowOpponentTurn && !wsConnected) {
        // I busted — show bust animation, try to get dice from response or relay
        if (data.lastRoll && data.lastRoll.length > 0) {
          triggerBust("You busted!", data.lastRoll);
          setBustDice(data.lastRoll);
        } else {
          // Response has no dice — try relay (opponent's WS device may have posted them)
          fetchBustDice(gameId).then((dice) => {
            triggerBust("You busted!", dice);
            if (dice) setBustDice(dice);
          });
        }
        setTimeout(() => {
          queryClient.setQueryData(queryKeys.gameState(gameId), data);
        }, 2500);
        return;
      }

      queryClient.setQueryData(queryKeys.gameState(gameId), data);
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to roll");
    },
  });

  const keepMutation = useMutation({
    mutationFn: (slots: number[]) => keepDice(gameId, { slots }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.gameState(gameId), data);
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to keep");
    },
  });

  const bankMutation = useMutation({
    mutationFn: () => bankScore(gameId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.gameState(gameId), data);
      clearSelection();
      triggerBank(game?.turnScore ?? 0);
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to bank");
    },
  });

  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  const pendingForfeitReason = useRef<import("@/types/api").ForfeitReason>("VOLUNTARY");

  const forfeitMutation = useMutation({
    mutationFn: () => forfeitGame(gameId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.gameState(gameId), data);
      removeActiveGame(gameId);
      setWinnerSeat(data.mySeat === 0 ? 1 : 0);
      setForfeitReason(pendingForfeitReason.current);
      setForfeit(true);
      setGameOver(true);
      setShowForfeitConfirm(false);
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to forfeit");
      setShowForfeitConfirm(false);
    },
  });

  // Turn timeout: auto-bank if in CAN_ROLL_OR_BANK phase, otherwise forfeit
  const handleTurnTimeout = useCallback(() => {
    if (!game || gameOver) return;
    const isMyTurn = game.activeSeat === game.mySeat;
    if (!isMyTurn) return;

    if (game.phase === "CAN_ROLL_OR_BANK" && !bankMutation.isPending) {
      bankMutation.mutate();
    } else if (!forfeitMutation.isPending) {
      pendingForfeitReason.current = "TIMEOUT";
      forfeitMutation.mutate();
    }
  }, [game, gameOver, forfeitMutation, bankMutation]);

  // Auto-roll: when it becomes my turn and phase is MUST_ROLL, roll automatically
  const autoRolledRef = useRef(false);
  const rollMutateRef = useRef(rollMutation.mutate);
  useEffect(() => {
    rollMutateRef.current = rollMutation.mutate;
  });
  const rollPending = rollMutation.isPending;

  useEffect(() => {
    if (!game || gameOver) return;
    const isMyTurn = game.activeSeat === game.mySeat;
    const mustRoll = game.phase === "MUST_ROLL";

    if (isMyTurn && mustRoll && !rollPending && !bustAnimation) {
      // Only auto-roll at the START of my turn (not after I just kept dice)
      // Detect fresh turn: turnScore is 0 and all 6 dice are available
      if (game.turnScore === 0 && game.remainingDiceCount === 6 && !autoRolledRef.current) {
        autoRolledRef.current = true;
        const timer = setTimeout(() => {
          rollMutateRef.current();
        }, 600);
        return () => {
          clearTimeout(timer);
        };
      }
    } else {
      autoRolledRef.current = false;
    }
  }, [game, gameOver, bustAnimation, rollPending]);

  // ── Loading / Error states ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a0f08]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
          <span className="text-amber-200/40 text-sm font-mono">Loading game...</span>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a0f08]">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-lg font-bold">Failed to load game</p>
          <p className="text-amber-200/40 text-sm">
            {error instanceof ApiError ? error.message : "Please try again."}
          </p>
        </div>
      </div>
    );
  }

  const actionLoading = rollMutation.isPending || keepMutation.isPending || bankMutation.isPending;
  const isMyTurn = game.activeSeat === game.mySeat;

  return (
    <div className="relative h-screen overflow-hidden game-bg flex flex-col">
      {/* Bank animation overlay */}
      {bankAnimation !== null && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce text-6xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(217,170,60,0.7)]">
            +{bankAnimation.toLocaleString()}
          </div>
        </div>
      )}

      {/* Bust overlay */}
      {bustOverlay && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 animate-bust-appear">
            <div className="text-5xl sm:text-6xl font-black text-red-500 uppercase tracking-wider drop-shadow-[0_0_40px_rgba(239,68,68,0.7)]">
              Busted!
            </div>
            <div className="text-lg text-red-300/80 font-medium">
              {bustOverlay}
            </div>
          </div>
        </div>
      )}

      {/* Opponent disconnected banner */}
      {opponentDisconnected && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-900/80 border border-red-700/50 text-red-200 text-sm font-mono animate-pulse">
          Opponent disconnected — waiting 30s...
        </div>
      )}

      {/* Dice table + actions — centered, fills available space */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full">
        <div className="mb-2">
          <TurnInfo game={game} gameOver={gameOver} onTimeout={handleTurnTimeout} />
        </div>

        <div className="w-full">
          <DiceArea
            game={game}
            rollTrigger={rollTrigger}
            bustAnimation={bustAnimation}
            opponentSlots={isMyTurn ? [] : opponentSlots}
            bustDice={bustDice}
          />
        </div>

        <div className="mt-3">
          <ActionBar
            game={game}
            onRoll={() => rollMutation.mutate()}
            onKeep={(slots) => keepMutation.mutate(slots)}
            onBank={() => bankMutation.mutate()}
            loading={actionLoading}
          />
        </div>
      </div>

      {/* HUD Overlays */}

      {/* Score Panel — bottom left */}
      <div className="absolute bottom-3 left-3 z-30">
        <ScorePanel game={game} />
      </div>

      {/* Give Up — bottom right */}
      <div className="absolute bottom-3 right-3 z-30">
        {!showForfeitConfirm ? (
          <button
            onClick={() => setShowForfeitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white/50 hover:text-white/80 hover:bg-black/70 transition-all text-xs font-mono"
          >
            Give up
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 border border-red-900/40">
            <span className="text-xs text-red-300/80 font-mono">Forfeit?</span>
            <button
              onClick={() => { pendingForfeitReason.current = "VOLUNTARY"; forfeitMutation.mutate(); }}
              disabled={forfeitMutation.isPending}
              className="text-xs px-3 py-1 rounded bg-red-900/60 border border-red-700/40 text-red-200 font-bold hover:bg-red-800/60 transition-all disabled:opacity-50"
            >
              {forfeitMutation.isPending ? "..." : "Yes"}
            </button>
            <button
              onClick={() => setShowForfeitConfirm(false)}
              className="text-xs px-3 py-1 rounded bg-black/50 border border-white/10 text-white/50 hover:text-white/80 transition-all"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Game ID — top right */}
      <div className="absolute top-2 right-3 z-30">
        <span className="text-[10px] text-amber-200/20 font-mono uppercase tracking-widest">
          Game #{gameId}
        </span>
      </div>

      <GameOverDialog
        game={game}
        open={gameOver}
        winnerSeat={winnerSeat}
        forfeit={forfeit}
        forfeitReason={forfeitReason}
      />
    </div>
  );
}
