// Booking state persistence — saves/restores booking intent across login redirects

const SERVICE_KEY = "pendingServiceBooking";
const EVENT_KEY = "pendingEventBooking";

export interface PendingServiceBooking {
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  time: string;
  selectedAddOns: string[];
  customerAddress: string;
  customerLocation: { lat: number; lng: number } | null;
  promoCode: string;
  returnTo: string;
}

export interface PendingEventBooking {
  eventId: string;
  eventTitle: string;
  selectedTickets: Record<string, number>;
  selectedSession: "day" | "night" | null;
  fullServiceQty: number;
  promoCode: string;
  returnTo: string;
}

// ── Service booking ──────────────────────────────────────────────────────────

export function savePendingServiceBooking(data: PendingServiceBooking) {
  try {
    localStorage.setItem(SERVICE_KEY, JSON.stringify(data));
  } catch {}
}

export function getPendingServiceBooking(): PendingServiceBooking | null {
  try {
    const raw = localStorage.getItem(SERVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingServiceBooking() {
  localStorage.removeItem(SERVICE_KEY);
}

// ── Event booking ────────────────────────────────────────────────────────────

export function savePendingEventBooking(data: PendingEventBooking) {
  try {
    localStorage.setItem(EVENT_KEY, JSON.stringify(data));
  } catch {}
}

export function getPendingEventBooking(): PendingEventBooking | null {
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingEventBooking() {
  localStorage.removeItem(EVENT_KEY);
}
