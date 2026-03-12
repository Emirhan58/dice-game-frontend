import { Client, IMessage } from "@stomp/stompjs";
import type { GameEvent } from "@/types/api";

let stompClient: Client | null = null;

export interface GameConnection {
  disconnect: () => void;
  publishSelections: (slots: number[]) => void;
}

export function connectToGame(
  gameId: number,
  onEvent: (event: GameEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
  onOpponentSelection?: (slots: number[]) => void
): GameConnection {
  // Connect directly to the backend for WebSocket (browsers don't enforce CORS on WS).
  // If NEXT_PUBLIC_WS_URL is set, use it; otherwise auto-detect from current hostname + backend port.
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "8080";
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    || `${wsProtocol}//${window.location.hostname}:${backendPort}`;

  const selectionTopic = `/topic/games/${gameId}/selections`;

  const client = new Client({
    brokerURL: `${wsUrl}/ws`,
    reconnectDelay: 5000,
    onConnect: () => {
      console.log(`[WS] Connected to game ${gameId}`);
      onConnectionChange?.(true);

      // Subscribe to game events
      client.subscribe(`/topic/games/${gameId}`, (message: IMessage) => {
        const event: GameEvent = JSON.parse(message.body);
        onEvent(event);
      });

      // Subscribe to selection broadcasts
      if (onOpponentSelection) {
        client.subscribe(selectionTopic, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body) as { seat: number; slots: number[] };
            onOpponentSelection(data.slots);
          } catch {
            // ignore malformed messages
          }
        });
      }
    },
    onDisconnect: () => {
      console.log(`[WS] Disconnected from game ${gameId}`);
      onConnectionChange?.(false);
    },
    onStompError: (frame) => {
      console.warn("[WS] STOMP error:", frame.headers["message"]);
      onConnectionChange?.(false);
    },
    onWebSocketError: () => {
      console.warn("[WS] WebSocket unavailable — falling back to polling");
      onConnectionChange?.(false);
    },
  });

  client.activate();
  stompClient = client;

  const publishSelections = (slots: number[]) => {
    if (client.connected) {
      client.publish({
        destination: selectionTopic,
        body: JSON.stringify({ slots }),
      });
    }
  };

  const disconnect = () => {
    client.deactivate();
    stompClient = null;
  };

  return { disconnect, publishSelections };
}

export function getStompClient(): Client | null {
  return stompClient;
}
