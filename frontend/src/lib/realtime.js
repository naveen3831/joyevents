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

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch (e) {}
      socket = null;
    }

    const ws = new WebSocket(getRealtimeUrl(token));
    socket = ws;

    ws.onopen = () => {
      reconnectAttempt = 0;
      setStatus("open");
    };

    ws.onmessage = (event) => {
      try {
        onMessage?.(JSON.parse(event.data));
      } catch {
        // Ignore malformed server frames.
      }
    };

    ws.onclose = () => {
      setStatus("closed");
      scheduleReconnect();
    };

    ws.onerror = () => {
      setStatus("error");
      try {
        ws.close();
      } catch (e) {}
    };
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
