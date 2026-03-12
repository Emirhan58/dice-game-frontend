// In-memory presence relay for waiting room.
// Owner heartbeats every 3s; expires after 10s of no heartbeat.

// tableId -> last heartbeat timestamp
const store = new Map<number, number>();

function cleanup() {
  const now = Date.now();
  for (const [tableId, ts] of store) {
    if (now - ts > 30_000) store.delete(tableId);
  }
}

// POST: heartbeat  { tableId }
export async function POST(request: Request) {
  const body = await request.json();
  const { tableId } = body as { tableId: number };

  if (tableId == null) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  store.set(tableId, Date.now());

  if (Math.random() < 0.1) cleanup();

  return Response.json({ ok: true });
}

// GET: check presence  ?tableId=1
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tableId = Number(url.searchParams.get("tableId"));

  if (isNaN(tableId)) {
    return Response.json({ online: false });
  }

  const ts = store.get(tableId);
  const online = ts != null && Date.now() - ts < 10_000;

  return Response.json({ online });
}

// DELETE: owner left  { tableId }
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const tableId = Number(url.searchParams.get("tableId"));

  if (!isNaN(tableId)) {
    store.delete(tableId);
  }

  return Response.json({ ok: true });
}
