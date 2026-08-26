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

function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  const cleanToken = token.trim();
  if (cleanToken === "" || cleanToken === "null" || cleanToken === "undefined") return true;

  try {
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return true;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload || !payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= payload.exp;
  } catch (e) {
    return true;
  }
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
    if (closedByClient || !token || isTokenExpired(token)) return;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    clearReconnect();
    reconnectTimer = window.setTimeout(connect, delay);
  };

  function connect() {
    if (isTokenExpired(token)) {
      setStatus("error");
      return;
    }
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

  if (isTokenExpired(token)) {
    setStatus("error");
    return { close() {} };
  }

  connect();

  return {
    close() {
      closedByClient = true;
      clearReconnect();
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
    },
  };
}
