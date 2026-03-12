"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyWallet } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function WalletBadge() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getMyWallet,
  });

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg">
      <span className="text-amber-500 text-sm">&#9733;</span>
      <span className="text-amber-200 text-sm font-bold tabular-nums">
        {isLoading ? "..." : (data?.balanceGold ?? 0).toLocaleString()}
      </span>
      <span className="text-amber-200/40 text-xs">Gold</span>
    </div>
  );
}
