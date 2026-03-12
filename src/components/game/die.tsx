"use client";

import { cn } from "@/lib/utils";

interface DieProps {
  value: number;
  selected: boolean;
  onClick?: () => void;
  disabled?: boolean;
  state: "rolled" | "kept" | "empty";
}

const dotPositions: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export function Die({ value, selected, onClick, disabled, state }: DieProps) {
  if (state === "empty") {
    return (
      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30" />
    );
  }

  const dots = dotPositions[value] ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-16 h-16 rounded-lg border-2 relative transition-all",
        "hover:scale-105 active:scale-95",
        state === "kept" && "bg-muted border-muted-foreground/50 opacity-60",
        state === "rolled" && selected && "bg-primary/10 border-primary ring-2 ring-primary",
        state === "rolled" && !selected && "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600",
        disabled && "cursor-not-allowed opacity-50 hover:scale-100"
      )}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={8}
            className={cn(
              "fill-current",
              state === "rolled" && selected ? "text-primary" : "text-foreground"
            )}
          />
        ))}
      </svg>
    </button>
  );
}
