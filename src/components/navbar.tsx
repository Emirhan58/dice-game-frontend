"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { logout } from "@/lib/api";
import { useEffect } from "react";

export function Navbar() {
  const { isAuthenticated, role, clearAuth, hydrate } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore errors
    }
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="bg-[#1a0f08]/95 backdrop-blur border-b border-amber-900/30 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-medieval text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors tracking-wide drop-shadow-[0_0_8px_rgba(200,146,44,0.3)]">
          Rolling Dice
        </Link>

        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-red-300/70 hover:text-red-300 transition-colors px-2 py-1"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/lobby"
                className="text-sm text-amber-200/70 hover:text-amber-200 transition-colors px-2 py-1"
              >
                Lobby
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-amber-200/40 hover:text-red-400 transition-colors px-2 py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-amber-200/70 hover:text-amber-200 transition-colors px-2 py-1"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm px-3 py-1.5 bg-amber-800/50 border border-amber-700/50 rounded text-amber-200 hover:bg-amber-700/50 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
