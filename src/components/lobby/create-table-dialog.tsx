"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTable, ApiError } from "@/lib/api";
import type { TableMode, BadgeTier } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateTableDialogProps {
  onTableCreated?: (tableId: number) => void;
}

export function CreateTableDialog({ onTableCreated }: CreateTableDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TableMode>("UNBADGED");
  const [badgeTier, setBadgeTier] = useState<BadgeTier>("TIN");
  const [stakeGold, setStakeGold] = useState<number>(5);
  const queryClient = useQueryClient();
  const setUserId = useAuthStore((s) => s.setUserId);

  const mutation = useMutation({
    mutationFn: createTable,
    onSuccess: (data) => {
      // Save our userId from the response (seat0 = creator)
      if (data.seat0UserId) {
        setUserId(data.seat0UserId);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingTables });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      toast.success("Table created! Waiting for opponent...");
      onTableCreated?.(data.id);
      setOpen(false);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create table");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      mode,
      badgeTier: mode === "BADGED" ? badgeTier : null,
      stakeGold,
    });
  };

  const toggleBtn = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded border font-bold transition-all ${
      active
        ? "bg-amber-800/60 border-amber-600/50 text-amber-200"
        : "bg-transparent border-amber-900/30 text-amber-200/40 hover:text-amber-200/60 hover:border-amber-900/50"
    }`;

  const tierBtnColor: Record<BadgeTier, string> = {
    TIN: "text-gray-300 border-gray-500/40",
    SILVER: "text-gray-100 border-gray-300/40",
    GOLD: "text-yellow-400 border-yellow-500/40",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="text-sm px-4 py-2 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all" />
      }>
        Create Table
      </DialogTrigger>
      <DialogContent className="bg-[#1e140c] border-amber-900/30 text-amber-200">
        <DialogHeader>
          <DialogTitle className="font-medieval text-amber-400 text-lg">Create a New Table</DialogTitle>
          <DialogDescription className="text-amber-200/40 text-xs">
            Set your game mode and wager to create a table.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-amber-200/60 font-medium">Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleBtn(mode === "UNBADGED")}
                onClick={() => { setMode("UNBADGED"); setStakeGold(5); }}
              >
                Unbadged
              </button>
              <button
                type="button"
                className={toggleBtn(mode === "BADGED")}
                onClick={() => { setMode("BADGED"); setStakeGold(1); }}
              >
                Badged
              </button>
            </div>
          </div>

          {mode === "BADGED" && (
            <div className="space-y-2">
              <label className="text-xs text-amber-200/60 font-medium">Badge Tier</label>
              <div className="flex gap-2">
                {(["TIN", "SILVER", "GOLD"] as BadgeTier[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    className={`text-xs px-3 py-1.5 rounded border font-bold transition-all ${
                      badgeTier === tier
                        ? `bg-amber-900/30 ${tierBtnColor[tier]}`
                        : `bg-transparent border-amber-900/20 text-amber-200/30 hover:text-amber-200/50`
                    }`}
                    onClick={() => setBadgeTier(tier)}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-amber-200/60 font-medium">Stake (Gold)</label>
            {mode === "UNBADGED" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className={toggleBtn(stakeGold === 5)}
                  onClick={() => setStakeGold(5)}
                >
                  5 Gold
                </button>
                <button
                  type="button"
                  className={toggleBtn(stakeGold === 30)}
                  onClick={() => setStakeGold(30)}
                >
                  30 Gold
                </button>
              </div>
            ) : (
              <input
                type="number"
                min={1}
                value={stakeGold}
                onChange={(e) => setStakeGold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0d0705] border border-amber-900/40 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 transition-colors"
              />
            )}
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-2.5 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Creating..." : "Create Table"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
