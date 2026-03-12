const STORAGE_KEY = "activeGameIds";

export function getActiveGameIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addActiveGame(gameId: number): void {
  const ids = getActiveGameIds();
  if (!ids.includes(gameId)) {
    ids.push(gameId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

export function removeActiveGame(gameId: number): void {
  const ids = getActiveGameIds().filter((id) => id !== gameId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
