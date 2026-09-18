import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Ticket, Calendar, Briefcase, MapPin, Loader2, ShoppingBag, Percent, ArrowRight, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import PageHeader from "@/components/PageHeader";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";

const Cart = () => {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { token } = useAuth();
    const navigate = useNavigate();
    const goBack = useBackNavigation("/customer-dashboard");
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

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === "N/A" || dateStr === "undefined") return null;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr === "N/A" || timeStr === "undefined") return null;
        return timeStr;
    };

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

    return (
        <CustomerLayout>
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4">

                {/* ── Page Header ─────────────────────────────── */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <PageHeader title="Shopping Cart" onBack={goBack} className="mb-0" />
                        {cartItems.length > 0 && (
                            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full">
                                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                            </span>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearCart}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs font-semibold h-8 px-3 rounded-xl transition-all border border-transparent hover:border-rose-200/50 dark:hover:border-rose-900/50"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Clear Cart
                        </Button>
                    )}
                </div>

                {/* ── Empty State ───────────────────────────────── */}
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center max-w-md mx-auto">
                        <div className="w-20 h-20 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border border-purple-100 dark:border-purple-900/50 shadow-inner mb-5 text-primary">
                            <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
                        </div>
                        <h2 className="font-bold text-2xl text-foreground mb-2 tracking-tight">Your cart is empty</h2>
                        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                            Discover events and services to start planning your next experience.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto rounded-xl h-11 px-6 text-sm font-semibold border-border/80 hover:bg-secondary"
                                onClick={() => navigate("/customer-dashboard/browse-events")}
                            >
                                Browse Events
                            </Button>
                            <Button
                                className="w-full sm:w-auto rounded-xl h-11 px-6 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-95 shadow-md"
                                onClick={() => navigate("/customer-dashboard/browse-services")}
                            >
                                Browse Services
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ── Desktop Checkout Workspace (68% / 32%) ─────────── */
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)] xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.8fr)] gap-6 items-start">

                        {/* ════ LEFT PANEL – YOUR CART WORKSPACE ═════════════════ */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[420px] sm:min-h-[460px]">
                            <div className="space-y-4">
                                {/* Left Panel Header */}
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                        YOUR CART
                                    </h2>
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {cartItems.length} {cartItems.length === 1 ? "item selected" : "items selected"}
                                    </span>
                                </div>

                                {/* Cart Items List */}
                                <div ref={itemsRef} className="space-y-4">
                                    <AnimatePresence>
                                        {cartItems.map((item) => {
                                            const formattedDateStr = formatDate(item.date);
                                            const formattedTimeStr = formatTime(item.time);
                                            const locationStr = item.details?.venue || item.details?.location || item.details?.customerLocation?.address || item.location;

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 14 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -30 }}
                                                    className="group rounded-xl border border-border/70 bg-secondary/25 p-4 sm:p-5 hover:border-primary/40 hover:bg-card transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
                                                >
                                                    {/* Event / Service Image */}
                                                    <div className="w-full sm:w-[190px] sm:min-w-[190px] sm:h-[145px] h-[165px] rounded-xl overflow-hidden relative bg-secondary/80 shrink-0 border border-border/50">
                                                        {imgSrc(item.image) ? (
                                                            <img
                                                                src={imgSrc(item.image)}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground/40">
                                                                {item.type === "event" ? <Calendar className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />}
                                                            </div>
                                                        )}

                                                        {/* Type badge overlay */}
                                                        <span className={`absolute top-2.5 left-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-xs ${
                                                            item.type === "event" 
                                                                ? "bg-purple-600/95 text-white" 
                                                                : "bg-amber-500/95 text-black"
                                                        }`}>
                                                            {item.type}
                                                        </span>
                                                    </div>

                                                    {/* Content Info */}
                                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                                        <div className="space-y-2 min-w-0 flex-1">
                                                            {/* Category badge */}
                                                            {item.category && item.category !== "N/A" && (
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/90 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 inline-block">
                                                                    {item.category}
                                                                </span>
                                                            )}

                                                            {/* Title */}
                                                            <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight leading-snug line-clamp-1">
                                                                {item.name}
                                                            </h3>

                                                            {/* Date & Time */}
                                                            {(formattedDateStr || formattedTimeStr) && (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                    <span>
                                                                        {formattedDateStr}
                                                                        {formattedTimeStr && ` • ${formattedTimeStr}`}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Location */}
                                                            {locationStr && locationStr !== "N/A" && locationStr !== "undefined" && (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                                                                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                    <span className="truncate">{locationStr}</span>
                                                                </div>
                                                            )}

                                                            {/* Event Configuration */}
                                                            {item.type === "event" && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                    {item.details?.selectedSession && (
                                                                        <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/50 capitalize">
                                                                            Session: {item.details.selectedSession}
                                                                        </span>
                                                                    )}

                                                                    {item.details?.selectedTickets && Object.keys(item.details.selectedTickets).length > 0 && (
                                                                        Object.entries(item.details.selectedTickets)
                                                                            .filter(([_, qty]) => qty > 0)
                                                                            .map(([tier, qty]) => (
                                                                                <span key={tier} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                                                                                    <Ticket className="h-3 w-3" />
                                                                                    {tier} Tier × {qty}
                                                                                </span>
                                                                            ))
                                                                    )}

                                                                    {item.details?.selectedSeatNumbers && item.details.selectedSeatNumbers.length > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/50">
                                                                            <span className="font-semibold text-foreground">Seats:</span> {item.details.selectedSeatNumbers.join(", ")}
                                                                        </span>
                                                                    )}

                                                                    {item.details?.quantity && item.details?.quantity > 1 && (!item.details?.selectedTickets || Object.keys(item.details?.selectedTickets).length === 0) && (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-semibold border border-border/50">
                                                                            Qty: {item.details.quantity}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Service Configuration */}
                                                            {item.type === "service" && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
                                                                    {item.details?.addOns && item.details.addOns.length > 0 && (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                                                                            <Briefcase className="h-3 w-3" />
                                                                            Add-ons ({item.details.addOns.length})
                                                                        </span>
                                                                    )}
                                                                    {item.details?.guestCount && item.details.guestCount > 0 && (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-semibold border border-border/50">
                                                                            Guests: {item.details.guestCount}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Price & Remove Column */}
                                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60 shrink-0">
                                                            <div className="text-left sm:text-right">
                                                                {item.discountAmount > 0 && (
                                                                    <span className="block text-xs text-muted-foreground line-through font-medium">
                                                                        {formatCurrency(item.originalPrice)}
                                                                    </span>
                                                                )}
                                                                <span className="font-display font-bold text-xl sm:text-2xl text-primary leading-none">
                                                                    {formatCurrency(item.price)}
                                                                </span>
                                                                {item.appliedPromo && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono mt-1 block">
                                                                        <Percent className="h-2.5 w-2.5" /> {item.appliedPromo.code}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(item.id)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10 border border-rose-200/60 dark:border-rose-900/40 transition-all active:scale-95 shrink-0"
                                                                aria-label="Remove item"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                <span>Remove</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Booking Information - Static UX guidance section */}
                            <div className="border-t border-border/60 pt-4 mt-6">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                                    Booking Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-muted-foreground font-medium">
                                    <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border/40">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Secure payment processing</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border/40">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Instant booking confirmation</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border/40">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Digital ticket/pass delivery</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ════ RIGHT PANEL – ORDER SUMMARY ═════════════════ */}
                        <div className="min-w-0 w-full">
                            <div className="sticky top-24 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[420px] sm:min-h-[460px] space-y-4">
                                <div className="space-y-4">
                                    {/* Order Summary Header */}
                                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                            ORDER SUMMARY
                                        </h3>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
                                        </span>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="space-y-2.5 text-sm">
                                        {eventItems.length > 0 && (
                                            <div className="flex justify-between items-center text-muted-foreground font-medium">
                                                <span>Events ({eventItems.length})</span>
                                                <span className="font-bold text-foreground">{formatCurrency(eventsSubtotal)}</span>
                                            </div>
                                        )}
                                        {serviceItems.length > 0 && (
                                            <div className="flex justify-between items-center text-muted-foreground font-medium">
                                                <span>Services ({serviceItems.length})</span>
                                                <span className="font-bold text-foreground">{formatCurrency(servicesSubtotal)}</span>
                                            </div>
                                        )}
                                        {totalDiscount > 0 && (
                                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                                <span className="flex items-center gap-1.5 text-xs">
                                                    <Percent className="h-3.5 w-3.5" /> Promo Savings
                                                </span>
                                                <span className="text-xs">-{formatCurrency(totalDiscount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-border/80 my-2" />

                                    {/* Subtotal & Grand Total */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                                            <span>Subtotal</span>
                                            <span className="font-bold text-foreground">{formatCurrency(grandTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-1">
                                            <span className="font-bold text-sm text-foreground">Grand Total</span>
                                            <span className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Secure Checkout Sub-banner */}
                                    <div className="bg-secondary/50 p-3 rounded-xl border border-border/40 space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span>Secure Checkout</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Payment is processed securely. Confirmed tickets will be available in your dashboard instantly.
                                        </p>
                                    </div>
                                </div>

                                {/* Checkout CTA & Trust Indicators */}
                                <div className="space-y-3 pt-2">
                                    <Button
                                        onClick={handleCheckoutClick}
                                        disabled={checkoutLoading}
                                        className="w-full h-12 text-sm font-bold bg-gradient-to-r from-purple-600 via-purple-600 to-pink-500 text-white hover:opacity-95 shadow-md hover:shadow-purple-500/20 rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                    >
                                        {checkoutLoading ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</>
                                        ) : eventItems.length > 0 ? (
                                            <>
                                                <span>Proceed to Pay & Confirm</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        ) : (
                                            <>
                                                <span>Submit Booking Requests</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>

                                    {/* Checkout Trust Indicators */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium px-1">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Secure payment
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Instant confirmation
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Digital pass
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </CustomerLayout>
    );
};
export default Cart;


