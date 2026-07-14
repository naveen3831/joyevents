// Session management — ensures new tabs always require re-login.
//
// Problem: Chrome copies sessionStorage to new tabs opened from the same origin.
// Solution: On every page load, check if this is a "fresh" navigation (new tab /
// pasted URL) using the Navigation Timing API. If it is, clear sessionStorage so
// the user must log in again.
//
// navigation.type values:
//   "navigate"      — fresh load (new tab, pasted URL, typed URL)
//   "reload"        — F5 / Ctrl+R (same tab refresh — keep session)
//   "back_forward"  — browser back/forward (keep session)
//   "prerender"     — prerendered page
//
// NOTE: Behind a reverse proxy (Nginx/Docker), reloads can sometimes be
// reported as "navigate". We use a sessionStorage flag "tabInit" to
// distinguish a true new tab from a reload within the same tab.
export function initSession() {
    const nav = performance.getEntriesByType("navigation")[0];
    const navType = nav?.type ?? "navigate";
    // Keep session on explicit reload or back/forward
    if (navType === "reload" || navType === "back_forward") {
        return;
    }
    // "navigate" type — could be a new tab OR a proxy-masked reload.
    // Use a tab-scoped flag to tell them apart:
    // - If "tabInit" is NOT set, this is a genuine new tab → clear session.
    // - If "tabInit" IS set, this tab already ran initSession → it's a
    //   proxy-masked reload, keep the session.
    if (navType === "navigate") {
        if (!sessionStorage.getItem("tabInit")) {
            // Genuine new tab / fresh URL — clear session to force re-login
            sessionStorage.removeItem("sessionActive");
        }
        // Mark this tab as initialised regardless
        sessionStorage.setItem("tabInit", "1");
    }
}
export function setSessionActive() {
    sessionStorage.setItem("sessionActive", "1");
    sessionStorage.setItem("tabInit", "1");
}
export function clearSession() {
    sessionStorage.removeItem("sessionActive");
    sessionStorage.removeItem("tabInit");
}
export function isSessionActive() {
    return sessionStorage.getItem("sessionActive") === "1";
}
