"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { hydrate, isAuthenticated } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/lobby");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="medieval-bg fixed inset-0 flex flex-col items-center justify-center text-center gap-8 px-4 z-40">
      {/* Title */}
      <div className="space-y-3">
        <h1 className="font-medieval text-5xl sm:text-6xl font-black text-amber-400 tracking-wide drop-shadow-[0_0_20px_rgba(200,146,44,0.4)]">
          Rolling Dice
        </h1>
        <p className="text-amber-200/50 text-sm sm:text-base max-w-md mx-auto">
          A competitive two-player dice game inspired by Kingdom Come: Deliverance 2
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
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
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-6 mt-4 max-w-lg">
        <div className="text-center space-y-1.5">
          <div className="text-2xl text-amber-600">&#9856;</div>
          <h3 className="font-medieval text-xs text-amber-400 font-bold">Roll & Keep</h3>
          <p className="text-[11px] text-amber-200/30 leading-tight">
            Roll 6 dice, keep scoring combinations
          </p>
        </div>
        <div className="text-center space-y-1.5">
          <div className="text-2xl text-amber-600">&#9876;</div>
          <h3 className="font-medieval text-xs text-amber-400 font-bold">Compete</h3>
          <p className="text-[11px] text-amber-200/30 leading-tight">
            Challenge players at different stakes
          </p>
        </div>
        <div className="text-center space-y-1.5">
          <div className="text-2xl text-amber-600">&#9816;</div>
          <h3 className="font-medieval text-xs text-amber-400 font-bold">Win Gold</h3>
          <p className="text-[11px] text-amber-200/30 leading-tight">
            Wager gold, win double the stake
          </p>
        </div>
      </div>
    </div>
  );
}
