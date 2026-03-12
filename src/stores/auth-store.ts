import { create } from "zustand";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

function extractUserInfo(token: string): { userId: number | null; username: string | null } {
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
  return { userId, username };
}

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  userId: null,
  username: null,
  setAccessToken: (token: string) => {
    localStorage.setItem("accessToken", token);
    const { userId, username } = extractUserInfo(token);
    // If JWT has username, persist it. Otherwise keep what's in localStorage.
    if (username) {
      localStorage.setItem("username", username);
    }
    if (userId !== null) {
      localStorage.setItem("userId", String(userId));
    }
    set({
      accessToken: token,
      isAuthenticated: true,
      userId: userId ?? (Number(localStorage.getItem("userId")) || null),
      username: username ?? localStorage.getItem("username"),
    });
  },
  clearAuth: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    set({ accessToken: null, isAuthenticated: false, userId: null, username: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const { userId, username } = extractUserInfo(token);
      set({
        accessToken: token,
        isAuthenticated: true,
        userId: userId ?? (Number(localStorage.getItem("userId")) || null),
        username: username ?? localStorage.getItem("username"),
      });
    }
  },
}));
