// In-memory relay for bust dice data.
// The WS-connected device posts bust dice here when a BUST event arrives.
// The polling-only device fetches bust dice from here.

import type { RolledDieDto } from "@/types/api";

type BustEntry = {
  dice: RolledDieDto[];
  timestamp: number;
};

// gameId -> bust entry
const store = new Map<number, BustEntry>();

// POST: store bust dice  { gameId, dice }
export async function POST(request: Request) {
  const body = await request.json();
  const { gameId, dice } = body as { gameId: number; dice: RolledDieDto[] };

  if (gameId == null || !Array.isArray(dice)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  store.set(gameId, { dice, timestamp: Date.now() });

  // Cleanup old entries
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.timestamp > 30_000) store.delete(id);
  }

  return Response.json({ ok: true });
}

// GET: fetch bust dice  ?gameId=1
export async function GET(request: Request) {
  const url = new URL(request.url);
  const gameId = Number(url.searchParams.get("gameId"));

  if (isNaN(gameId)) {
    return Response.json({ dice: null });
  }

  const entry = store.get(gameId);

  // Only return if fresh (within 10 seconds)
  if (!entry || Date.now() - entry.timestamp > 10_000) {
    return Response.json({ dice: null });
  }

  return Response.json({ dice: entry.dice });
}
