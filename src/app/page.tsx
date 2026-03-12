"use client";

import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

// Check auth before first render to avoid flash
function useHydratedAuth() {
  const store = useAuthStore();
  if (!store.isAuthenticated && typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      store.hydrate();
    }
  }
  return store;
}

const scoringRules = [
  { combo: "Single 1", points: "100" },
  { combo: "Single 5", points: "50" },
  { combo: "Three 1s", points: "1,000" },
  { combo: "Three Ns (N\u22601)", points: "N \u00d7 100" },
  { combo: "Four of a kind", points: "\u00d72 triple" },
  { combo: "Five of a kind", points: "\u00d74 triple" },
  { combo: "Six of a kind", points: "\u00d78 triple" },
  { combo: "Straight 1-2-3-4-5-6", points: "3,000" },
  { combo: "Three pairs", points: "1,500" },
  { combo: "Two triples", points: "2,500" },
];

export default function Home() {
  const { isAuthenticated, username } = useHydratedAuth();

  return (
    <div className="medieval-bg min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center gap-6 px-4 pt-20 pb-12">
        <div className="text-amber-900/30 text-7xl select-none">&#9856;</div>
        <div className="space-y-3">
          <h1 className="font-medieval text-5xl sm:text-6xl font-black text-amber-400 tracking-wide drop-shadow-[0_0_20px_rgba(200,146,44,0.4)]">
            Rolling Dice
          </h1>
          <p className="text-amber-200/50 text-sm sm:text-base max-w-md mx-auto">
            A competitive two-player Farkle dice game inspired by Kingdom Come: Deliverance 2
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mt-2">
          {isAuthenticated ? (
            <>
              <p className="text-amber-200/40 text-xs">
                Welcome back, <span className="text-amber-300 font-bold">{username ?? "adventurer"}</span>
              </p>
              <Link href="/lobby" className="w-full">
                <button className="w-full py-3 px-6 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval text-lg font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(200,146,44,0.3)]">
                  ENTER TAVERN
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="w-full">
                <button className="w-full py-3 px-6 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval text-lg font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(200,146,44,0.3)]">
                  PLAY
                </button>
              </Link>
              <Link href="/login" className="w-full">
                <button className="w-full py-2.5 px-6 bg-[#2a1a0e]/80 border border-amber-900/40 rounded-lg text-amber-200/70 font-medieval text-base tracking-wider hover:bg-[#3d2814]/80 hover:text-amber-200 transition-all">
                  LOGIN
                </button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-8">
        <div className="border-t border-amber-900/20" />
      </div>

      {/* How to Play */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="font-medieval text-xl text-amber-400 font-bold tracking-wide text-center mb-8">
          How to Play
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[#1e140c]/60 border border-amber-900/20 rounded-lg">
            <div className="text-3xl text-amber-600 mb-3">&#9856;</div>
            <h3 className="font-medieval text-sm text-amber-400 font-bold mb-2">1. Roll</h3>
            <p className="text-xs text-amber-200/40 leading-relaxed">
              Roll 6 dice each turn. You must keep at least one scoring die before rolling again.
            </p>
          </div>
          <div className="text-center p-4 bg-[#1e140c]/60 border border-amber-900/20 rounded-lg">
            <div className="text-3xl text-amber-600 mb-3">&#9733;</div>
            <h3 className="font-medieval text-sm text-amber-400 font-bold mb-2">2. Keep or Bank</h3>
            <p className="text-xs text-amber-200/40 leading-relaxed">
              Keep scoring dice to build your turn total. Bank to lock in your points, or push your luck and roll again.
            </p>
          </div>
          <div className="text-center p-4 bg-[#1e140c]/60 border border-amber-900/20 rounded-lg">
            <div className="text-3xl text-amber-600 mb-3">&#9876;</div>
            <h3 className="font-medieval text-sm text-amber-400 font-bold mb-2">3. Win</h3>
            <p className="text-xs text-amber-200/40 leading-relaxed">
              First player to reach the target score wins the gold. But beware — roll no scoring dice and you bust!
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-8">
        <div className="border-t border-amber-900/20" />
      </div>

      {/* Scoring Table */}
      <section className="max-w-md mx-auto px-4 py-12">
        <h2 className="font-medieval text-xl text-amber-400 font-bold tracking-wide text-center mb-6">
          Scoring
        </h2>

        <div className="bg-[#1e140c]/60 border border-amber-900/20 rounded-lg overflow-hidden">
          {scoringRules.map((rule, i) => (
            <div
              key={rule.combo}
              className={`flex items-center justify-between px-4 py-2.5 ${
                i !== scoringRules.length - 1 ? "border-b border-amber-900/10" : ""
              }`}
            >
              <span className="text-xs text-amber-200/60">{rule.combo}</span>
              <span className="text-xs text-amber-300 font-bold font-mono">{rule.points}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-amber-200/25 mt-3">
          Hot Dice: keep all 6 dice and get them all back to continue your turn!
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-900/15 py-6 text-center">
        <p className="text-[10px] text-amber-200/20">
          KCD2 Dice Game — Inspired by Kingdom Come: Deliverance 2
        </p>
      </footer>
    </div>
  );
}
