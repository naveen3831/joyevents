import { useEffect, useRef } from "react";

const DEFAULT_DEBOUNCE_MS = 150;

export function useRealtimeRefresh(resources, refresh, options = {}) {
  const refreshRef = useRef(refresh);
  const timerRef = useRef(null);
  const resourceSetRef = useRef(new Set(resources));
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    resourceSetRef.current = new Set(resources);
  }, [resources]);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        refreshRef.current?.();
      }, debounceMs);
    };

    const handleResourceChanged = (event) => {
      const resource = event.detail?.resource;
      if (!resource || !resourceSetRef.current.has(resource)) return;
      scheduleRefresh();
    };

    const handleNotification = () => {
      if (!resourceSetRef.current.has("notifications")) return;
      scheduleRefresh();
    };

    window.addEventListener("realtime:resource-changed", handleResourceChanged);
    window.addEventListener("realtime:notification", handleNotification);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("realtime:resource-changed", handleResourceChanged);
      window.removeEventListener("realtime:notification", handleNotification);
    };
  }, [debounceMs]);
}
