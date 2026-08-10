import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Ticket, Calendar, Briefcase, MapPin, Loader2, ShoppingBag, Percent } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
const Cart = () => {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
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
        if (cartItems.length === 0)
            return;
        executeBulkBookings();
    };
    const executeBulkBookings = async () => {
        setCheckoutLoading(true);
        try {
            const promises = cartItems.map(async (item) => {
                const isEvent = item.type === "event";
                const initialStatus = isEvent ? "awaiting_payment" : "pending_approval";
                // Construct booking payload
                const payload = {
                    serviceName: item.type === "service" ? item.name : undefined,
                    eventName: item.type === "event" ? item.name : undefined,
                    eventId: item.type === "event" ? item.itemId : undefined,
                    serviceId: item.type === "service" ? item.itemId : undefined,
                    price: item.price,
                    date: item.date,
                    time: item.time,
                    isEvent: isEvent,
                    status: initialStatus,
                    paymentStatus: "pending",
                    deferPayment: isEvent,
                    quantity: item.details.quantity || 1,
                    selectedTickets: item.details.selectedTickets || {},
                    selectedSession: item.details.selectedSession || "",
                    addOns: item.details.addOns || [],
                    guestCount: item.details.guestCount || 0,
                    customerLocation: item.details.customerLocation || null,
                    seatNumbers: item.details.selectedSeatNumbers || [],
                    promoCode: item.appliedPromo ? {
                        code: item.appliedPromo.code || "",
                        _id: item.appliedPromo._id || null,
                        promoCodeId: item.appliedPromo._id || null,
                        kind: item.appliedPromo.kind || "",
                        referrerId: item.appliedPromo.referrerId || null,
                        referrerName: item.appliedPromo.referrerName || "",
                        bonusAmount: item.appliedPromo.bonusAmount || 0,
                        discountType: item.appliedPromo.discountType || "",
                        discountValue: item.appliedPromo.discountValue || 0,
                        discountAmount: item.discountAmount,
                        originalPrice: item.originalPrice,
                        finalPrice: item.price
                    } : undefined
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
                    throw new Error(err?.error || `Booking failed for ${item.name}`);
                }
                return res.json();
            });
            await Promise.all(promises);
            toast.success("Bookings created. Review and pay from My Bookings.");
            clearCart();
            navigate("/customer-dashboard/bookings");
        }
        catch (err) {
            toast.error(err?.message || "Checkout failed. Some bookings could not be processed.");
        }
        finally {
            setCheckoutLoading(false);
        }
    };
    if (cartItems.length === 0) {
        return (<CustomerLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-xl p-10 text-center max-w-md w-full">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground"/>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">Your Cart is Empty</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
              Browse our wide selection of ticketed events and premium event service providers to build your custom experience.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => navigate("/customer-dashboard/browse-events")} className="bg-gradient-primary min-h-[44px]">
                Browse Events
              </Button>
              <Button onClick={() => navigate("/customer-dashboard/browse-services")} variant="outline" className="min-h-[44px]">
                Browse Services
              </Button>
            </div>
          </div>
        </div>
      </CustomerLayout>);
    }
    return (<CustomerLayout>
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

                  {eventItems.length > 0 && serviceItems.length > 0 && (<div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Review checkout: your event and service bookings will be created first. Pay for event bookings from My Bookings after reviewing them.
                    </div>)}

                  {eventItems.length > 0 && serviceItems.length === 0 && (<div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Event bookings are created first. Review your booking details, then use Pay Now from My Bookings.
                    </div>)}

                  {serviceItems.length > 0 && eventItems.length === 0 && (<div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                      Service requests do not require immediate payments. Vendors will review your requests and send quotations.
                    </div>)}

                  <Button onClick={handleCheckoutClick} disabled={checkoutLoading} className="w-full h-12 text-base bg-gradient-primary hover:opacity-90 font-bold disabled:opacity-50">
                    {checkoutLoading ? (<>
                        <Loader2 className="h-4 w-4 animate-spin mr-2"/> Processing…
                      </>) : eventItems.length > 0 ? ("Create Bookings & Review") : ("Submit Booking Requests")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>);
};
export default Cart;
