import PartySocket from "partysocket";
import { useEffect, useRef } from "react";

export type UserRoomNotification =
  | { type: "session_created"; sessionId: string; title: string | null }
  | { type: "session_updated"; sessionId: string; status: string }
  | { type: "message_added"; sessionId: string; messageSeq: number };

export function useUserRoom(
  accountId: string | null,
  onNotification: (notification: UserRoomNotification) => void,
) {
  const socketRef = useRef<PartySocket | null>(null);
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  useEffect(() => {
    if (!accountId) return;

    const socket = new PartySocket({
      host: window.location.host,
      party: "user-room",
      room: accountId,
    });

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as UserRoomNotification;
        callbackRef.current(data);
      } catch {
        // Ignore unparseable messages
      }
    };

    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [accountId]);
}
