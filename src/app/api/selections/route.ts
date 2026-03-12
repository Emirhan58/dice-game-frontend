// Simple in-memory selection relay for real-time dice selection sharing.
// Stores the last selection per game+seat; auto-expires after 60 seconds.

type SelectionEntry = {
  seat: number;
  slots: number[];
  timestamp: number;
};

// gameId -> seat -> entry
const store = new Map<number, Map<number, SelectionEntry>>();

function cleanup() {
  const now = Date.now();
  for (const [gameId, seats] of store) {
    for (const [seat, entry] of seats) {
      if (now - entry.timestamp > 60_000) seats.delete(seat);
    }
    if (seats.size === 0) store.delete(gameId);
  }
}

// POST: publish selections  { gameId, seat, slots }
export async function POST(request: Request) {
  const body = await request.json();
  const { gameId, seat, slots } = body as { gameId: number; seat: number; slots: number[] };

  if (gameId == null || seat == null || !Array.isArray(slots)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!store.has(gameId)) store.set(gameId, new Map());
  store.get(gameId)!.set(seat, { seat, slots, timestamp: Date.now() });

  // Periodic cleanup
  if (Math.random() < 0.1) cleanup();

  return Response.json({ ok: true });
}

// GET: read opponent selections  ?gameId=1&mySeat=0
export async function GET(request: Request) {
  const url = new URL(request.url);
  const gameId = Number(url.searchParams.get("gameId"));
  const mySeat = Number(url.searchParams.get("mySeat"));

  if (isNaN(gameId) || isNaN(mySeat)) {
    return Response.json({ slots: [] });
  }

  const seats = store.get(gameId);
  if (!seats) return Response.json({ slots: [] });

  // Return the OTHER seat's selections
  const opponentSeat = mySeat === 0 ? 1 : 0;
  const entry = seats.get(opponentSeat);

  if (!entry || Date.now() - entry.timestamp > 30_000) {
    return Response.json({ slots: [] });
  }

  return Response.json({ slots: entry.slots });
}
