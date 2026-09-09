import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Loader2, Ticket, Clock, MapPin, User, Calendar as CalendarIcon, CreditCard } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import PageHeader from "@/components/PageHeader";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMyBookings } from "@/lib/api";
import { toast } from "sonner";
import { useGsapStagger, useGsapCardHover } from "@/lib/gsapAnimations";

const STATUS_BADGE = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    pending_approval: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    approved: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold animate-pulse",
    awaiting_final_payment: "bg-pink-500/15 text-pink-400 border border-pink-500/30 font-bold animate-pulse",
    assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
    paid: "bg-green-500/15 text-green-400 border border-green-500/30",
};

const BookingCard = ({ booking, index, onPayClick }) => {
    const hoverRef = useGsapCardHover({ lift: -5, scale: 1.015 });
    const isEventBooking = !!booking.eventId;
    const title = isEventBooking
        ? (booking.event?.title || booking.eventName)
        : (booking.service?.name || booking.serviceName);
    const locationText = isEventBooking
        ? booking.event?.location
        : booking.customerLocation?.address;
    const merchantName = booking.assignedTo?.name || booking.event?.createdBy?.name || booking.service?.createdBy?.name;
    const merchantEmail = booking.assignedTo?.email || booking.event?.createdBy?.email || booking.service?.createdBy?.email;

    const isPayable = (
        ["awaiting_payment", "approved", "assigned", "awaiting_final_payment"].includes(booking.status) ||
        (booking.paymentType === "advance" && !booking.isAdvancePaid && !["cancelled", "rejected", "refunded"].includes(booking.status)) ||
        (booking.paymentType === "advance" && booking.isAdvancePaid && !booking.isRemainingPaid && !["cancelled", "rejected", "refunded"].includes(booking.status)) ||
        (booking.approvedAt && booking.paymentStatus === "pending" && !["cancelled", "rejected", "refunded"].includes(booking.status))
    ) && booking.paymentStatus !== "paid";

    return (<div ref={hoverRef} className="rounded-xl border border-border bg-card overflow-hidden will-change-transform flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary"/>
                <span className="font-semibold text-sm">
                  {title}
                </span>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[booking.status] || "bg-secondary text-muted-foreground"}`}>
                {booking.status}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3">
            {/* Date & Time */}
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
              <div className="text-sm">
                <div className="font-medium">{new Date(booking.datetime).toLocaleDateString()}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(booking.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Location */}
            {locationText && (<div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                <div className="text-sm">
                  <div className="font-medium">{locationText}</div>
                  {isEventBooking && (<button onClick={() => {
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
                      window.open(mapsUrl, "_blank");
                  }} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                      Get Directions
                    </button>)}
                </div>
              </div>)}

            {/* Merchant */}
            {merchantName && (<div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                <div className="text-sm">
                  <div className="font-medium">{merchantName}</div>
                  {merchantEmail && <div className="text-xs text-muted-foreground">{merchantEmail}</div>}
                </div>
              </div>)}
          </div>
        </div>

        <div className="p-4 pt-0 space-y-3">
          {/* Price & Pay Action */}
          <div className="pt-3 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{booking.paymentStatus === "paid" ? "Price Paid" : "Total Price"}</span>
            <span className="font-semibold text-primary">{formatCurrency(booking.price)}</span>
          </div>

          {isPayable && (
            <Button
              onClick={() => onPayClick(booking)}
              className="w-full bg-gradient-primary text-white font-bold h-9 text-xs rounded-xl shadow-glow animate-pulse cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" /> Pay Requested Amount
            </Button>
          )}

          {/* Booked On */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            Booked on {new Date(booking.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>);
};
const UpcomingBookings = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const goBack = useBackNavigation("/customer-dashboard/bookings");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const gridRef = useGsapStagger([bookings]);

    const fetchBookings = async (showLoader = false) => {
        if (!token) return;
        if (showLoader) setLoading(true);
        try {
            const res = await apiMyBookings(token);
            const upcoming = (res.bookings || []).filter((b) => {
                if (["completed", "cancelled", "rejected"].includes(b.status))
                    return false;
                const isEventBooking = !!b.eventId;
                if (isEventBooking)
                    return b.event != null;
                const isServiceBooking = !!b.service;
                if (isServiceBooking)
                    return b.service != null;
                return false;
            }).sort((a, b) => {
                const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
                const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
                return dateB - dateA;
            });
            setBookings(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(upcoming))
                    return upcoming;
                return prev;
            });
        }
        catch {
            if (showLoader)
                toast.error("Failed to load upcoming bookings");
        }
        finally {
            if (showLoader)
                setLoading(false);
        }
    };

    useEffect(() => {
        if (!token)
            return;
        fetchBookings(true);
        const interval = setInterval(() => fetchBookings(false), 3000);
        const onFocus = () => fetchBookings(false);
        window.addEventListener("focus", onFocus);
        const onVisibility = () => {
            if (document.visibilityState === "visible")
                fetchBookings(false);
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [token]);

    const handlePayClick = (booking) => {
        const { amount, paymentType } = (() => {
            if (
                booking.status === "awaiting_final_payment" ||
                (booking.paymentType === "advance" && booking.isAdvancePaid && !booking.isRemainingPaid)
            ) {
                const rem = booking.remainingAmount > 0 
                    ? booking.remainingAmount 
                    : ((booking.price || 0) - (booking.advanceAmount || 0));
                return { amount: rem > 0 ? rem : (booking.price || 0), paymentType: "remaining" };
            }
            if (
                booking.paymentType === "advance" &&
                !booking.isAdvancePaid
            ) {
                const adv = booking.advanceAmount > 0 
                    ? booking.advanceAmount 
                    : Math.round((booking.price || 0) * 0.3);
                return { amount: adv > 0 ? adv : (booking.price || 0), paymentType: "advance" };
            }
            return { amount: booking.price || 0, paymentType: "full" };
        })();

        navigate("/customer-dashboard/checkout", {
            state: {
                bookingId: booking._id,
                amount,
                bookingData: {
                    eventName: booking.event?.title || booking.serviceName || "Service Booking",
                    serviceName: booking.serviceName || booking.event?.title || "Service Booking",
                    paymentType,
                    datetime: booking.datetime,
                    location: booking.customerLocation?.address || booking.event?.location,
                    image: booking.event?.image || booking.serviceImage || booking.service?.image,
                    price: booking.price
                }
            }
        });
    };

    return (<CustomerLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <PageHeader title="Upcoming Bookings" onBack={goBack} />
          </motion.div>

          {/* Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} className="mb-6 sm:mb-8 mt-6 sm:mt-8">
            {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading upcoming bookings…
              </div>) : bookings.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-30"/>
                <p className="font-medium text-lg text-muted-foreground">No upcoming bookings</p>
                <p className="text-sm mt-2 text-muted-foreground">Your upcoming bookings will appear here</p>
              </div>) : (<div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking, index) => (<BookingCard key={booking._id} booking={booking} index={index} onPayClick={handlePayClick} />))}
              </div>)}
          </motion.div>
        </div>
      </section>
    </CustomerLayout>);
};
export default UpcomingBookings;
