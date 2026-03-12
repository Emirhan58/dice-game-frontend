import { create } from "zustand";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function extractUserInfo(token: string): { userId: number | null; username: string | null; role: string | null } {
  const payload = decodeJwtPayload(token);
  const userId = typeof payload.userId === "number" ? payload.userId
    : typeof payload.sub === "number" ? payload.sub
    : typeof payload.sub === "string" && /^\d+$/.test(payload.sub) ? Number(payload.sub)
    : null;
  const username = typeof payload.username === "string" ? payload.username
    : typeof payload.name === "string" ? payload.name
    : typeof payload.preferred_username === "string" ? payload.preferred_username
    : typeof payload.sub === "string" && !/^\d+$/.test(payload.sub) ? payload.sub
    : null;
  const role = typeof payload.role === "string" ? payload.role : null;
  return { userId, username, role };
}

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  role: string | null;
  setAccessToken: (token: string) => void;
  setUserId: (id: number) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  userId: null,
  username: null,
  role: null,
  setAccessToken: (token: string) => {
    localStorage.setItem("accessToken", token);
    const { userId, username, role } = extractUserInfo(token);
    if (username) {
      localStorage.setItem("username", username);
    }
    if (userId !== null) {
      localStorage.setItem("userId", String(userId));
    }
    if (role) {
      localStorage.setItem("role", role);
    }
    set({
      accessToken: token,
      isAuthenticated: true,
      userId: userId ?? (Number(localStorage.getItem("userId")) || null),
      username: username ?? localStorage.getItem("username"),
      role: role ?? localStorage.getItem("role"),
    });
  },
  setUserId: (id: number) => {
    localStorage.setItem("userId", String(id));
    set({ userId: id });
  },
  clearAuth: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    set({ accessToken: null, isAuthenticated: false, userId: null, username: null, role: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const { userId, username, role } = extractUserInfo(token);
      set({
        accessToken: token,
        isAuthenticated: true,
        userId: userId ?? (Number(localStorage.getItem("userId")) || null),
        username: username ?? localStorage.getItem("username"),
        role: role ?? localStorage.getItem("role"),
      });
    }
  },
}));
