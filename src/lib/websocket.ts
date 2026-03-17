import { Client, IMessage } from "@stomp/stompjs";
import type { GameEvent } from "@/types/api";

let stompClient: Client | null = null;

export interface GameConnection {
  disconnect: () => void;
}

export function connectToGame(
  gameId: number,
  onEvent: (event: GameEvent) => void,
  onConnectionChange?: (connected: boolean) => void
): GameConnection {
  // Connect directly to the backend for WebSocket (browsers don't enforce CORS on WS).
  // If NEXT_PUBLIC_WS_URL is set, use it; otherwise auto-detect from current hostname + backend port.
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "8080";
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    || `${wsProtocol}//${window.location.hostname}:${backendPort}`;

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  let reconnectAttempt = 0;

  const client = new Client({
    brokerURL: `${wsUrl}/ws`,
    reconnectDelay: 2000, // initial delay, overridden by backoff below
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    onConnect: () => {
      reconnectAttempt = 0; // reset backoff on successful connection
      console.log(`[WS] Connected to game ${gameId}`);
      onConnectionChange?.(true);

      // Subscribe to game events only.
      // Selection sync is handled entirely via HTTP relay (/api/selections).
      client.subscribe(`/topic/games/${gameId}`, (message: IMessage) => {
        const event: GameEvent = JSON.parse(message.body);
        onEvent(event);
      });
    },
    onDisconnect: () => {
      console.log(`[WS] Disconnected from game ${gameId}`);
      onConnectionChange?.(false);
    },
    onStompError: (frame) => {
      console.warn("[WS] STOMP error:", frame.headers["message"]);
    },
    onWebSocketError: () => {
      reconnectAttempt++;
      // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
      client.reconnectDelay = Math.min(2000 * Math.pow(2, reconnectAttempt), 30000);
      console.warn(`[WS] WebSocket error — reconnecting in ${client.reconnectDelay / 1000}s`);
      onConnectionChange?.(false);
    },
  });

  client.activate();
  stompClient = client;

  const disconnect = () => {
    client.deactivate();
    stompClient = null;
  };

  return { disconnect };
}

export function getStompClient(): Client | null {
  return stompClient;
}
