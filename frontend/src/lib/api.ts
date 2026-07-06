import { API_URL } from "./config";
import {
  validateEmail,
  normalizeEmail,
  validateLoginForm,
  validateSignupForm,
  validateNewPasswordForm,
} from "./validation";

// Helper: build a URL that works whether API_URL is absolute ("https://example.com")
// or empty string (Docker/Nginx — relative paths, same origin).
function buildUrl(path: string): URL {
  const base = API_URL || window.location.origin;
  return new URL(path, base);
}

export async function apiRegister(params: { name: string; email: string; password: string; role: "customer" | "merchant" | "admin" }) {
  const err = validateSignupForm(params.email, params.password, { name: params.name });
  if (err) throw new Error(err);
  const role = params.role === "customer" ? "user" : params.role;
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: params.name, email: normalizeEmail(params.email), password: params.password, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Registration failed");
  }
  return res.json();
}

export async function apiCreateUser(params: { name: string; email: string; password: string; role?: string }, token: string) {
  const err = validateSignupForm(params.email, params.password, { name: params.name });
  if (err) throw new Error(err);
  const res = await fetch(`${API_URL}/api/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...params, email: normalizeEmail(params.email) })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create user");
  }
  return res.json();
}

export async function apiLogin(params: { email: string; password: string }) {
  const err = validateLoginForm(params.email, params.password);
  if (err) throw new Error(err);
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizeEmail(params.email), password: params.password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Login failed");
  }
  return res.json();
}

export async function apiCreateBooking(
  params: {
    serviceName?: string;
    eventName?: string;
    eventId?: string;
    price: number;
    date: string;
    time: string;
    isEvent?: boolean;
    customerLocation?: {
      address: string;
      latitude: number;
      longitude: number;
    }
  },
  token: string
) {

  const res = await fetch(`${API_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });


  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Booking failed");
  }

  const data = await res.json();
  return data;
}

export async function apiListBookings(status: string | undefined, token: string) {
  const url = buildUrl(`${API_URL}/api/bookings`);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load bookings");
  }
  return res.json();
}

export async function apiAssignBooking(id: string, params: { merchantEmail?: string; merchantId?: string }, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to assign booking");
  }
  return res.json();
}

export async function apiMyBookings(token: string) {
  const res = await fetch(`${API_URL}/api/bookings/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load my bookings");
  }
  return res.json();
}

export async function apiSubmitRating(bookingId: string, score: number, comment: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${bookingId}/rate`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ score, comment })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to submit rating");
  }
  return res.json();
}

export async function apiGetPublicReviews() {
  const res = await fetch(`${API_URL}/api/bookings/reviews/public`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function apiAssignedBookings(token: string) {
  const res = await fetch(`${API_URL}/api/bookings/assigned`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load assigned bookings");
  }
  return res.json();
}

export async function apiCompleteBooking(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/complete`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to complete booking");
  }
  return res.json();
}

export async function apiApproveBooking(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to approve booking");
  }
  const data = await res.json();
  return data;
}

export async function apiRejectBooking(id: string, reason: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/reject`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to reject booking");
  }
  const data = await res.json();
  return data;
}

export async function apiListEvents(token?: string) {
  const headers: HeadersInit = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const res = await fetch(`${API_URL}/api/events?t=${timestamp}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load events");
  }
  return res.json();
}

// Merchant: get only their own events
export async function apiListMyEvents(token: string) {
  const res = await fetch(`${API_URL}/api/events/my-events`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load your events");
  }
  return res.json();
}

// Debug function - temporary
export async function apiDebugEvents(token: string) {
  const res = await fetch(`${API_URL}/api/events/debug-events`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to debug events");
  }
  return res.json();
}

// Migration function - temporary
export async function apiAssignLegacyEvents(token: string) {
  const res = await fetch(`${API_URL}/api/events/assign-legacy-events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to assign legacy events");
  }
  return res.json();
}

// Migration function for services - temporary
export async function apiAssignLegacyServices(token: string) {
  const res = await fetch(`${API_URL}/api/services/assign-legacy-services`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to assign legacy services");
  }
  return res.json();
}

// Fix orphaned service bookings (match by name)
export async function apiFixServiceBookings(token: string) {
  const res = await fetch(`${API_URL}/api/bookings/fix-service-bookings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fix service bookings");
  }
  return res.json();
}

// Admin: Delete all admin-created events
export async function apiDeleteAdminEvents(token: string) {
  
  const res = await fetch(`${API_URL}/api/events/admin-events`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete admin events");
  }
  
  const result = await res.json();
  return result;
}

export async function apiCreateEvent(payload: { title: string; description?: string; date: string; time: string; location: string; price: number; category?: string; status?: string }, token: string) {
  const res = await fetch(`${API_URL}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create event");
  }
  return res.json();
}

export async function apiUpdateEvent(id: string, payload: Partial<{ title: string; description: string; date: string; time: string; location: string; price: number; category: string; status: string; isSuspended: boolean; isFeatured: boolean }>, token: string) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update event");
  }
  return res.json();
}

export async function apiSuspendEvent(id: string, isSuspended: boolean, token: string) {
  return apiUpdateEvent(id, { isSuspended }, token);
}

export async function apiCancelEvent(id: string, token: string) {
  return apiUpdateEvent(id, { status: "cancelled" }, token);
}

export async function apiFeatureEvent(id: string, isFeatured: boolean, token: string) {
  return apiUpdateEvent(id, { isFeatured }, token);
}

export async function apiListUsers(token: string) {
  const res = await fetch(`${API_URL}/api/auth/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to list users");
  }
  return res.json();
}

export async function apiUpdateUser(id: string, payload: Partial<{ name: string; email: string; role: string }>, token: string) {
  if (payload.email !== undefined) {
    const emailErr = validateEmail(payload.email);
    if (emailErr) throw new Error(emailErr);
    payload = { ...payload, email: normalizeEmail(payload.email) };
  }
  const res = await fetch(`${API_URL}/api/auth/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update user");
  }
  return res.json();
}

export async function apiBookingHistory(token: string) {
  const res = await fetch(`${API_URL}/api/bookings/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load booking history");
  }
  return res.json();
}

export async function apiChangePassword(params: { currentPassword: string; newPassword: string }, token: string) {
  const pwdErr = validateNewPasswordForm(params.newPassword);
  if (pwdErr) throw new Error(pwdErr);
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to change password");
  }
  return res.json();
}

// Notification APIs
export async function apiGetNotifications(token: string, params?: { limit?: number; status?: string }) {
  const url = buildUrl(`${API_URL}/api/notifications`);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch notifications");
  }
  return res.json();
}

export async function apiMarkNotificationAsRead(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to mark notification as read");
  }
  return res.json();
}

export async function apiMarkAllNotificationsAsRead(token: string) {
  const res = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to mark all as read");
  }
  return res.json();
}

export async function apiDeleteNotification(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/notifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete notification");
  }
  return res.json();
}

// Booking status update API
export async function apiUpdateBookingStatus(id: string, status: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update booking status");
  }
  return res.json();
}

export async function apiPayForBooking(id: string, params: { paymentMethod: string; paymentDetails: any }, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/pay`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to process payment");
  }
  return res.json();
}

// Admin: refund payment (simple status update)
export async function apiRefundPayment(id: string, reason: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${id}/refund`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to process refund");
  }
  return res.json();
}

// ── Events (with image) ─────────────────────────────────────────────────────

export async function apiCreateEventWithImage(formData: FormData, token: string) {
  const res = await fetch(`${API_URL}/api/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create event");
  }
  return res.json();
}

export async function apiUpdateEventWithImage(id: string, formData: FormData, token: string) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update event");
  }
  return res.json();
}

export async function apiDeleteEvent(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete event");
  }
  return res.json();
}

export async function apiUpdateTicketAvailability(eventId: string, ticketType: string, newAvailable: number, token: string) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/tickets/${ticketType}`, {
    method: "PATCH",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ available: newAvailable })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update ticket availability");
  }
  return res.json();
}

export async function apiGetEventById(id: string) {
  const headers: HeadersInit = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const res = await fetch(`${API_URL}/api/events/${id}?t=${timestamp}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load event");
  }
  return res.json();
}

// ── Services ────────────────────────────────────────────────────────────────

export async function apiListServices(token?: string) {
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}/api/services`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load services");
  }
  return res.json();
}

// Merchant: get only their own services
export async function apiListMyServices(token: string) {
  const res = await fetch(`${API_URL}/api/services/my-services`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load your services");
  }
  return res.json();
}

export async function apiCreateService(formData: FormData, token: string) {
  const res = await fetch(`${API_URL}/api/services`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create service");
  }
  return res.json();
}

export async function apiUpdateService(id: string, formData: FormData, token: string) {
  const res = await fetch(`${API_URL}/api/services/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update service");
  }
  return res.json();
}

export async function apiDeleteService(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/services/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete service");
  }
  return res.json();
}

export async function apiGetServiceById(id: string) {
  const res = await fetch(`${API_URL}/api/services/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load service");
  }
  return res.json();
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function apiDeleteUser(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/auth/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete user");
  }
  return res.json();
}

// Admin: Reset password for any user
export async function apiResetPassword(userId: string, newPassword: string, token: string) {
  const pwdErr = validateNewPasswordForm(newPassword);
  if (pwdErr) throw new Error(pwdErr);
  const res = await fetch(`${API_URL}/api/auth/admin/reset-password/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to reset password");
  }
  return res.json();
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function apiListCategories(type?: "event" | "service") {
  const url = buildUrl(`${API_URL}/api/categories`);
  if (type) url.searchParams.set("type", type);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load categories");
  }
  return res.json();
}

export async function apiCreateCategory(name: string, type: "event" | "service", token: string) {
  const res = await fetch(`${API_URL}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, type })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create category");
  }
  return res.json();
}

export async function apiDeleteCategory(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/categories/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete category");
  }
  return res.json();
}


// Admin: Process merchant payout
export async function apiProcessMerchantPayout(merchantId: string, totalAmount: number, bookingIds: string[], token: string) {
  const res = await fetch(`${API_URL}/api/bookings/${merchantId}/process-payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ totalAmount, bookingIds })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to process payout");
  }
  return res.json();
}


// Earnings APIs
export async function apiGetEarningsDashboard(token: string) {
  const res = await fetch(`${API_URL}/api/earnings/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch earnings data");
  }
  return res.json();
}

export async function apiRequestWithdrawal(amount: number, bankDetails: any, token: string) {
  const res = await fetch(`${API_URL}/api/earnings/withdrawal-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, bankDetails })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to request withdrawal");
  }
  return res.json();
}

export async function apiGetWithdrawals(token: string) {
  const res = await fetch(`${API_URL}/api/earnings/withdrawals`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch withdrawals");
  }
  return res.json();
}

export async function apiGetTransactions(token: string) {
  const res = await fetch(`${API_URL}/api/earnings/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch transactions");
  }
  return res.json();
}


// Marketing APIs
export async function apiCreatePromoCode(promoData: any, token: string) {
  const res = await fetch(`${API_URL}/api/marketing/promo-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(promoData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create promo code");
  }
  return res.json();
}

export async function apiGetAllPromoCodes() {
  const res = await fetch(`${API_URL}/api/marketing/all-promo-codes`);
  if (!res.ok) throw new Error("Failed to fetch promo codes");
  return res.json();
}

export async function apiGetPromoCodes(token: string) {
  const res = await fetch(`${API_URL}/api/marketing/promo-codes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch promo codes");
  }
  return res.json();
}

export async function apiUpdatePromoCode(id: string, updates: any, token: string) {
  const res = await fetch(`${API_URL}/api/marketing/promo-codes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update promo code");
  }
  return res.json();
}

export async function apiDeletePromoCode(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/marketing/promo-codes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete promo code");
  }
  return res.json();
}

export async function apiSendNotification(notificationData: any, token: string) {
  const res = await fetch(`${API_URL}/api/marketing/send-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(notificationData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to send notification");
  }
  return res.json();
}

export async function apiGetShareLink(eventId: string, token: string) {
  const res = await fetch(`${API_URL}/api/marketing/share-link/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to generate share link");
  }
  return res.json();
}

export async function apiGetMarketingStats(token: string) {
  const res = await fetch(`${API_URL}/api/marketing/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch marketing stats");
  }
  return res.json();
}

export async function apiValidatePromoCode(code: string, amount: number, eventId?: string, serviceId?: string, token?: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}/api/marketing/validate-promo`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code, amount, eventId, serviceId })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to validate promo code" }));
    throw new Error(err?.error || "Failed to validate promo code");
  }
  return res.json();
}

export async function apiTrackPromoUsage(promoCodeId: string, customerId: string, bookingId: string) {
  const res = await fetch(`${API_URL}/api/marketing/track-usage/${promoCodeId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, bookingId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to track promo usage");
  }
  return res.json();
}

// Withdrawal Management - Admin
export async function apiFetchWithdrawals(token: string) {
  const res = await fetch(`${API_URL}/api/earnings/admin/withdrawals`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch withdrawals");
  }
  return res.json();
}

export async function apiGetPendingWithdrawals(token: string) {
  const res = await fetch(`${API_URL}/api/earnings/admin/pending-withdrawals`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch pending withdrawals");
  }
  return res.json();
}

export async function apiGetAllWithdrawals(token: string, status?: string) {
  const url = buildUrl(`${API_URL}/api/earnings/admin/withdrawals`);
  if (status) {
    url.searchParams.append("status", status);
  }
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch withdrawals");
  }
  return res.json();
}

export async function apiApproveWithdrawal(withdrawalId: string, token: string) {
  const res = await fetch(`${API_URL}/api/earnings/withdrawal/${withdrawalId}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to approve withdrawal");
  }
  return res.json();
}

export async function apiCompleteWithdrawal(withdrawalId: string, transactionId: string, token: string) {
  const res = await fetch(`${API_URL}/api/earnings/withdrawal/${withdrawalId}/complete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transactionId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to complete withdrawal");
  }
  return res.json();
}

export async function apiRejectWithdrawal(withdrawalId: string, reason: string, token: string) {
  const res = await fetch(`${API_URL}/api/earnings/withdrawal/${withdrawalId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to reject withdrawal");
  }
  return res.json();
}


export async function apiGetEventAnalytics(token: string) {
  const res = await fetch(`${API_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Failed to fetch event analytics (${res.status})`);
  }
  
  return res.json();
}


export async function apiMarkTicketAsUsed(ticketId: string, token: string) {
  const res = await fetch(`${API_URL}/api/bookings/validate/${ticketId}/mark-used`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to mark ticket as used");
  }
  return res.json();
}

// ── Favorites ───────────────────────────────────────────────────────────────

export async function apiGetFavorites(token: string) {
  const res = await fetch(`${API_URL}/api/favorites`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load favorites");
  }
  return res.json();
}

export async function apiAddFavorite(eventId: string | null, serviceId: string | null, type: "event" | "service", token: string) {
  const res = await fetch(`${API_URL}/api/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventId, serviceId, type })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to add favorite");
  }
  return res.json();
}

export async function apiRemoveFavorite(favoriteId: string, token: string) {
  const res = await fetch(`${API_URL}/api/favorites/${favoriteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to remove favorite");
  }
  return res.json();
}

export async function apiCheckFavorite(type: "event" | "service", id: string, token: string) {
  const res = await fetch(`${API_URL}/api/favorites/check/${type}/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to check favorite");
  }
  return res.json();
}

// ── Platform Settings ────────────────────────────────────────────────────────

export interface AdminPreferences {
  emailNewUsers: boolean;
  flaggedEventAlerts: boolean;
  weeklyPlatformReport: boolean;
  merchantVerificationAlerts: boolean;
  twoFactorAuthentication: boolean;
  forcePasswordReset: boolean;
  ipWhitelist: boolean;
}

export async function apiGetPlatformSettings() {
  const res = await fetch(`${API_URL}/api/settings/platform`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json() as Promise<{ platformName: string; supportEmail: string; adminPreferences?: AdminPreferences }>;
}

export async function apiSavePlatformSettings(data: { platformName: string; supportEmail: string; adminPreferences?: AdminPreferences }, token: string) {
  if (data.supportEmail?.trim()) {
    const emailErr = validateEmail(data.supportEmail);
    if (emailErr) throw new Error(emailErr);
  }
  const res = await fetch(`${API_URL}/api/settings/platform`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...data,
      supportEmail: data.supportEmail?.trim() ? normalizeEmail(data.supportEmail) : "",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to save settings");
  }
  return res.json();
}

export async function apiGetCommissionRate() {
  const res = await fetch(`${API_URL}/api/settings/commission`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to fetch commission rate");
  }
  return res.json() as Promise<{ commissionRate: number }>;
}

export async function apiSaveCommissionRate(commissionRate: number, token: string) {
  const res = await fetch(`${API_URL}/api/settings/commission`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ commissionRate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to save commission rate");
  }
  return res.json();
}

// ── Password Reset ───────────────────────────────────────────────────────────

export async function apiForgotPassword(email: string, redirect?: string) {
  const emailErr = validateEmail(email);
  if (emailErr) throw new Error(emailErr);
  const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizeEmail(email), redirect }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to send reset email");
  }
  return res.json();
}

export async function apiResetPasswordWithToken(token: string, newPassword: string) {
  const pwdErr = validateNewPasswordForm(newPassword);
  if (pwdErr) throw new Error(pwdErr);
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to reset password");
  }
  return res.json();
}

// ── Contact / Inbox ──────────────────────────────────────────────────────────

export async function apiGetInbox(token: string) {
  const res = await fetch(`${API_URL}/api/contact/inbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch inbox");
  return res.json();
}

export async function apiMarkMessageRead(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/contact/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to mark as read");
  return res.json();
}

export async function apiDeleteMessage(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/contact/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete message");
  return res.json();
}

export async function apiReplyToMessage(id: string, text: string, token: string) {
  const res = await fetch(`${API_URL}/api/contact/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to send reply");
  return res.json();
}

export async function apiGetCustomerInbox(token: string) {
  const res = await fetch(`${API_URL}/api/contact/customer-inbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function apiCustomerReply(id: string, text: string, token: string) {
  const res = await fetch(`${API_URL}/api/contact/${id}/customer-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to send reply");
  return res.json();
}

// ── AI Recommendations ───────────────────────────────────────────────────────

export async function apiGetCustomerRecommendations(token: string) {
  const res = await fetch(`${API_URL}/api/recommendations/customer`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch recommendations");
  }
  return res.json();
}

export async function apiGetMerchantRecommendationStats(token: string) {
  const res = await fetch(`${API_URL}/api/recommendations/merchant`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch recommendation stats");
  }
  return res.json();
}

export async function apiGetAdminRecommendationData(token: string) {
  const res = await fetch(`${API_URL}/api/recommendations/admin`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to fetch admin recommendation data");
  }
  return res.json();
}
