"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const TURN_DURATION = 40; // seconds
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TurnTimerProps {
  gameId: number;
  activeSeat: number;
  phase: string;
  gameOver: boolean;
  onTimeout: () => void;
}

// External store for remaining time — avoids setState-in-effect and
// impure-function-during-render lint issues (React 19 compiler rules).
const listeners = new Set<() => void>();
let remainingSnapshot = TURN_DURATION;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return remainingSnapshot;
}
function setSnapshot(value: number) {
  remainingSnapshot = value;
  for (const l of listeners) l();
}

export function TurnTimer({
  gameId,
  activeSeat,
  phase,
  gameOver,
  onTimeout,
}: TurnTimerProps) {
  const startRef = useRef(0);
  const timeoutFiredRef = useRef(false);

  const remaining = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Reset timer on turn change (activeSeat) to prevent instant timeout on new player
  useEffect(() => {
    startRef.current = Date.now();
    timeoutFiredRef.current = false;
    setSnapshot(TURN_DURATION);
  }, [activeSeat]);

  // Also reset timer after every roll (phase becomes MUST_KEEP_OR_BUST)
  useEffect(() => {
    if (phase !== "MUST_KEEP_OR_BUST") return;
    startRef.current = Date.now();
    timeoutFiredRef.current = false;
    setSnapshot(TURN_DURATION);
  }, [activeSeat, phase]);

  // Relay sync: only on turn (activeSeat) change for cross-device sync
  useEffect(() => {
    let cancelled = false;
    const now = startRef.current || Date.now();

    // Publish this turn's start time, THEN fetch to see if other player published earlier
    fetch("/api/turn-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, activeSeat, startedAt: now }),
    })
      .then(() => fetch(`/api/turn-start?gameId=${gameId}`))
      .then((res) => res.json())
      .then(
        (data: { activeSeat: number | null; startedAt: number | null }) => {
          if (
            !cancelled &&
            data.startedAt != null &&
            data.activeSeat === activeSeat &&
            data.startedAt < startRef.current
          ) {
            startRef.current = data.startedAt;
          }
        }
      )
      .catch(() => {});

    return () => { cancelled = true; };
  }, [gameId, activeSeat]);

  // Tick every 100ms for smooth animation
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      if (startRef.current > 0) {
        const elapsed = (Date.now() - startRef.current) / 1000;
        const left = Math.max(0, TURN_DURATION - elapsed);
        setSnapshot(Math.round(left * 10) / 10);

        if (left <= 0 && !timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          onTimeout();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeSeat, phase, gameOver, onTimeout]);

  const fraction = remaining / TURN_DURATION;
  const offset = CIRCUMFERENCE * (1 - fraction);

  const getColor = (f: number) => {
    if (f > 0.5) return "#22c55e";
    if (f > 0.25) return "#eab308";
    if (f > 0.1) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(fraction);
  const secondsLeft = Math.min(TURN_DURATION, Math.ceil(remaining));

  return (
    <div className="relative inline-flex items-center justify-center w-10 h-10">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.3s ease" }}
        />
      </svg>
      <span
        className="absolute text-xs font-bold font-mono"
        style={{ color }}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
