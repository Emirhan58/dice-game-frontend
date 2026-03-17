"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGameState, rollDice, keepDice, bankScore, forfeitGame, ApiError } from "@/lib/api";
import { connectToGame, type GameConnection } from "@/lib/websocket";
import { queryKeys } from "@/lib/query-keys";
import { useGameUIStore } from "@/stores/game-ui-store";
import type { GameEvent, RolledDieDto } from "@/types/api";
import { ScorePanel } from "./score-panel";
import { TurnInfo } from "./turn-info";
import { DiceArea } from "./dice-area";
import { ActionBar } from "./action-bar";
import { GameOverDialog } from "./game-over-dialog";
import { addActiveGame, removeActiveGame } from "@/lib/active-games";
import { getScoringSlots } from "@/lib/scoring";
import { toast } from "sonner";
import { useGameAnimations } from "@/hooks/use-game-animations";
import { useSelectionRelay } from "@/hooks/use-selection-relay";
import { usePresencePing } from "@/hooks/use-presence-ping";
import { useAutoRoll } from "@/hooks/use-auto-roll";
import { useBustDetection, fetchBustDice } from "@/hooks/use-bust-detection";

interface GameBoardProps {
  gameId: number;
}

// ── Bust dice relay (POST only — fetch is in useBustDetection) ──

const RELAY_TIMEOUT = 3000;

async function postBustDice(gameId: number, dice: RolledDieDto[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT);
  try {
    await fetch("/api/bust-relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, dice }),
      signal: controller.signal,
    });
  } catch {
    // silent
  } finally {
    clearTimeout(timer);
  }
}

export function GameBoard({ gameId }: GameBoardProps) {
  const queryClient = useQueryClient();
  const clearSelection = useGameUIStore((s) => s.clearSelection);

  // ── Game-over state ──
  const [gameOver, setGameOver] = useState(false);
  const [winnerSeat, setWinnerSeat] = useState<number | undefined>();
  const [forfeit, setForfeit] = useState(false);
  const [forfeitReason, setForfeitReason] = useState<import("@/types/api").ForfeitReason | undefined>();
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // ── WebSocket ──
  const [wsConnected, setWsConnected] = useState(false);
  const [rollTrigger, setRollTrigger] = useState(0);
  const connectionRef = useRef<GameConnection | null>(null);

  // Clear stale selections when switching games
  useEffect(() => {
    clearSelection();
  }, [gameId, clearSelection]);

  // ── Animations ──
  const { bustAnimation, bustOverlay, bankAnimation, bustDice, setBustDice, triggerBust, triggerBank } =
    useGameAnimations();

  // ── Game query ──
  const { data: game, isLoading, error } = useQuery({
    queryKey: queryKeys.gameState(gameId),
    queryFn: () => getGameState(gameId),
    refetchInterval: (wsConnected || bustAnimation) ? false : 1000,
  });

  // ── Relay hooks ──
  const { opponentSlots, clearOpponentSlots, mySeatRef } = useSelectionRelay({
    gameId,
    game,
    gameOver,
  });

  usePresencePing(gameId, gameOver);

  useBustDetection({
    gameId,
    game,
    bustAnimation,
    wsConnected,
    triggerBust,
    setBustDice,
  });

  // ── WebSocket event handler ──

  const handleEvent = useCallback(
    (event: GameEvent) => {
      const mySeat = mySeatRef.current;

      if (event.type === "BUST") {
        const msg = event.bySeat === mySeat ? "You busted!" : "Opponent busted!";
        const bustRolled = event.payload.rolled ?? null;
        setRollTrigger((prev) => prev + 1);
        triggerBust(msg, bustRolled);
        clearSelection();
        clearOpponentSlots();
        if (bustRolled) postBustDice(gameId, bustRolled);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.gameState(gameId) });
        }, 2500);
        return;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.gameState(gameId) });

      switch (event.type) {
        case "ROLLED":
          setRollTrigger((prev) => prev + 1);
          clearOpponentSlots();
          break;
        case "BANKED":
          if (event.bySeat === mySeat) {
            triggerBank(event.payload.banked);
          } else {
            toast.info("Opponent banked their score.");
          }
          clearSelection();
          clearOpponentSlots();
          break;
        case "TURN_CHANGED":
          clearSelection();
          clearOpponentSlots();
          break;
        case "FINISHED":
          setWinnerSeat(event.payload.winnerSeat);
          setGameOver(true);
          break;
        case "FORFEIT": {
          const { winnerSeat: ws, loserSeat: ls, reason } = event.payload;
          if (ws != null) {
            setWinnerSeat(ws);
          } else if (ls != null && mySeat != null) {
            setWinnerSeat(ls === 0 ? 1 : 0);
          }
          setForfeitReason(reason);
          setForfeit(true);
          setGameOver(true);
          setOpponentDisconnected(false);
          break;
        }
        case "PLAYER_DISCONNECTED":
          if (event.bySeat !== mySeat) setOpponentDisconnected(true);
          break;
        case "PLAYER_RECONNECTED":
          if (event.bySeat !== mySeat) setOpponentDisconnected(false);
          break;
      }
    },
    [gameId, queryClient, clearSelection, clearOpponentSlots, triggerBust, triggerBank, mySeatRef]
  );

  const handleWsConnectionChange = useCallback((connected: boolean) => {
    setWsConnected(connected);
  }, []);

  useEffect(() => {
    const conn = connectToGame(gameId, handleEvent, handleWsConnectionChange);
    connectionRef.current = conn;
    return () => {
      conn.disconnect();
      connectionRef.current = null;
    };
  }, [gameId, handleEvent, handleWsConnectionChange]);

  // ── Track active game ──
  useEffect(() => {
    if (!game) return;
    if (game.status === "IN_PROGRESS") {
      addActiveGame(gameId);
    } else if (game.status === "FINISHED") {
      removeActiveGame(gameId);
    }
  }, [game, gameId]);

  // ── Detect game finished from polling ──
  if (game && game.status === "FINISHED" && !gameOver) {
    if (game.winnerSeat != null) setWinnerSeat(game.winnerSeat);
    const noOneReachedTarget = game.totalScores[0] < game.targetScore && game.totalScores[1] < game.targetScore;
    if (noOneReachedTarget || game.forfeitReason) {
      setForfeit(true);
      if (game.forfeitReason) setForfeitReason(game.forfeitReason);
      if (game.winnerSeat == null) setWinnerSeat(game.mySeat);
    }
    setGameOver(true);
  }

  // ── Mutations ──

  const rollMutation = useMutation({
    mutationFn: () => rollDice(gameId),
    onSuccess: (data) => {
      setRollTrigger((prev) => prev + 1);
      clearSelection();

      const wasMySeat = game?.activeSeat === game?.mySeat;
      const nowOpponentTurn = data.activeSeat !== data.mySeat;
      if (wasMySeat && nowOpponentTurn && !wsConnected) {
        if (data.lastRoll && data.lastRoll.length > 0) {
          triggerBust("You busted!", data.lastRoll);
          setBustDice(data.lastRoll);
        } else {
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

  const forfeitMutation = useMutation({
    mutationFn: () => forfeitGame(gameId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.gameState(gameId), data);
      removeActiveGame(gameId);
      setWinnerSeat(data.mySeat === 0 ? 1 : 0);
      setForfeitReason("VOLUNTARY");
      setForfeit(true);
      setGameOver(true);
      setShowForfeitConfirm(false);
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to forfeit");
      setShowForfeitConfirm(false);
    },
  });

  // ── Turn timeout ──
  const handleTurnTimeout = useCallback(() => {
    if (!game || gameOver) return;
    const isMyTurn = game.activeSeat === game.mySeat;
    if (!isMyTurn) return;

    if (game.phase === "MUST_ROLL" && !rollMutation.isPending) {
      // Timeout on MUST_ROLL: roll automatically, then bank after keeping
      rollMutation.mutate();
    } else if (game.phase === "CAN_ROLL_OR_BANK" && !bankMutation.isPending) {
      bankMutation.mutate();
    } else if (game.phase === "MUST_KEEP_OR_BUST" && game.lastRoll && !keepMutation.isPending) {
      const scoringSlots = getScoringSlots(game.lastRoll);
      if (scoringSlots.size > 0) {
        keepMutation.mutate([...scoringSlots], {
          onSuccess: () => {
            bankMutation.mutate();
          },
        });
      }
    }
  }, [game, gameOver, rollMutation, bankMutation, keepMutation]);

  // ── Auto-roll ──
  useAutoRoll({
    game,
    gameOver,
    bustAnimation,
    rollPending: rollMutation.isPending,
    rollMutate: rollMutation.mutate,
  });

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

      {/* Dice table + actions */}
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
              onClick={() => forfeitMutation.mutate()}
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
