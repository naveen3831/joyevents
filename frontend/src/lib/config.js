// Resolve the backend API base URL.
//
// Priority:
//  1. VITE_API_URL build-time env var  →  use as-is (always wins)
//  2. Default (local dev & production) →  use empty string so all /api, /ws, and /uploads calls
//     are relative to current origin:
//     - In local dev: Vite dev server proxy routes /api/*, /uploads/*, /ws to BACKEND_URL (defaults to https://joyevents.speshway.site)
//     - In production: Nginx / reverse proxy routes /api/* to backend
const envUrl = import.meta.env?.VITE_API_URL || "";
function resolveApiUrl() {
    // Explicit override always wins
    if (envUrl)
        return envUrl;
    // In browser, relative URL "" allows Vite dev proxy or Nginx production proxy
    // to route all requests seamlessly without CORS issues or port conflicts
    return "";
}
export const API_URL = resolveApiUrl();

