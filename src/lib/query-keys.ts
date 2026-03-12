export const queryKeys = {
  wallet: ["wallet"] as const,
  waitingTables: ["tables", "waiting"] as const,
  gameState: (gameId: number) => ["game", gameId] as const,
};
