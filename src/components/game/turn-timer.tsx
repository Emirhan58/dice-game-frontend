"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const TURN_DURATION = 20; // seconds
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TurnTimerProps {
  gameId: number;
  activeSeat: number;
  gameOver: boolean;
  onTimeout: () => void;
}

// External store for remaining time — avoids setState-in-effect and
// impure-function-during-render lint issues.
let listeners: Array<() => void> = [];
let remainingSnapshot = TURN_DURATION;

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}
function getSnapshot() { return remainingSnapshot; }
function setSnapshot(value: number) {
  remainingSnapshot = value;
  listeners.forEach((l) => l());
}

export function TurnTimer({ gameId, activeSeat, gameOver, onTimeout }: TurnTimerProps) {
  const startRef = useRef(0);
  const timeoutFiredRef = useRef(false);
  const syncedRef = useRef(false);

  const remaining = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // When active seat changes: publish turn start time and reset timer
  useEffect(() => {
    const now = Date.now();
    startRef.current = now;
    timeoutFiredRef.current = false;
    syncedRef.current = false;
    setSnapshot(TURN_DURATION);

    // Publish this turn's start time to the relay
    fetch("/api/turn-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, activeSeat, startedAt: now }),
    }).catch(() => {});

    // Also fetch in case the other player already published a start time
    fetch(`/api/turn-start?gameId=${gameId}`)
      .then((res) => res.json())
      .then((data: { activeSeat: number | null; startedAt: number | null }) => {
        if (
          data.startedAt != null &&
          data.activeSeat === activeSeat &&
          !syncedRef.current
        ) {
          startRef.current = data.startedAt;
          syncedRef.current = true;
        }
      })
      .catch(() => {});
  }, [gameId, activeSeat]);

  // Tick every 100ms for smooth animation
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      if (startRef.current > 0) {
        const elapsed = (Date.now() - startRef.current) / 1000;
        const left = Math.max(0, TURN_DURATION - elapsed);
        setSnapshot(left);

        if (left <= 0 && !timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          onTimeout();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeSeat, gameOver, onTimeout]);

  const fraction = remaining / TURN_DURATION;
  const offset = CIRCUMFERENCE * (1 - fraction);

  // Color transitions: green → yellow → orange → red
  const getColor = (f: number) => {
    if (f > 0.5) return "#22c55e"; // green-500
    if (f > 0.25) return "#eab308"; // yellow-500
    if (f > 0.1) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  };

  const color = getColor(fraction);
  const secondsLeft = Math.ceil(remaining);

  return (
    <div className="relative inline-flex items-center justify-center w-10 h-10">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        {/* Progress arc */}
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
      {/* Seconds text */}
      <span
        className="absolute text-xs font-bold font-mono"
        style={{ color }}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
