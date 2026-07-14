// Booking state persistence — saves/restores booking intent across login redirects
const SERVICE_KEY = "pendingServiceBooking";
const EVENT_KEY = "pendingEventBooking";
// ── Service booking ──────────────────────────────────────────────────────────
export function savePendingServiceBooking(data) {
    try {
        localStorage.setItem(SERVICE_KEY, JSON.stringify(data));
    }
    catch { }
}
export function getPendingServiceBooking() {
    try {
        const raw = localStorage.getItem(SERVICE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function clearPendingServiceBooking() {
    localStorage.removeItem(SERVICE_KEY);
}
// ── Event booking ────────────────────────────────────────────────────────────
export function savePendingEventBooking(data) {
    try {
        localStorage.setItem(EVENT_KEY, JSON.stringify(data));
    }
    catch { }
}
export function getPendingEventBooking() {
    try {
        const raw = localStorage.getItem(EVENT_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function clearPendingEventBooking() {
    localStorage.removeItem(EVENT_KEY);
}
