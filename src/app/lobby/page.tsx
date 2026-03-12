"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWaitingTables, joinTable, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { AuthGuard } from "@/components/auth-guard";
import { WalletBadge } from "@/components/lobby/wallet-badge";
import { TableList } from "@/components/lobby/table-list";
import { CreateTableDialog } from "@/components/lobby/create-table-dialog";
import { MyTables } from "@/components/lobby/active-games";
import { addActiveGame } from "@/lib/active-games";
import { toast } from "sonner";

function LobbyContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const userId = useAuthStore((s) => s.userId);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: queryKeys.waitingTables,
    queryFn: getWaitingTables,
    refetchInterval: 5000,
  });

  // Split tables into mine (waiting) and others
  const { myWaitingTables, otherTables } = useMemo(() => {
    const mine = tables.filter((t) => t.seat0UserId === userId);
    const others = tables.filter((t) => t.seat0UserId !== userId);
    return { myWaitingTables: mine, otherTables: others };
  }, [tables, userId]);

  const handleTableCreated = (tableId: number) => {
    router.push(`/lobby/waiting/${tableId}`);
  };

  const joinMutation = useMutation({
    mutationFn: joinTable,
    onSuccess: (data) => {
      toast.success("Joined table! Game starting...");
      addActiveGame(data.gameId!);
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      router.push(`/game/${data.gameId}`);
    },
    onError: (err: Error) => {
      setJoiningId(null);
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to join table");
      }
    },
  });

  const handleJoin = (tableId: number) => {
    setJoiningId(tableId);
    joinMutation.mutate(tableId);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medieval text-2xl font-bold text-amber-400 tracking-wide">Dice Tables</h1>
          <p className="text-amber-200/40 text-xs mt-0.5">Find a table or create your own</p>
        </div>
        <div className="flex items-center gap-3">
          <WalletBadge />
          <CreateTableDialog onTableCreated={handleTableCreated} />
        </div>
      </div>

      {/* Your tables: waiting + active games */}
      <MyTables myWaitingTables={myWaitingTables} />

      {/* Other players' tables */}
      <div>
        <h2 className="font-medieval text-sm font-bold text-amber-400/60 tracking-wide mb-2">Available Tables</h2>
        {isLoading ? (
          <div className="text-center py-12 text-amber-200/30 text-sm">Loading tables...</div>
        ) : (
          <TableList
            tables={otherTables}
            currentUserId={userId}
            onJoin={handleJoin}
            joiningId={joiningId}
          />
        )}
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <AuthGuard>
      <LobbyContent />
    </AuthGuard>
  );
}
