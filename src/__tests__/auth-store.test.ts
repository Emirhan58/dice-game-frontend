import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before importing the store
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});

// Import after mocking
const { useAuthStore } = await import("@/stores/auth-store");

// Helper: create a fake JWT with given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe("auth-store", () => {
  beforeEach(() => {
    storage.clear();
    useAuthStore.getState().clearAuth();
  });

  describe("clearAuth", () => {
    it("resets all auth state", () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userId).toBeNull();
      expect(state.username).toBeNull();
      expect(state.role).toBeNull();
    });

    it("removes items from localStorage", () => {
      storage.set("accessToken", "test");
      storage.set("username", "bob");
      useAuthStore.getState().clearAuth();
      expect(storage.has("accessToken")).toBe(false);
      expect(storage.has("username")).toBe(false);
    });
  });

  describe("setAccessToken", () => {
    it("extracts userId from JWT userId field", () => {
      const token = fakeJwt({ userId: 42, username: "alice", role: "USER" });
      useAuthStore.getState().setAccessToken(token);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBe(42);
      expect(state.username).toBe("alice");
      expect(state.role).toBe("USER");
    });

    it("extracts userId from numeric sub field", () => {
      const token = fakeJwt({ sub: 99 });
      useAuthStore.getState().setAccessToken(token);
      expect(useAuthStore.getState().userId).toBe(99);
    });

    it("extracts userId from string-numeric sub field", () => {
      const token = fakeJwt({ sub: "123" });
      useAuthStore.getState().setAccessToken(token);
      expect(useAuthStore.getState().userId).toBe(123);
    });

    it("persists token to localStorage", () => {
      const token = fakeJwt({ userId: 1 });
      useAuthStore.getState().setAccessToken(token);
      expect(storage.get("accessToken")).toBe(token);
    });
  });

  describe("hydrate", () => {
    it("restores state from localStorage token", () => {
      const token = fakeJwt({ userId: 7, username: "bob", role: "ADMIN" });
      storage.set("accessToken", token);
      useAuthStore.getState().hydrate();
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBe(7);
      expect(state.username).toBe("bob");
      expect(state.role).toBe("ADMIN");
    });

    it("falls back to localStorage userId if JWT has none", () => {
      const token = fakeJwt({ sub: "non-numeric-username" });
      storage.set("accessToken", token);
      storage.set("userId", "55");
      useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().userId).toBe(55);
    });

    it("does nothing when no token in localStorage", () => {
      useAuthStore.getState().hydrate();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("setUserId", () => {
    it("updates userId in store and localStorage", () => {
      useAuthStore.getState().setUserId(42);
      expect(useAuthStore.getState().userId).toBe(42);
      expect(storage.get("userId")).toBe("42");
    });
  });
});
