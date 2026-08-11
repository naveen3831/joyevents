import { API_URL } from "./config";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

function getRealtimeUrl(token) {
  const base = API_URL || window.location.origin;
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

export function createRealtimeClient({ token, onMessage, onStatus }) {
  let socket = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let closedByClient = false;

  const setStatus = (status) => onStatus?.(status);

  const clearReconnect = () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (closedByClient || !token) return;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    clearReconnect();
    reconnectTimer = window.setTimeout(connect, delay);
  };

  function connect() {
    if (!token) return;
    clearReconnect();
    setStatus("connecting");

    socket = new WebSocket(getRealtimeUrl(token));

    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      setStatus("open");
    });

    socket.addEventListener("message", (event) => {
      try {
        onMessage?.(JSON.parse(event.data));
      } catch {
        // Ignore malformed server frames.
      }
    });

    socket.addEventListener("close", () => {
      setStatus("closed");
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      setStatus("error");
      socket?.close();
    });
  }

  connect();

  return {
    close() {
      closedByClient = true;
      clearReconnect();
      socket?.close();
    },
  };
}
