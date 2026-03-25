import PartySocket from "partysocket";
import { useEffect, useRef } from "react";

export type SessionRoomMessage = {
  type: "message";
  id: string;
  seq: number;
  role: string;
  content: string;
  createdAt: string;
};

export function useSessionRoom(
  sessionId: string | null,
  onMessage: (message: SessionRoomMessage) => void,
) {
  const socketRef = useRef<PartySocket | null>(null);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!sessionId) return;

    const socket = new PartySocket({
      host: window.location.host,
      party: "session-room",
      room: sessionId,
    });

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SessionRoomMessage;
        if (data.type === "message") {
          callbackRef.current(data);
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
