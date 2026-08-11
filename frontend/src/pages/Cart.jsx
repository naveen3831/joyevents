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

            setCreatedBookingForPayment(bookingDataObj);
            setPaymentAmount(eventsSubtotal);
            setPaymentModalOpen(true);
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
      {/* ... layout components ... */}
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Shopping Cart</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You have {cartItems.length} configured items in your cart
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-400 hover:text-red-300 min-h-[44px]">
              Clear All
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left - Cart items */}
            <div ref={itemsRef} className="flex-1 space-y-6">
              <AnimatePresence>
                {cartItems.map((item) => (<motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="relative flex flex-col md:flex-row rounded-2xl border border-border bg-card shadow-card overflow-hidden hover:border-primary/40 hover:shadow-elevated transition-all">
                    {/* Item Thumbnail */}
                    <div className="w-full md:w-72 xl:w-80 aspect-[16/10] md:aspect-[4/3] bg-secondary/60 dark:bg-secondary shrink-0 relative overflow-hidden border-b md:border-b-0 md:border-r border-border">
                      {imgSrc(item.image) ? (<img src={imgSrc(item.image)} alt={item.name} className="h-full w-full object-contain p-2"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh">
                          {item.type === "event" ? (<Calendar className="h-12 w-12 opacity-10"/>) : (<Briefcase className="h-12 w-12 opacity-10"/>)}
                        </div>)}
                      <span className={`absolute top-3 left-3 rounded-full text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-md ${item.type === "event" ? "bg-primary text-primary-foreground" : "bg-amber-500 text-black"}`}>
                        {item.type}
                      </span>
                    </div>

                    {/* Item Content */}
                    <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            {item.category && (<p className="text-[10px] text-primary uppercase font-bold tracking-wider mb-1">{item.category}</p>)}
                            <h3 className="font-semibold text-lg leading-snug">{item.name}</h3>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        </div>

                        {/* Configured details summary */}
                        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0"/>
                            <span>{new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {item.time}</span>
                          </div>

                          {/* Event Configuration details */}
                          {item.type === "event" && (<>
                              {item.details.selectedSession && (<div className="flex items-center gap-1.5">
                                  <span className="font-semibold shrink-0">Session:</span>
                                  <span className="capitalize">{item.details.selectedSession} Session</span>
                                </div>)}
                              {item.details.selectedTickets && Object.keys(item.details.selectedTickets).length > 0 && (<div className="flex items-start gap-1.5 mt-1 bg-secondary/50 rounded-lg p-2">
                                  <Ticket className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"/>
                                  <div>
                                    <span className="font-semibold block mb-0.5">Tickets:</span>
                                    {Object.entries(item.details.selectedTickets).filter(([_, qty]) => qty > 0).map(([type, qty]) => (<div key={type} className="capitalize">{type} Tier × {qty}</div>))}
                                  </div>
                                </div>)}
                              {item.details.selectedSeatNumbers && item.details.selectedSeatNumbers.length > 0 && (<div className="flex items-center gap-1.5 mt-1">
                                  <span className="font-semibold">Seats:</span>
                                  <span className="font-mono text-[10px] bg-secondary border px-1 rounded">{item.details.selectedSeatNumbers.join(", ")}</span>
                                </div>)}
                              {item.details.quantity && item.details.quantity > 1 && (<div>
                                  <span className="font-semibold">Quantity:</span> {item.details.quantity}
                                </div>)}
                            </>)}

                          {/* Service Configuration details */}
                          {item.type === "service" && (<>
                              {item.details.customerLocation && (<div className="flex items-start gap-1.5 mt-1 bg-secondary/50 rounded-lg p-2">
                                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"/>
                                  <div className="break-all">
                                    <span className="font-semibold block mb-0.5">Location:</span>
                                    {item.details.customerLocation.address}
                                  </div>
                                </div>)}
                              {item.details.addOns && item.details.addOns.length > 0 && (<div className="flex items-start gap-1.5 mt-1 bg-secondary/50 rounded-lg p-2">
                                  <Briefcase className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5"/>
                                  <div>
                                    <span className="font-semibold block mb-0.5">Selected Add-ons:</span>
                                    {item.details.addOns.map((add) => (<div key={add.name}>{add.name} (x{add.quantity})</div>))}
                                  </div>
                                </div>)}
                              {item.details.guestCount && item.details.guestCount > 0 && (<div>
                                  <span className="font-semibold">Guest Count:</span> {item.details.guestCount}
                                </div>)}
                            </>)}
                        </div>

                      </div>

                      {/* Item Pricing */}
                      <div className="border-t border-border mt-6 pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.appliedPromo && (<span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-mono">
                              <Percent className="h-3 w-3"/> {item.appliedPromo.code}
                            </span>)}
                        </div>
                        <div className="text-right">
                          {item.discountAmount > 0 && (<span className="text-xs text-muted-foreground line-through mr-2">
                              {formatCurrency(item.originalPrice)}
                            </span>)}
                          <span className="font-display font-bold text-lg text-primary">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>))}
              </AnimatePresence>
            </div>

            {/* Right - Checkout panel */}
            <div className="w-full lg:w-96">
              <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 shadow-xl space-y-6">
                <h3 className="font-semibold text-lg">Order Summary</h3>

                {/* Subtotals */}
                <div className="space-y-3 text-sm border-b border-border pb-6">
                  {eventItems.length > 0 && (<div className="flex justify-between">
                      <span className="text-muted-foreground">Events ({eventItems.length})</span>
                      <span>{formatCurrency(eventsSubtotal)}</span>
                    </div>)}
                  {serviceItems.length > 0 && (<div className="flex justify-between">
                      <span className="text-muted-foreground">Services ({serviceItems.length})</span>
                      <span>{formatCurrency(servicesSubtotal)}</span>
                    </div>)}
                  {totalDiscount > 0 && (<div className="flex justify-between text-green-500 font-medium">
                      <span>Promo Savings</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>)}
                </div>

                {/* Total / Checkout instructions */}
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-base">Grand Total</span>
                    <span className="font-display font-black text-2xl text-gradient">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>

                  {eventItems.length > 0 && serviceItems.length > 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Complete payment for your event items below. Service requests will be sent to providers for quotation.
                    </div>
                  )}

                  {eventItems.length > 0 && serviceItems.length === 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Proceed to payment to confirm your event booking and generate your digital ticket instantly.
                    </div>
                  )}

                  {serviceItems.length > 0 && eventItems.length === 0 && (
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Service requests do not require immediate payments. Vendors will review your requests and send quotations.
                    </div>
                  )}

                  <Button onClick={handleCheckoutClick} disabled={checkoutLoading} className="w-full h-12 text-base bg-gradient-primary hover:opacity-90 font-bold disabled:opacity-50">
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2"/> Processing…
                      </>
                    ) : eventItems.length > 0 ? (
                      "Proceed to Pay & Confirm"
                    ) : (
                      "Submit Booking Requests"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-display text-lg font-bold">Complete Event Payment</DialogTitle>
          </DialogHeader>
          {createdBookingForPayment && (
            <SimplePayment
              amount={paymentAmount}
              bookingData={createdBookingForPayment}
              onSuccess={async (paidBooking) => {
                setPaymentModalOpen(false);
                setCreatedBookingForPayment(null);
                clearCart();
                toast.success("✨ Payment successful! Booking confirmed & ticket downloaded.");
                try {
                  downloadTicket(paidBooking, user);
                } catch (e) {}
                if (serviceItems.length > 0) {
                  await submitServiceRequestsOnly();
                }
                navigate("/my-requests");
              }}
              onError={(err) => {
                toast.error(err || "Payment failed");
              }}
              onClose={() => setPaymentModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};
export default Cart;
