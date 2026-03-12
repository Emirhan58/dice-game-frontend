"use client";

import type { TableResponse } from "@/types/api";
import { TableCard } from "./table-card";

interface TableListProps {
  tables: TableResponse[];
  currentUserId: number | null;
  onJoin: (tableId: number) => void;
  joiningId: number | null;
}

export function TableList({ tables, currentUserId, onJoin, joiningId }: TableListProps) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-amber-200/30 text-sm">
        No tables available. Create one to start playing!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          onJoin={onJoin}
          isOwner={table.seat0UserId === currentUserId}
          joining={joiningId === table.id}
        />
      ))}
    </div>
  );
}
