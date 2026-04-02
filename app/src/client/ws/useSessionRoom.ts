import PartySocket from "partysocket";
import { useEffect, useRef } from "react";

export type SessionRoomMessage = {
  type: "message";
  id: string;
  seq: number;
  role: string;
  content: string;
  metadata?: string | null;
  createdAt: string;
};

type SessionRoomBatch = {
  type: "messages_batch";
  messages: SessionRoomMessage[];
};

type SessionRoomEvent = SessionRoomMessage | SessionRoomBatch;

export function useSessionRoom(
  sessionId: string | null,
  onMessage: (message: SessionRoomMessage) => void,
  onConnect?: () => void,
) {
  const socketRef = useRef<PartySocket | null>(null);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;

  useEffect(() => {
    if (!sessionId) return;

    const socket = new PartySocket({
      host: window.location.host,
      party: "session-room",
      room: sessionId,
    });

    socket.onopen = () => {
      console.log("[SessionRoom] WebSocket connected", sessionId);
      onConnectRef.current?.();
    };

    socket.onclose = (event) => {
      console.log(
        "[SessionRoom] WebSocket closed",
        sessionId,
        event.code,
        event.reason,
      );
    };

    socket.onerror = (event) => {
      console.error("[SessionRoom] WebSocket error", sessionId, event);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SessionRoomEvent;
        console.log("[SessionRoom] Event received", data.type);
        if (data.type === "message") {
          callbackRef.current(data);
        } else if (data.type === "messages_batch") {
          for (const msg of data.messages) {
            callbackRef.current({ ...msg, type: "message" });
          }
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId]);
}
