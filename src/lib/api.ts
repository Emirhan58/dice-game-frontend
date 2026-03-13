import type {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  AccessTokenResponse,
  ApiResponse,
  ApiErrorResponse,
  WalletResponse,
  CreateTableRequest,
  TableResponse,
  KeepRequest,
  GameStateResponse,
  AdminUserResponse,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  AdminWalletAdjustRequest,
  AdminWalletSetRequest,
  PageResponse,
} from "@/types/api";

// Empty string = same origin (requests go through Next.js rewrites proxy)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ============================================================
// Helpers
// ============================================================

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(
    status: number,
    message: string,
    errors?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

let isRefreshing = false;
// Queue of callers waiting for the in-flight refresh to finish
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}[] = [];

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

/**
 * Refresh the access token using the HttpOnly refresh-token cookie.
 * - If a refresh is already in flight, callers are queued so only ONE
 *   refresh request is sent at a time.
 * - On success the new token is persisted to localStorage AND synced
 *   into the Zustand auth store.
 */
async function doRefresh(): Promise<string> {
  if (isRefreshing) {
    // Another call is already refreshing — wait for it
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const error = new ApiError(res.status, "Refresh token expired or invalid");
      processQueue(error, null);
      throw error;
    }

    const data: AccessTokenResponse = await res.json();
    const newToken = data.accessToken;

    // Persist to localStorage
    localStorage.setItem("accessToken", newToken);

    // Sync Zustand store so UI (navbar etc.) stays in sync
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.getState().setAccessToken(newToken);

    // Resolve every queued caller
    processQueue(null, newToken);

    return newToken;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Refresh failed");
    processQueue(error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // ── 401 Handling: refresh once, then retry ──────────────────
  if (res.status === 401 && retry && typeof window !== "undefined") {
    try {
      const newToken = await doRefresh();

      // Retry the original request with the fresh token
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (retryRes.status === 204 || retryRes.headers.get("content-length") === "0") {
        return undefined as T;
      }
      const retryBody = await retryRes.json();
      if (!retryRes.ok) {
        const err = retryBody as ApiErrorResponse;
        throw new ApiError(err.status, err.message, err.errors);
      }
      return retryBody as T;
    } catch (refreshErr) {
      // Refresh itself failed — clear everything and send user to login
      const { useAuthStore } = await import("@/stores/auth-store");
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      throw refreshErr instanceof ApiError
        ? refreshErr
        : new ApiError(401, "Session expired. Please login again.");
    }
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const body = await res.json();

  if (!res.ok) {
    const err = body as ApiErrorResponse;
    throw new ApiError(err.status, err.message, err.errors);
  }

  return body as T;
}

// ============================================================
// Auth
// ============================================================

export async function register(data: RegisterRequest): Promise<ApiResponse> {
  return request<ApiResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await request<LoginResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    false
  );
  localStorage.setItem("accessToken", res.accessToken);
  return res;
}

export async function refreshAccessToken(): Promise<AccessTokenResponse> {
  const res = await request<AccessTokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
  });
  localStorage.setItem("accessToken", res.accessToken);
  return res;
}

export async function logout(): Promise<void> {
  await request<void>("/api/v1/auth/logout", {
    method: "POST",
  });
  localStorage.removeItem("accessToken");
}

// ============================================================
// Wallet
// ============================================================

export async function getMyWallet(): Promise<WalletResponse> {
  return request<WalletResponse>("/api/v1/wallet/me");
}

// ============================================================
// Tables
// ============================================================

export async function createTable(
  data: CreateTableRequest
): Promise<TableResponse> {
  return request<TableResponse>("/api/v1/tables", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getWaitingTables(): Promise<TableResponse[]> {
  return request<TableResponse[]>("/api/v1/tables/waiting");
}

export async function joinTable(tableId: number): Promise<TableResponse> {
  return request<TableResponse>(`/api/v1/tables/${tableId}/join`, {
    method: "POST",
  });
}

export async function cancelTable(tableId: number): Promise<TableResponse> {
  return request<TableResponse>(`/api/v1/tables/${tableId}/cancel`, {
    method: "POST",
  });
}

// ============================================================
// Game
// ============================================================

export async function getGameState(
  gameId: number
): Promise<GameStateResponse> {
  return request<GameStateResponse>(`/api/v1/games/${gameId}`);
}

export async function rollDice(gameId: number): Promise<GameStateResponse> {
  return request<GameStateResponse>(`/api/v1/games/${gameId}/roll`, {
    method: "POST",
  });
}

export async function keepDice(
  gameId: number,
  data: KeepRequest
): Promise<GameStateResponse> {
  return request<GameStateResponse>(`/api/v1/games/${gameId}/keep`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function bankScore(gameId: number): Promise<GameStateResponse> {
  return request<GameStateResponse>(`/api/v1/games/${gameId}/bank`, {
    method: "POST",
  });
}

export async function forfeitGame(gameId: number): Promise<GameStateResponse> {
  return request<GameStateResponse>(`/api/v1/games/${gameId}/forfeit`, {
    method: "POST",
  });
}

export async function pingGame(gameId: number): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  await fetch(`${BASE_URL}/api/v1/games/${gameId}/ping`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
}

// ============================================================
// Admin — Users
// ============================================================

export async function getAdminUsers(
  page = 0,
  size = 20,
  search?: string
): Promise<PageResponse<AdminUserResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) params.set("search", search);
  return request<PageResponse<AdminUserResponse>>(`/api/v1/admin/users?${params}`);
}

export async function getAdminUser(id: number): Promise<AdminUserResponse> {
  return request<AdminUserResponse>(`/api/v1/admin/users/${id}`);
}

export async function createAdminUser(data: AdminCreateUserRequest): Promise<AdminUserResponse> {
  return request<AdminUserResponse>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminUser(id: number, data: AdminUpdateUserRequest): Promise<AdminUserResponse> {
  return request<AdminUserResponse>(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(id: number): Promise<void> {
  return request<void>(`/api/v1/admin/users/${id}`, { method: "DELETE" });
}

// ============================================================
// Admin — Wallet
// ============================================================

export async function getAdminUserWallet(id: number): Promise<WalletResponse> {
  return request<WalletResponse>(`/api/v1/admin/users/${id}/wallet`);
}

export async function adjustAdminUserWallet(id: number, data: AdminWalletAdjustRequest): Promise<WalletResponse> {
  return request<WalletResponse>(`/api/v1/admin/users/${id}/wallet/adjust`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function setAdminUserWallet(id: number, data: AdminWalletSetRequest): Promise<WalletResponse> {
  return request<WalletResponse>(`/api/v1/admin/users/${id}/wallet`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
