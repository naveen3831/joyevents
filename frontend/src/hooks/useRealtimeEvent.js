import { useEffect } from "react";

/**
 * Custom hook to listen to real-time WebSocket events dispatched to the window
 * @param {string} eventName - e.g. "realtime:chat-message", "realtime:booking-update", "realtime:notification", "realtime:tickets-updated"
 * @param {Function} callback - Event handler receiving event.detail
 */
export function useRealtimeEvent(eventName, callback) {
  useEffect(() => {
    if (!eventName || typeof callback !== "function") return;

    const handler = (event) => {
      callback(event.detail);
    };

    window.addEventListener(eventName, handler);
    return () => {
      window.removeEventListener(eventName, handler);
    };
  }, [eventName, callback]);
}

export default useRealtimeEvent;
