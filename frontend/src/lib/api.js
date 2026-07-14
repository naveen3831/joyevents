import { API_URL } from "./config";
import { validateEmail, normalizeEmail, validateLoginForm, validateSignupForm, validateNewPasswordForm, } from "./validation";
// Helper: build a URL that works whether API_URL is absolute ("https://example.com")
// or empty string (Docker/Nginx — relative paths, same origin).
function buildUrl(path) {
    const base = API_URL || window.location.origin;
    return new URL(path, base);
}
export async function apiRegister(params) {
    const err = validateSignupForm(params.email, params.password, { name: params.name });
    if (err)
        throw new Error(err);
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
export async function apiCreateUser(params, token) {
    const err = validateSignupForm(params.email, params.password, { name: params.name });
    if (err)
        throw new Error(err);
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
export async function apiLogin(params) {
    const err = validateLoginForm(params.email, params.password);
    if (err)
        throw new Error(err);
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
export async function apiCreateBooking(params, token) {
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
export async function apiListBookings(status, token) {
    const url = buildUrl(`${API_URL}/api/bookings`);
    if (status)
        url.searchParams.set("status", status);
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load bookings");
    }
    return res.json();
}
export async function apiAssignBooking(id, params, token) {
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
export async function apiMyBookings(token) {
    const res = await fetch(`${API_URL}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load my bookings");
    }
    return res.json();
}
export async function apiSubmitRating(bookingId, score, comment, token) {
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
    if (!res.ok)
        throw new Error("Failed to fetch reviews");
    return res.json();
}
export async function apiAssignedBookings(token) {
    const res = await fetch(`${API_URL}/api/bookings/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load assigned bookings");
    }
    return res.json();
}
export async function apiCompleteBooking(id, token) {
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
export async function apiApproveBooking(id, token) {
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
export async function apiRejectBooking(id, reason, token) {
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
export async function apiListEvents(token) {
    const headers = {
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
export async function apiListMyEvents(token) {
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
export async function apiDebugEvents(token) {
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
export async function apiAssignLegacyEvents(token) {
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
export async function apiAssignLegacyServices(token) {
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
export async function apiFixServiceBookings(token) {
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
export async function apiDeleteAdminEvents(token) {
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
export async function apiCreateEvent(payload, token) {
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
export async function apiUpdateEvent(id, payload, token) {
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
export async function apiSuspendEvent(id, isSuspended, token) {
    return apiUpdateEvent(id, { isSuspended }, token);
}
export async function apiCancelEvent(id, token) {
    return apiUpdateEvent(id, { status: "cancelled" }, token);
}
export async function apiFeatureEvent(id, isFeatured, token) {
    return apiUpdateEvent(id, { isFeatured }, token);
}
export async function apiListUsers(token) {
    const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to list users");
    }
    return res.json();
}
export async function apiUpdateUser(id, payload, token) {
    if (payload.email !== undefined) {
        const emailErr = validateEmail(payload.email);
        if (emailErr)
            throw new Error(emailErr);
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
export async function apiBookingHistory(token) {
    const res = await fetch(`${API_URL}/api/bookings/history`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load booking history");
    }
    return res.json();
}
export async function apiChangePassword(params, token) {
    const pwdErr = validateNewPasswordForm(params.newPassword);
    if (pwdErr)
        throw new Error(pwdErr);
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
export async function apiGetNotifications(token, params) {
    const url = buildUrl(`${API_URL}/api/notifications`);
    if (params?.limit)
        url.searchParams.set("limit", params.limit.toString());
    if (params?.status)
        url.searchParams.set("status", params.status);
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch notifications");
    }
    return res.json();
}
export async function apiMarkNotificationAsRead(id, token) {
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
export async function apiMarkAllNotificationsAsRead(token) {
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
export async function apiDeleteNotification(id, token) {
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
export async function apiUpdateBookingStatus(id, status, token) {
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
export async function apiPayForBooking(id, params, token) {
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
export async function apiRefundPayment(id, reason, token) {
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
export async function apiCreateEventWithImage(formData, token) {
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
export async function apiUpdateEventWithImage(id, formData, token) {
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
export async function apiDeleteEvent(id, token) {
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
export async function apiUpdateTicketAvailability(eventId, ticketType, newAvailable, token) {
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
export async function apiGetEventById(id) {
    const headers = {
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
export async function apiListServices(token) {
    const headers = {};
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
export async function apiListMyServices(token) {
    const res = await fetch(`${API_URL}/api/services/my-services`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load your services");
    }
    return res.json();
}
export async function apiCreateService(formData, token) {
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
export async function apiUpdateService(id, formData, token) {
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
export async function apiDeleteService(id, token) {
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
export async function apiGetServiceById(id) {
    const res = await fetch(`${API_URL}/api/services/${id}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load service");
    }
    return res.json();
}
// ── Users ───────────────────────────────────────────────────────────────────
export async function apiDeleteUser(id, token) {
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
export async function apiResetPassword(userId, newPassword, token) {
    const pwdErr = validateNewPasswordForm(newPassword);
    if (pwdErr)
        throw new Error(pwdErr);
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
export async function apiListCategories(type) {
    const url = buildUrl(`${API_URL}/api/categories`);
    if (type)
        url.searchParams.set("type", type);
    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load categories");
    }
    return res.json();
}
export async function apiCreateCategory(name, type, token) {
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
export async function apiDeleteCategory(id, token) {
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
export async function apiProcessMerchantPayout(merchantId, totalAmount, bookingIds, token) {
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
export async function apiGetEarningsDashboard(token) {
    const res = await fetch(`${API_URL}/api/earnings/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch earnings data");
    }
    return res.json();
}
export async function apiRequestWithdrawal(amount, bankDetails, token) {
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
export async function apiGetWithdrawals(token) {
    const res = await fetch(`${API_URL}/api/earnings/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch withdrawals");
    }
    return res.json();
}
export async function apiGetTransactions(token) {
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
export async function apiCreatePromoCode(promoData, token) {
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
    if (!res.ok)
        throw new Error("Failed to fetch promo codes");
    return res.json();
}
export async function apiGetPromoCodes(token) {
    const res = await fetch(`${API_URL}/api/marketing/promo-codes`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch promo codes");
    }
    return res.json();
}
export async function apiUpdatePromoCode(id, updates, token) {
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
export async function apiDeletePromoCode(id, token) {
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
export async function apiSendNotification(notificationData, token) {
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
export async function apiGetShareLink(eventId, token) {
    const res = await fetch(`${API_URL}/api/marketing/share-link/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to generate share link");
    }
    return res.json();
}
export async function apiGetMarketingStats(token) {
    const res = await fetch(`${API_URL}/api/marketing/stats`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch marketing stats");
    }
    return res.json();
}
export async function apiValidatePromoCode(code, amount, eventId, serviceId, token) {
    const headers = { "Content-Type": "application/json" };
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
export async function apiTrackPromoUsage(promoCodeId, customerId, bookingId) {
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
export async function apiFetchWithdrawals(token) {
    const res = await fetch(`${API_URL}/api/earnings/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch withdrawals");
    }
    return res.json();
}
export async function apiGetPendingWithdrawals(token) {
    const res = await fetch(`${API_URL}/api/earnings/admin/pending-withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch pending withdrawals");
    }
    return res.json();
}
export async function apiGetAllWithdrawals(token, status) {
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
export async function apiApproveWithdrawal(withdrawalId, token) {
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
export async function apiCompleteWithdrawal(withdrawalId, transactionId, token) {
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
export async function apiRejectWithdrawal(withdrawalId, reason, token) {
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
export async function apiGetEventAnalytics(token) {
    const res = await fetch(`${API_URL}/api/analytics/events`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to fetch event analytics (${res.status})`);
    }
    return res.json();
}
export async function apiMarkTicketAsUsed(ticketId, token) {
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
export async function apiGetFavorites(token) {
    const res = await fetch(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load favorites");
    }
    return res.json();
}
export async function apiAddFavorite(eventId, serviceId, type, token) {
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
export async function apiRemoveFavorite(favoriteId, token) {
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
export async function apiCheckFavorite(type, id, token) {
    const res = await fetch(`${API_URL}/api/favorites/check/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to check favorite");
    }
    return res.json();
}
export async function apiGetPlatformSettings() {
    const res = await fetch(`${API_URL}/api/settings/platform`);
    if (!res.ok)
        throw new Error("Failed to fetch settings");
    return res.json();
}
export async function apiSavePlatformSettings(data, token) {
    if (data.supportEmail?.trim()) {
        const emailErr = validateEmail(data.supportEmail);
        if (emailErr)
            throw new Error(emailErr);
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
    return res.json();
}
export async function apiSaveCommissionRate(commissionRate, token) {
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
export async function apiForgotPassword(email, redirect) {
    const emailErr = validateEmail(email);
    if (emailErr)
        throw new Error(emailErr);
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
export async function apiResetPasswordWithToken(token, newPassword) {
    const pwdErr = validateNewPasswordForm(newPassword);
    if (pwdErr)
        throw new Error(pwdErr);
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
export async function apiGetInbox(token) {
    const res = await fetch(`${API_URL}/api/contact/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error("Failed to fetch inbox");
    return res.json();
}
export async function apiMarkMessageRead(id, token) {
    const res = await fetch(`${API_URL}/api/contact/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error("Failed to mark as read");
    return res.json();
}
export async function apiDeleteMessage(id, token) {
    const res = await fetch(`${API_URL}/api/contact/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error("Failed to delete message");
    return res.json();
}
export async function apiReplyToMessage(id, text, token) {
    const res = await fetch(`${API_URL}/api/contact/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
    });
    if (!res.ok)
        throw new Error("Failed to send reply");
    return res.json();
}
export async function apiGetCustomerInbox(token) {
    const res = await fetch(`${API_URL}/api/contact/customer-inbox`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error("Failed to fetch messages");
    return res.json();
}
export async function apiCustomerReply(id, text, token) {
    const res = await fetch(`${API_URL}/api/contact/${id}/customer-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
    });
    if (!res.ok)
        throw new Error("Failed to send reply");
    return res.json();
}
export async function apiSendContactUsToAdmin(params) {
    const res = await fetch(`${API_URL}/api/contact/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send contact inquiry to admin");
    }
    return res.json();
}
// ── AI Recommendations ───────────────────────────────────────────────────────
export async function apiGetCustomerRecommendations(token) {
    const res = await fetch(`${API_URL}/api/recommendations/customer`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch recommendations");
    }
    return res.json();
}
export async function apiGetMerchantRecommendationStats(token) {
    const res = await fetch(`${API_URL}/api/recommendations/merchant`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch recommendation stats");
    }
    return res.json();
}
export async function apiGetAdminRecommendationData(token) {
    const res = await fetch(`${API_URL}/api/recommendations/admin`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch admin recommendation data");
    }
    return res.json();
}
// ── Merchant Onboarding & Upgrades ──────────────────────────────────────────
export async function apiUpdateMerchantDetails(details, token) {
    const res = await fetch(`${API_URL}/api/merchant/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(details)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to submit merchant details");
    }
    return res.json();
}
export async function apiPayMerchantQuotation(paymentDetails, token) {
    const res = await fetch(`${API_URL}/api/merchant/pay-quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(paymentDetails)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to pay quotation");
    }
    return res.json();
}
export async function apiSendMerchantQuotation(merchantId, amount, token) {
    const res = await fetch(`${API_URL}/api/merchant/${merchantId}/quotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send quotation");
    }
    return res.json();
}
export async function apiActivateMerchant(merchantId, limits, token) {
    const res = await fetch(`${API_URL}/api/merchant/${merchantId}/activate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(limits)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to activate merchant");
    }
    return res.json();
}
export async function apiRaiseTicket(ticket, token) {
    const res = await fetch(`${API_URL}/api/merchant/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(ticket)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to raise ticket");
    }
    return res.json();
}
export async function apiGetTickets(token) {
    const res = await fetch(`${API_URL}/api/merchant/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch tickets");
    }
    return res.json();
}
export async function apiSendTicketQuotation(ticketId, amount, token) {
    const res = await fetch(`${API_URL}/api/merchant/tickets/${ticketId}/quotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send ticket quotation");
    }
    return res.json();
}
export async function apiPayTicketQuotation(ticketId, cardNumber, token) {
    const res = await fetch(`${API_URL}/api/merchant/tickets/${ticketId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardNumber })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to pay for ticket quotation");
    }
    return res.json();
}
export async function apiApproveTicket(ticketId, token) {
    const res = await fetch(`${API_URL}/api/merchant/tickets/${ticketId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to approve ticket");
    }
    return res.json();
}
export async function apiVerifyToken(token) {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Token verification failed");
    }
    return res.json();
}
export async function apiGetHomepageSettings() {
    const res = await fetch(`${API_URL}/api/settings/homepage`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load homepage settings");
    }
    return res.json();
}
export async function apiSaveHomepageSettings(settings, token) {
    const res = await fetch(`${API_URL}/api/settings/homepage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save homepage settings");
    }
    return res.json();
}
export async function apiRequestCancel(id, token) {
    const res = await fetch(`${API_URL}/api/bookings/${id}/request-cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to request cancellation");
    }
    return res.json();
}
export async function apiApproveCancel(id, cancellationFee, token) {
    const res = await fetch(`${API_URL}/api/bookings/${id}/approve-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellationFee })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to approve cancellation");
    }
    return res.json();
}
export async function apiRejectCancel(id, token) {
    const res = await fetch(`${API_URL}/api/bookings/${id}/reject-cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to reject cancellation");
    }
    return res.json();
}
export async function apiAcceptCancellationFee(id, token) {
    const res = await fetch(`${API_URL}/api/bookings/${id}/accept-cancellation-fee`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to accept cancellation fee");
    }
    return res.json();
}
export async function apiProcessRefund(id, token) {
    const res = await fetch(`${API_URL}/api/bookings/${id}/process-refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to process refund");
    }
    return res.json();
}
export async function apiWithdrawWallet(amount, paymentMethod, details, token) {
    const res = await fetch(`${API_URL}/api/auth/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, paymentMethod, details })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to withdraw wallet balance");
    }
    return res.json();
}
export async function apiAddWalletFunds(amount, paymentMethod, paymentDetails, token) {
    const res = await fetch(`${API_URL}/api/auth/add-wallet-funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, paymentMethod, paymentDetails })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add wallet funds");
    }
    return res.json();
}
