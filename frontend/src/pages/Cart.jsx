import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Ticket, Calendar, Briefcase, MapPin, Loader2, ShoppingBag, Percent } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SimplePayment from "@/components/SimplePayment";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";

const Cart = () => {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [createdBookingForPayment, setCreatedBookingForPayment] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const itemsRef = useGsapStagger([cartItems.length]);

    // Group items by type
    const eventItems = cartItems.filter(item => item.type === "event");
    const serviceItems = cartItems.filter(item => item.type === "service");

    // Calculations
    const eventsSubtotal = eventItems.reduce((sum, item) => sum + item.price, 0);
    const servicesSubtotal = serviceItems.reduce((sum, item) => sum + item.price, 0);
    const totalDiscount = cartItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const grandTotal = eventsSubtotal + servicesSubtotal;

    const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

    const handleCheckoutClick = () => {
        if (cartItems.length === 0) return;
        
        if (eventItems.length > 0) {
            // Open payment modal immediately WITHOUT creating any booking in DB first!
            const firstEvent = eventItems[0];
            const bookingDataObj = {
                eventName: firstEvent.name,
                eventId: firstEvent.itemId,
                price: eventsSubtotal,
                date: firstEvent.date,
                time: firstEvent.time,
                selectedTickets: firstEvent.details?.selectedTickets || {},
                selectedSession: firstEvent.details?.selectedSession || "",
                seatNumbers: firstEvent.details?.selectedSeatNumbers || [],
                customerLocation: firstEvent.details?.customerLocation || null,
                promoCode: firstEvent.appliedPromo ? {
                    code: firstEvent.appliedPromo.code || "",
                    _id: firstEvent.appliedPromo._id || null,
                    promoCodeId: firstEvent.appliedPromo._id || null,
                    kind: firstEvent.appliedPromo.kind || "",
                    discountType: firstEvent.appliedPromo.discountType || "",
                    discountValue: firstEvent.appliedPromo.discountValue || 0,
                    discountAmount: firstEvent.discountAmount || 0,
                    originalPrice: firstEvent.originalPrice || firstEvent.price,
                    finalPrice: firstEvent.price
                } : undefined,
                originalAmount: firstEvent.originalPrice,
                discount: firstEvent.discountAmount
            };

            navigate("/customer-dashboard/checkout", {
                state: {
                    bookingData: bookingDataObj,
                    amount: eventsSubtotal,
                    serviceItems
                }
            });
        } else {
            // Only service items - submit request for vendor quote
            submitServiceRequestsOnly();
        }
    };

    const submitServiceRequestsOnly = async () => {
        setCheckoutLoading(true);
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
                const res = await fetch(`${API_URL}/api/bookings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error || `Failed to submit request for ${item.name}`);
                }
            }
            toast.success("Service enquiries submitted! Vendors will review and send quotes.");
            clearCart();
            navigate("/my-requests");
        } catch (err) {
            toast.error(err?.message || "Failed to submit service requests.");
        } finally {
            setCheckoutLoading(false);
        }
    };
    const downloadTicket = (booking, currentUser) => {
        const targetBooking = booking || createdBookingForPayment;
        const ticketId = targetBooking?.ticketId || `TKT-${targetBooking?._id?.slice(-8).toUpperCase() || 'PASS'}`;
        const eventTitle = targetBooking?.event?.title || targetBooking?.eventName || targetBooking?.serviceName || "Event Ticket";
        const eventDate = targetBooking?.datetime ? new Date(targetBooking.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : (targetBooking?.date || "N/A");
        const eventTime = targetBooking?.datetime ? new Date(targetBooking.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (targetBooking?.time || "N/A");
        const location = targetBooking?.event?.location || targetBooking?.customerLocation?.address || "Venue TBA";
        const pricePaid = formatCurrency(targetBooking?.price || paymentAmount || 0);
        const customerName = currentUser?.name || user?.name || "Customer";
        const eventImage = targetBooking?.event?.image ? (targetBooking.event.image.startsWith('http') ? targetBooking.event.image : `${API_URL}${targetBooking.event.image}`) : '';
        const qrData = encodeURIComponent(`${ticketId}|${eventTitle}|${targetBooking?.price || paymentAmount}`);

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
    ${eventImage ? `.event-image { width: 100%; height: 200px; object-fit: cover; }` : ''}
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
    ${eventImage ? `<img src="${eventImage}" class="event-image" alt="Event Cover"/>` : ''}
    <div class="ticket-body">
      <div class="event-name">${eventTitle}</div>
      <div class="info-row"><span class="info-label">👤 Attendee</span><span class="info-value">${customerName}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${eventDate}</span></div>
      <div class="info-row"><span class="info-label">⏰ Time</span><span class="info-value">${eventTime}</span></div>
      <div class="info-row"><span class="info-label">📍 Venue</span><span class="info-value">${location}</span></div>
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

    return (<CustomerLayout>
      <div className="w-full pt-1 sm:pt-2 pb-8">

        {/* ── Page Header ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Shopping Cart</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              You have {cartItems.length} configured {cartItems.length === 1 ? "item" : "items"} in your cart
            </p>
          </div>
          {cartItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-xs font-semibold h-8 px-3 rounded-lg">
              Clear All
            </Button>
          )}
        </div>

        {/* ── Empty State ───────────────────────────────── */}
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-5 rounded-full bg-secondary/60 mb-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h2 className="font-semibold text-lg text-foreground mb-1">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Looks like you haven't added anything yet. Browse events or services to get started.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline"
                className="rounded-xl h-10 px-5 text-sm font-semibold"
                onClick={() => navigate("/customer-dashboard/browse-events")}>
                Browse Events
              </Button>
              <Button
                className="rounded-xl h-10 px-5 text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                onClick={() => navigate("/customer-dashboard/browse-services")}>
                Browse Services
              </Button>
            </div>
          </div>
        ) : (
          /* ── Two-column checkout layout ─────────── */
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">

            {/* ════ LEFT – Cart items ═════════════════════ */}
            <div ref={itemsRef} className="min-w-0 w-full space-y-3">
              <AnimatePresence>
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="flex flex-col sm:flex-row rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    {/* ── Event / Service Image ─────────────── */}
                    <div className="w-full sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] aspect-video sm:aspect-auto sm:h-auto bg-secondary/60 dark:bg-secondary relative overflow-hidden border-b sm:border-b-0 sm:border-r border-border flex-shrink-0">
                      {imgSrc(item.image)
                        ? (<img src={imgSrc(item.image)} alt={item.name} className="h-full w-full object-cover"/>)
                        : (<div className="flex h-full items-center justify-center min-h-[120px] bg-gradient-mesh">
                            {item.type === "event" ? (<Calendar className="h-10 w-10 opacity-10"/>) : (<Briefcase className="h-10 w-10 opacity-10"/>)}
                          </div>)}
                      {/* Type badge */}
                      <span className={`absolute top-2.5 left-2.5 rounded-full text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 shadow ${item.type === "event" ? "bg-primary text-primary-foreground" : "bg-amber-500 text-black"}`}>
                        {item.type}
                      </span>
                    </div>

                    {/* ── Item info + Price/Delete ───────────── */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-3">

                        {/* Left: category + title + date + tickets */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {item.category && (
                            <p className="text-[10px] text-primary uppercase font-bold tracking-widest">{item.category}</p>
                          )}
                          <h3 className="font-semibold text-base leading-snug text-foreground truncate">{item.name}</h3>

                          {/* Date row */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0"/>
                            <span>
                              {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {item.time}
                            </span>
                          </div>

                          {/* ── Event-specific config ─────────── */}
                          {item.type === "event" && (<>
                            {item.details.selectedSession && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-semibold shrink-0">Session:</span>
                                <span className="capitalize">{item.details.selectedSession} Session</span>
                              </div>
                            )}
                            {item.details.selectedTickets && Object.keys(item.details.selectedTickets).length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <Ticket className="h-3.5 w-3.5 text-primary shrink-0"/>
                                {Object.entries(item.details.selectedTickets)
                                  .filter(([_, qty]) => qty > 0)
                                  .map(([type, qty]) => (
                                    <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                                      {type} Tier × {qty}
                                    </span>
                                  ))}
                              </div>
                            )}
                            {item.details.selectedSeatNumbers && item.details.selectedSeatNumbers.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-semibold">Seats:</span>
                                <span className="font-mono text-[10px] bg-secondary border px-1.5 py-0.5 rounded-md">{item.details.selectedSeatNumbers.join(", ")}</span>
                              </div>
                            )}
                            {item.details.quantity && item.details.quantity > 1 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold">Qty:</span> {item.details.quantity}
                              </div>
                            )}
                          </>)}

                          {/* ── Service-specific config ───────── */}
                          {item.type === "service" && (<>
                            {item.details.customerLocation && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"/>
                                <span className="break-all">{item.details.customerLocation.address}</span>
                              </div>
                            )}
                            {item.details.addOns && item.details.addOns.length > 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
                                <Briefcase className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"/>
                                <div>
                                  <span className="font-semibold block">Add-ons: </span>
                                  {item.details.addOns.map((add) => (<span key={add.name} className="mr-1">{add.name} (x{add.quantity})</span>))}
                                </div>
                              </div>
                            )}
                            {item.details.guestCount && item.details.guestCount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold">Guests:</span> {item.details.guestCount}
                              </div>
                            )}
                          </>)}
                        </div>

                        {/* Right: price + delete */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            {item.discountAmount > 0 && (
                              <span className="block text-xs text-muted-foreground line-through">{formatCurrency(item.originalPrice)}</span>
                            )}
                            <span className="font-display font-bold text-lg text-primary leading-none">{formatCurrency(item.price)}</span>
                          </div>
                          {item.appliedPromo && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-mono">
                              <Percent className="h-3 w-3"/> {item.appliedPromo.code}
                            </span>
                          )}
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-muted-foreground/50 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ════ RIGHT – Order Summary ═════════════════ */}
            <div className="min-w-0 w-full">
              <div className="sticky top-24 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-base text-foreground">Order Summary</h3>

                {/* Subtotals */}
                <div className="space-y-2 text-sm border-b border-border pb-4">
                  {eventItems.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Events ({eventItems.length})</span>
                      <span className="font-medium">{formatCurrency(eventsSubtotal)}</span>
                    </div>
                  )}
                  {serviceItems.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Services ({serviceItems.length})</span>
                      <span className="font-medium">{formatCurrency(servicesSubtotal)}</span>
                    </div>
                  )}
                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-500 font-medium">
                      <span>Promo Savings</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">Grand Total</span>
                  <span className="font-display font-black text-2xl text-gradient">{formatCurrency(grandTotal)}</span>
                </div>

                {/* Subtle helper text */}
                {eventItems.length > 0 && serviceItems.length === 0 && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed -mt-1">
                    Payment confirms your booking and generates your digital ticket.
                  </p>
                )}
                {eventItems.length > 0 && serviceItems.length > 0 && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed -mt-1">
                    Complete payment for events. Service requests will be sent to providers for quotation.
                  </p>
                )}
                {serviceItems.length > 0 && eventItems.length === 0 && (
                  <p className="text-[11px] text-amber-500/80 leading-relaxed -mt-1">
                    No immediate payment required. Providers will send quotations for your service requests.
                  </p>
                )}

                {/* CTA */}
                <Button
                  onClick={handleCheckoutClick}
                  disabled={checkoutLoading}
                  className="w-full h-12 text-sm font-bold bg-gradient-primary hover:opacity-90 disabled:opacity-50 rounded-xl"
                >
                  {checkoutLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2"/> Processing…</>
                  ) : eventItems.length > 0 ? (
                    "Proceed to Pay & Confirm"
                  ) : (
                    "Submit Booking Requests"
                  )}
                </Button>
              </div>
            </div>

          </div>
        )}
      </div>
    </CustomerLayout>
  );
};
export default Cart;


