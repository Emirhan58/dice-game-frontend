"use client";

import { use } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { GameBoard } from "@/components/game/game-board";

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const id = Number(gameId);

  if (isNaN(id)) {
    return (
      <div className="text-center py-12 text-destructive">
        Invalid game ID
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-40">
        <GameBoard gameId={id} />
      </div>
    </AuthGuard>
  );
}
