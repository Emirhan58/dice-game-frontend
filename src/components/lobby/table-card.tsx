"use client";

import { useEffect, useState } from "react";
import type { TableResponse } from "@/types/api";

interface TableCardProps {
  table: TableResponse;
  onJoin: (tableId: number) => void;
  isOwner: boolean;
  joining: boolean;
}

const tierStyle: Record<string, { badge: string; icon: string }> = {
  TIN: { badge: "text-gray-400 border-gray-500/40 bg-gray-900/20", icon: "&#9671;" },
  SILVER: { badge: "text-gray-200 border-gray-300/40 bg-gray-800/20", icon: "&#9670;" },
  GOLD: { badge: "text-yellow-400 border-yellow-500/40 bg-yellow-900/20 drop-shadow-[0_0_4px_rgba(234,179,8,0.3)]", icon: "&#9733;" },
};

export function TableCard({ table, onJoin, isOwner, joining }: TableCardProps) {
  const [ownerOnline, setOwnerOnline] = useState<boolean | null>(null);

  // Poll owner presence for non-owner users
  useEffect(() => {
    if (isOwner) return;

    const check = () => {
      fetch(`/api/presence?tableId=${table.id}`)
        .then((r) => r.json())
        .then((data: { online: boolean }) => setOwnerOnline(data.online))
        .catch(() => {});
    };

    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [table.id, isOwner]);

  return (
    <div className="p-3 bg-[#2a1a0e]/60 border border-amber-900/25 rounded-lg hover:bg-[#2a1a0e]/80 transition-colors">
      {/* Top row: table name + waiting indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-200/80 text-sm font-bold">
            {isOwner ? "Your Table" : `Table #${table.id}`}
          </span>
          {/* Presence indicator */}
          {isOwner ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400/70">You are the host</span>
            </span>
          ) : ownerOnline === true ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400/70">Owner waiting</span>
            </span>
          ) : ownerOnline === false ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
              <span className="text-[10px] text-amber-200/40">Owner away</span>
            </span>
          ) : null}
        </div>

        {!isOwner && (
          <button
            onClick={() => onJoin(table.id)}
            disabled={joining}
            className="text-xs px-5 py-1.5 rounded bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/40 text-amber-100 font-bold hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? "Joining..." : "Sit Down"}
          </button>
        )}
        {isOwner && (
          <span className="text-[10px] text-amber-200/30 border border-amber-900/20 rounded px-2 py-0.5">
            Waiting...
          </span>
        )}
      </div>

      {/* Bottom row: details */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode */}
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
          table.mode === "BADGED"
            ? "text-amber-300 border-amber-600/40 bg-amber-900/20"
            : "text-amber-200/50 border-amber-900/30 bg-amber-900/10"
        }`}>
          {table.mode}
        </span>

        {/* Tier badge */}
        {table.badgeTier && tierStyle[table.badgeTier] && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${tierStyle[table.badgeTier].badge}`}
            dangerouslySetInnerHTML={{ __html: `${tierStyle[table.badgeTier].icon} ${table.badgeTier}` }}
          />
        )}

        {/* Stake */}
        <span className="flex items-center gap-1 text-xs">
          <span className="text-amber-500">&#9733;</span>
          <span className="text-amber-200 font-bold">{table.stakeGold} Gold</span>
        </span>

        {/* Divider */}
        <span className="text-amber-900/40">|</span>

        {/* Target */}
        <span className="text-[11px] text-amber-200/40">
          Target: <span className="text-amber-200/60 font-bold">{table.targetScore.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
