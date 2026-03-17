// ============================================================
// Enums
// ============================================================

export type GameStatus = "IN_PROGRESS" | "FINISHED";

export type TurnPhase = "MUST_ROLL" | "MUST_KEEP_OR_BUST" | "CAN_ROLL_OR_BANK";

export type TableStatus = "WAITING" | "FULL" | "IN_GAME" | "FINISHED" | "CANCELLED";

export type TableMode = "UNBADGED" | "BADGED";

export type BadgeTier = "TIN" | "SILVER" | "GOLD";

// ============================================================
// Auth
// ============================================================

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface ApiResponse {
  status: number;
  message: string;
}

export interface ApiErrorResponse {
  status: number;
  message: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

// ============================================================
// Wallet
// ============================================================

export interface WalletResponse {
  balanceGold: number;
}

// ============================================================
// Table
// ============================================================

export interface CreateTableRequest {
  mode: TableMode;
  badgeTier?: BadgeTier | null;
  stakeGold: number;
}

export interface TableResponse {
  id: number;
  status: string;
  mode: string;
  badgeTier: string | null;
  stakeGold: number;
  targetScore: number;
  seat0UserId: number | null;
  seat1UserId: number | null;
  gameId: number | null;
}

// ============================================================
// Game
// ============================================================

export interface RolledDieDto {
  slot: number; // 0–5
  value: number; // 1–6
}

export interface KeepRequest {
  slots: number[];
}

export interface GameStateResponse {
  gameId: number;
  tableId: number;
  status: GameStatus;
  targetScore: number;
  activeSeat: number; // 0 or 1
  mySeat: number; // 0 or 1
  totalScores: [number, number];
  turnScore: number;
  remainingDiceCount: number;
  phase: TurnPhase;
  lastRoll: RolledDieDto[] | null;
  winnerSeat?: number | null;
  forfeitReason?: ForfeitReason | null;
}

// ============================================================
// WebSocket Events
// ============================================================

export type GameEventType =
  | "ROLLED"
  | "KEPT"
  | "BANKED"
  | "BUST"
  | "FINISHED"
  | "TURN_CHANGED"
  | "FORFEIT"
  | "PLAYER_DISCONNECTED"
  | "PLAYER_RECONNECTED";

// ── Payload types ──

export interface RolledPayload {
  roll: RolledDieDto[];
}

export interface KeptPayload {
  slots: number[];
  gained: number;
  turnScore: number;
  hotDice: boolean;
}

export interface BankedPayload {
  banked: number;
  total: number;
}

export interface BustPayload {
  rolled: RolledDieDto[];
}

export interface FinishedPayload {
  winnerSeat: number;
}

export type ForfeitReason = "VOLUNTARY" | "DEACTIVATED" | "DISCONNECT" | "TIMEOUT";

export interface ForfeitPayload {
  winnerSeat: number;
  loserSeat: number;
  reason: ForfeitReason;
}

// ── Discriminated union for type-safe event handling ──

interface GameEventBase {
  gameId: number;
  tableId: number;
  bySeat: number | null;
}

export type GameEvent =
  | (GameEventBase & { type: "ROLLED"; payload: RolledPayload })
  | (GameEventBase & { type: "KEPT"; payload: KeptPayload })
  | (GameEventBase & { type: "BANKED"; payload: BankedPayload })
  | (GameEventBase & { type: "BUST"; payload: BustPayload })
  | (GameEventBase & { type: "FINISHED"; payload: FinishedPayload })
  | (GameEventBase & { type: "TURN_CHANGED"; payload?: undefined })
  | (GameEventBase & { type: "FORFEIT"; payload: ForfeitPayload })
  | (GameEventBase & { type: "PLAYER_DISCONNECTED"; payload?: undefined })
  | (GameEventBase & { type: "PLAYER_RECONNECTED"; payload?: undefined });

// ============================================================
// Admin
// ============================================================

export type UserRole = "USER" | "ADMIN";

export interface AdminUserResponse {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  role: UserRole;
  active: boolean;
  balanceGold: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  initialBalance?: number;
}

export interface AdminUpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface AdminWalletAdjustRequest {
  amount: number;
  note?: string;
}

export interface AdminWalletSetRequest {
  amount: number;
  note?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number; // current page (0-based)
    totalElements: number;
    totalPages: number;
  };
}
