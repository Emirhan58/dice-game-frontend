export const queryKeys = {
  wallet: ["wallet"] as const,
  waitingTables: ["tables", "waiting"] as const,
  gameState: (gameId: number) => ["game", gameId] as const,
  adminUsers: (page: number, search: string) => ["admin", "users", page, search] as const,
  adminUser: (id: number) => ["admin", "user", id] as const,
  adminUserWallet: (id: number) => ["admin", "user", id, "wallet"] as const,
};
