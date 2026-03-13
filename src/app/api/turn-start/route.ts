// In-memory relay for turn timer synchronization.
// Stores the timestamp when a turn started so both players see the same countdown.

type TurnStartEntry = {
  activeSeat: number;
  startedAt: number; // Date.now() of the player who first detected the turn change
};

// gameId -> entry
const store = new Map<number, TurnStartEntry>();

function cleanup() {
  const now = Date.now();
  for (const [gameId, entry] of store) {
    // Remove entries older than 5 minutes (game is likely over)
    if (now - entry.startedAt > 300_000) store.delete(gameId);
  }
}

// POST: record turn start  { gameId, activeSeat, startedAt }
export async function POST(request: Request) {
  const body = await request.json();
  const { gameId, activeSeat, startedAt } = body as {
    gameId: number;
    activeSeat: number;
    startedAt: number;
  };

  if (gameId == null || activeSeat == null || startedAt == null) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = store.get(gameId);

  // Only update if this is a new turn (different activeSeat) or no entry exists
  if (!existing || existing.activeSeat !== activeSeat) {
    store.set(gameId, { activeSeat, startedAt });
  }

  // Periodic cleanup
  if (Math.random() < 0.1) cleanup();

  return Response.json({ ok: true });
}

// GET: read turn start time  ?gameId=1
export async function GET(request: Request) {
  const url = new URL(request.url);
  const gameId = Number(url.searchParams.get("gameId"));

  if (isNaN(gameId)) {
    return Response.json({ startedAt: null, activeSeat: null });
  }

  const entry = store.get(gameId);
  if (!entry) {
    return Response.json({ startedAt: null, activeSeat: null });
  }

  return Response.json({
    activeSeat: entry.activeSeat,
    startedAt: entry.startedAt,
  });
}
