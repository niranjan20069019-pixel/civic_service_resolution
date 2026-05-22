import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Returns a socket instance; calls onIssueCreated / onIssueUpdated when events arrive
export function useSocket({ onIssueCreated, onIssueUpdated } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    if (onIssueCreated) socket.on("issue:created", onIssueCreated);
    if (onIssueUpdated) socket.on("issue:updated", onIssueUpdated);

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
