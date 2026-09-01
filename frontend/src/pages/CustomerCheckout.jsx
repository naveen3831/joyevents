import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency, formatTime12 } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import CustomerLayout from "@/components/CustomerLayout";
import SimplePayment from "@/components/SimplePayment";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Ticket, 
  Calendar, 
  MapPin, 
  Lock, 
  Sparkles,
  ShoppingBag,
  CreditCard
} from "lucide-react";

const imgSrc = (image) => (!image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`);

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { clearCart } = useCart();

  // Load checkout state from router navigation state OR session storage fallback
  const stateData = location.state || {};
  const [checkoutData] = useState(() => {
    if (stateData.bookingData) {
      sessionStorage.setItem("pendingCheckoutData", JSON.stringify(stateData));
      return stateData;
    }
    const saved = sessionStorage.getItem("pendingCheckoutData");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    if (!token) {
      toast.error("Please login to proceed with checkout");
      navigate("/login");
    }
  }, [token, navigate]);

  if (!checkoutData || (!checkoutData.bookingData && !checkoutData.bookingId)) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Active Checkout Session</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your checkout session is empty or has expired. Please select an event or service to proceed with payment.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/customer-dashboard/cart")}
              className="bg-primary text-primary-foreground font-semibold rounded-xl"
            >
              View Cart
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/customer-dashboard/browse-events")}
              className="rounded-xl"
            >
              Browse Events
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const { bookingData = {}, amount = 0, bookingId, isCustomPay, serviceItems = [] } = checkoutData;
  const eventName = bookingData.eventName || bookingData.serviceName || bookingData.title || "Event Booking";
  const displayImage = bookingData.image || bookingData.event?.image || "";
  
  // Format Event Date & Time cleanly
  const formattedDateTime = (() => {
    if (bookingData.datetime) {
      const dt = new Date(bookingData.datetime);
      if (!isNaN(dt.getTime())) {
        const d = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const t = dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
        return `${d} • ${t}`;
      }
    }
    if (bookingData.date) {
      const d = new Date(bookingData.date + "T00:00:00");
      const dStr = !isNaN(d.getTime()) 
        ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) 
        : bookingData.date;
      const tStr = bookingData.time ? formatTime12(bookingData.time) : "";
      return tStr ? `${dStr} • ${tStr}` : dStr;
    }
    return "Date TBA";
  })();

  const locationText = bookingData.customerLocation?.address || bookingData.location || bookingData.event?.location || "Venue TBA";

  // Parse tickets breakdown cleanly
  const ticketEntries = (() => {
    if (bookingData.selectedTickets && Object.keys(bookingData.selectedTickets).length > 0) {
      return Object.entries(bookingData.selectedTickets)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([tier, qty]) => {
          const count = Number(qty);
          const unitPrice = count > 0 ? Math.round(amount / count) : amount;
          return {
            name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Pass`,
            quantity: count,
            unitPrice: unitPrice
          };
        });
    }
    if (bookingData.ticketType) {
      const count = Number(bookingData.quantity) || 1;
      const unitPrice = count > 0 ? Math.round(amount / count) : amount;
      return [{
        name: `${bookingData.ticketType.charAt(0).toUpperCase() + bookingData.ticketType.slice(1)} Ticket`,
        quantity: count,
        unitPrice: unitPrice
      }];
    }
    return [{
      name: "Event Pass",
      quantity: 1,
      unitPrice: amount
    }];
  })();

  // HTML Ticket Downloader helper
  const downloadTicket = (paidBooking) => {
    const targetBooking = paidBooking || bookingData;
    const ticketId = targetBooking?.ticketId || `TKT-${targetBooking?._id?.slice(-8).toUpperCase() || 'PASS'}`;
    const eventTitle = targetBooking?.event?.title || targetBooking?.eventName || targetBooking?.serviceName || eventName;
    const dateFormatted = targetBooking?.datetime 
      ? new Date(targetBooking.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : (bookingData.date || "N/A");
    const timeFormatted = targetBooking?.datetime 
      ? new Date(targetBooking.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : (bookingData.time || "N/A");
    const pricePaid = formatCurrency(targetBooking?.price || amount || 0);
    const customerName = user?.name || "Customer";
    const bgImage = targetBooking?.event?.image ? imgSrc(targetBooking.event.image) : '';
    const qrData = encodeURIComponent(`${ticketId}|${eventTitle}|${targetBooking?.price || amount}`);

    const ticketHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${eventTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Roboto, sans-serif; background: #0f172a; padding: 20px; color: #fff; display: flex; justify-content: center; }
    .ticket { width: 100%; max-width: 500px; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .ticket-header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 20px; text-align: center; }
    .ticket-header h1 { font-size: 24px; font-weight: 800; letter-spacing: 1px; }
    .ticket-header p { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    ${bgImage ? `.event-image { width: 100%; height: 200px; object-fit: cover; }` : ''}
    .ticket-body { padding: 20px; }
    .event-name { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #334155; border-radius: 10px; margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #94a3b8; }
    .info-value { color: #f8fafc; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 16px; background: #10b981; color: white; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
    .footer { background: #0f172a; padding: 20px; text-align: center; border-top: 2px dashed #334155; }
    .ticket-id { font-family: monospace; font-size: 18px; font-weight: 700; color: #a855f7; letter-spacing: 2px; margin-top: 6px; }
    .qr-img { width: 150px; height: 150px; border-radius: 12px; padding: 8px; background: white; margin: 12px auto; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 OFFICIAL EVENT TICKET</h1>
      <p>EVENTOZA CONFIRMED PASS</p>
    </div>
    ${bgImage ? `<img src="${bgImage}" class="event-image" alt="Event Cover"/>` : ''}
    <div class="ticket-body">
      <div class="event-name">${eventTitle}</div>
      <div class="info-row"><span class="info-label">👤 Attendee</span><span class="info-value">${customerName}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${dateFormatted}</span></div>
      <div class="info-row"><span class="info-label">⏰ Time</span><span class="info-value">${timeFormatted}</span></div>
      <div class="info-row"><span class="info-label">📍 Venue</span><span class="info-value">${locationText}</span></div>
      <div class="info-row"><span class="info-label">💳 Amount Paid</span><span class="info-value">${pricePaid}</span></div>
      <div style="text-align: center;">
        <span class="badge">✓ CONFIRMED PASS</span>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 11px; color: #94a3b8;">TICKET VERIFICATION CODE</div>
      <div class="ticket-id">${ticketId}</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}" class="qr-img" alt="QR Code"/>
      <p style="font-size: 11px; color: #64748b;">Show this QR code at event entry</p>
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([ticketHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket_${ticketId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePaymentSuccess = async (paidBooking) => {
    sessionStorage.removeItem("pendingCheckoutData");
    clearCart();
    toast.success("✨ Payment successful! Booking confirmed & ticket downloaded.");

    try {
      downloadTicket(paidBooking);
    } catch (e) {
      console.error("Ticket download error:", e);
    }

    // Submit remaining service items if any existed in cart
    if (serviceItems && serviceItems.length > 0) {
      try {
        for (const item of serviceItems) {
          const payload = {
            serviceName: item.name,
            serviceId: item.itemId,
            price: item.price,
            date: item.date,
            time: item.time,
            isEvent: false,
            status: "pending_approval",
            paymentStatus: "pending",
            customerLocation: item.details?.customerLocation || null,
            addOns: item.details?.addOns || [],
            guestCount: item.details?.guestCount || 0
          };
          await fetch(`${API_URL}/api/bookings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
        }
      } catch (err) {}
    }

    navigate("/customer-dashboard/bookings");
  };

  return (
    <CustomerLayout>
      <div className="w-full max-w-5xl mx-auto pt-2 pb-12 px-2 sm:px-4">
        
        {/* Back navigation + Page Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/customer-dashboard/cart")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Cart
          </button>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Checkout & Payment
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Complete your payment details below to instantly confirm your booking.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column SaaS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: ORDER SUMMARY (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" /> Order Summary
                </h2>
              </div>

              {/* Event Info */}
              <div className="flex gap-3.5 items-start">
                {imgSrc(displayImage) ? (
                  <img
                    src={imgSrc(displayImage)}
                    alt={eventName}
                    className="w-16 h-16 rounded-xl object-cover border border-border shrink-0 bg-secondary"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-7 w-7" />
                  </div>
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-bold text-base text-foreground line-clamp-2 leading-tight">
                    {eventName}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{formattedDateTime}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{locationText}</span>
                  </p>
                </div>
              </div>

              {/* Selected Ticket Clean List */}
              <div className="border-t border-border pt-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Selected Ticket
                </span>
                {ticketEntries.map((ticket, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                      <span>{ticket.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">×{ticket.quantity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(ticket.unitPrice)} each
                    </p>
                  </div>
                ))}
              </div>

              {/* Seat numbers if any */}
              {bookingData.seatNumbers && bookingData.seatNumbers.length > 0 && (
                <div className="border-t border-border pt-3 text-xs flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Assigned Seats:</span>
                  <span className="font-mono font-bold text-primary">{bookingData.seatNumbers.join(", ")}</span>
                </div>
              )}

              {/* Promo code savings */}
              {bookingData.promoCode && (
                <div className="border-t border-border pt-3 text-xs flex justify-between items-center text-emerald-500 font-semibold">
                  <span>Promo Savings ({bookingData.promoCode.code})</span>
                  <span>-{formatCurrency(bookingData.promoCode.discountAmount || 0)}</span>
                </div>
              )}

              {/* Amount Breakdown */}
              <div className="border-t border-border pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatCurrency(bookingData.originalAmount || amount)}</span>
                </div>

                {bookingData.discount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-medium">
                    <span>Discount</span>
                    <span>-{formatCurrency(bookingData.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-3 border-t border-border font-bold">
                  <span className="text-foreground">Total Due</span>
                  <span className="text-2xl font-display font-black text-primary">
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>

            </div>

            {/* 100% Guaranteed Booking Card (Secondary) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center gap-2.5 text-muted-foreground">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-[11px] leading-snug">
                <span className="font-semibold text-foreground">100% Guaranteed Booking.</span> Instant QR pass generation upon payment.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: PAYMENT ONLY (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5">
              
              {/* Payment Header with subtle SSL security indicator */}
              <div className="flex items-start justify-between border-b border-border pb-4 gap-2">
                <div>
                  <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Select Payment Method
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pay securely using your preferred payment method.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" /> 256-Bit SSL
                </span>
              </div>

              {/* Embedded Payment logic with hideSummary=true and hideCancel=true */}
              <SimplePayment
                amount={amount}
                bookingId={bookingId}
                isCustomPay={isCustomPay}
                bookingData={bookingData}
                hideSummary={true}
                hideCancel={true}
                onSuccess={handlePaymentSuccess}
                onError={(err) => toast.error(err || "Payment failed")}
              />
            </div>
          </div>

        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerCheckout;
