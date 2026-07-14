// Resolve the backend API base URL.
//
// Priority:
//  1. VITE_API_URL build-time env var  →  use as-is (always wins)
//  2. Running on localhost / 127.0.0.1 →  http://localhost:5000 (local dev)
//  3. Docker / production (custom domain, no VITE_API_URL set)
//     → use empty string so all /api calls are relative to the current origin.
//     Nginx reverse proxy routes /api/* → backend pool, / → frontend.
const envUrl = import.meta.env?.VITE_API_URL || "";
function resolveApiUrl() {
    // Explicit override always wins
    if (envUrl)
        return envUrl;
    try {
        const { hostname } = window.location;
        // Local development — backend runs separately on port 5000
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return "http://localhost:5000";
        }
        // Docker / production — Nginx sits in front and proxies:
        //   /api/*     → backend containers
        //   /health    → backend containers
        //   /uploads/* → backend containers
        //   /*         → frontend container
        // So API calls must be relative (no host/port prefix).
        return "";
    }
    catch {
        return "http://localhost:5000";
    }
}
export const API_URL = resolveApiUrl();
