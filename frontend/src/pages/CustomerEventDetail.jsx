import { useState, useEffect } from "react";
import { formatCurrency, formatEventSchedule, formatTime12 } from "@/lib/utils";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Calendar, Clock, MapPin, Users, Loader2, Heart, Share2, Tag, Ticket, X, Check, Star, CheckCircle2, Images, Video, ShoppingBag, } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiGetEventById, apiCheckFavorite, apiAddFavorite, apiRemoveFavorite, apiValidatePromoCode, apiListEvents, apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { savePendingEventBooking, getPendingEventBooking, clearPendingEventBooking } from "@/lib/bookingState";
import AvailablePromoCodes from "@/components/AvailablePromoCodes";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
const CustomerEventDetail = () => {
    const { id } = useParams();
    const { isLoggedIn, token } = useAuth();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedEvents, setRelatedEvents] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [showPromoCodes, setShowPromoCodes] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        apiGetPublicReviews()
            .then((res) => {
            const allReviews = res.reviews || [];
            const filtered = allReviews.filter((r) => r.eventId === id);
            setReviews(filtered);
        })
            .catch((err) => console.error("Failed to load reviews:", err));
    }, [id]);
    // Booking state
    const [selectedTickets, setSelectedTickets] = useState({});
    const [selectedSession, setSelectedSession] = useState(null);
    const [fullServiceQty, setFullServiceQty] = useState(1);
    const [selectedSeatNumbers, setSelectedSeatNumbers] = useState([]);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    // Favorites
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteId, setFavoriteId] = useState(null);
    const [favLoading, setFavLoading] = useState(false);
    const imgSrc = (img) => !img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`;
    // Load + poll
    useEffect(() => {
        const load = async (initial = false) => {
            if (initial)
                setLoading(true);
            try {
                const [res, allEventsRes] = await Promise.all([
                    apiGetEventById(id),
                    apiListEvents()
                ]);
                const currentEvent = res.event;
                setEvent(currentEvent);
                const allEvents = allEventsRes.events || [];
                const related = allEvents.filter((e) => e._id !== id &&
                    (e.category === currentEvent.category || e.createdBy?._id === currentEvent.createdBy?._id));
                if (related.length < 3) {
                    const other = allEvents.filter((e) => e._id !== id &&
                        !related.some((r) => r._id === e._id));
                    related.push(...other.slice(0, 3 - related.length));
                }
                setRelatedEvents(related.slice(0, 4));
            }
            catch {
                if (initial) {
                    toast.error("Failed to load event");
                    navigate("/customer-dashboard/browse-events");
                }
            }
            finally {
                if (initial)
                    setLoading(false);
            }
        };
        load(true);
        const interval = setInterval(() => load(false), 5000);
        return () => clearInterval(interval);
    }, [id]);

    useRealtimeEvent("realtime:tickets-updated", (data) => {
        if (!data?.eventId || data.eventId === id) {
            apiGetEventById(id).then((r) => r.event && setEvent(r.event)).catch(() => {});
        }
    });
    // Favorites
    useEffect(() => {
        if (!event || !isLoggedIn || !token)
            return;
        apiCheckFavorite("event", event._id, token)
            .then((res) => { setIsFavorited(res.isFavorited); setFavoriteId(res.favoriteId || null); })
            .catch(() => { });
    }, [event?._id, isLoggedIn, token]);
    // Restore pending booking after login redirect
    useEffect(() => {
        if (!isLoggedIn || !event)
            return;
        const pending = getPendingEventBooking();
        if (!pending || pending.eventId !== id)
            return;
        clearPendingEventBooking();
        setSelectedTickets(pending.selectedTickets || {});
        setSelectedSession(pending.selectedSession || null);
        setFullServiceQty(pending.fullServiceQty || 1);
        setPromoCode(pending.promoCode || "");
        // Re-apply promo code if present
        if (pending.promoCode) {
            applyPromoByCode(pending.promoCode);
        }
        // Auto-open payment modal if all required info is present
        if (event.eventType === "ticketed") {
            if (pending.selectedSession && Object.values(pending.selectedTickets || {}).some(q => q > 0)) {
                setShowPaymentModal(true);
            }
        }
        else {
            setShowPaymentModal(true);
        }
    }, [isLoggedIn, event]);
    const handleToggleFavorite = async () => {
        if (!isLoggedIn || !token) {
            toast.error("Please sign in to save favorites");
            return;
        }
        setFavLoading(true);
        try {
            if (isFavorited && favoriteId) {
                await apiRemoveFavorite(favoriteId, token);
                setIsFavorited(false);
                setFavoriteId(null);
                toast.success("Removed from favorites");
            }
            else {
                const res = await apiAddFavorite(event._id, null, "event", token);
                setIsFavorited(true);
                setFavoriteId(res.favorite?._id || null);
                toast.success("Saved to favorites");
            }
        }
        catch {
            toast.error("Failed to update favorites");
        }
        finally {
            setFavLoading(false);
        }
    };
    const getTicketPrice = () => {
        if (!event)
            return 0;
        if (event.eventType === "ticketed") {
            let total = 0;
            if (event.hasMultipleSessions && selectedSession) {
                const tickets = event.sessions?.[selectedSession]?.tickets || [];
                Object.entries(selectedTickets).forEach(([type, qty]) => {
                    const t = tickets.find((t) => t.type === type);
                    total += (t?.price || 0) * qty;
                });
            }
            else {
                Object.entries(selectedTickets).forEach(([type, qty]) => {
                    const t = event.tickets?.find((t) => t.type === type);
                    total += (t?.price || 0) * qty;
                });
            }
            return total;
        }
        return event.price * fullServiceQty;
    };
    const getFinalPrice = () => {
        const base = getTicketPrice();
        if (!appliedPromo)
            return base;
        const discount = appliedPromo.discountType === "percentage"
            ? Math.min((base * appliedPromo.discountValue) / 100, appliedPromo.maxDiscount || Infinity)
            : appliedPromo.discountValue;
        return Math.max(0, base - discount);
    };
    const applyPromoCode = async () => {
        await applyPromoByCode(promoCode);
    };
    const applyPromoByCode = async (code) => {
        if (!code.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        setPromoCode(code);
        setPromoError("");
        try {
            setAppliedPromo(null);
            const data = await apiValidatePromoCode(code.toUpperCase(), getTicketPrice(), event?._id, undefined, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to apply promo code");
            setAppliedPromo(null);
            toast.error(error?.message || "Failed to apply promo code");
        }
    };
    const handleAddToCart = (redirectAfterAdding = false) => {
        if (!isLoggedIn || !token) {
            const returnUrl = `/customer-dashboard/events/${id}`;
            savePendingEventBooking({
                eventId: id, eventTitle: event.title,
                selectedTickets, selectedSession, fullServiceQty, promoCode,
                returnTo: returnUrl,
            });
            localStorage.setItem("authReturnTo", returnUrl);
            toast.error("Please sign in to book");
            navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
            return;
        }
        // Validation
        if (event.eventType === "ticketed") {
            if (event.hasMultipleSessions && !selectedSession) {
                toast.error("Please select a session");
                return;
            }
            if (!Object.values(selectedTickets).some(q => q > 0)) {
                toast.error("Please select at least one ticket");
                return;
            }
        }
        const price = getFinalPrice();
        const originalPrice = getTicketPrice();
        const discountAmount = originalPrice - price;
        addToCart({
            type: "event",
            itemId: event._id,
            name: event.title,
            price,
            originalPrice,
            discountAmount,
            date: new Date(event.datetime).toISOString().split("T")[0],
            time: new Date(event.datetime).toTimeString().split(" ")[0].slice(0, 5),
            image: event.image,
            category: event.category,
            merchantId: event.createdBy?._id || event.createdBy,
            details: {
                selectedTickets,
                selectedSession: selectedSession || "",
                selectedSeatNumbers,
                quantity: event.eventType === "fullService" ? fullServiceQty : undefined
            },
            appliedPromo
        });
        if (redirectAfterAdding) {
            navigate("/customer-dashboard/cart");
        }
    };
    const isSoldOut = () => {
        if (!event)
            return false;
        if (event.eventType === "ticketed") {
            if (event.hasMultipleSessions) {
                const d = event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                const n = event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                return d && n;
            }
            return event.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
        }
        return event.maxAttendees > 0 && (event.attendeesCount || 0) >= event.maxAttendees;
    };
    const getTicketList = () => {
        if (!event)
            return [];
        if (event.hasMultipleSessions) {
            const sess = selectedSession || (event.sessions?.day?.enabled ? "day" : "night");
            return event.sessions?.[sess]?.tickets || [];
        }
        return event.tickets || [];
    };
    const relatedGridRef = useGsapStagger([relatedEvents.length]);
    if (loading)
        return (<CustomerLayout>
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin"/> Loading eventâ€¦
      </div>
    </CustomerLayout>);
    if (!event)
        return null;
    const attendeesCount = event.attendeesCount || 0;
    const maxAttendees = event.maxAttendees || 0;
    const progress = maxAttendees > 0 ? Math.min(100, Math.round((attendeesCount / maxAttendees) * 100)) : 0;
    const totalSelectedQty = event.eventType === "ticketed"
      ? Object.values(selectedTickets).reduce((s, q) => s + q, 0)
      : fullServiceQty;
    const hasSelection = totalSelectedQty > 0;

    const renderText = (val) => {
      if (val === null || val === undefined) return "";
      if (typeof val === "string" || typeof val === "number") return val;
      if (typeof val === "object") return val.address || val.name || val.title || val.city || JSON.stringify(val);
      return String(val);
    };

    return (<CustomerLayout>
      <div className="w-full pb-10 font-sans" style={{ color: "#0F172A" }}>

        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-1.5" style={{ fontSize: "14px", color: "#64748B" }}>
          <button onClick={() => navigate("/customer-dashboard/browse-events")} className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5"/> Events
          </button>
          <span className="text-[#CBD5E1]">/</span>
          <span className="truncate max-w-[260px]" style={{ color: "#0F172A" }}>{renderText(event.title)}</span>
        </div>

        {/* 12-col grid: 8 left + 4 right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─── LEFT: 8 columns ─── */}
          <div className="lg:col-span-8 space-y-5">

            {/* A. Banner Image */}
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: "260px" }}>
              {imgSrc(event.image)
                ? <img src={imgSrc(event.image)} alt={renderText(event.title)} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "#F1F5F9" }}>
                    <CalendarDays className="h-16 w-16" style={{ color: "#CBD5E1" }}/>
                  </div>
              }
              {/* Category badge top-left */}
              {event.category && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)", backdropFilter: "blur(4px)" }}>
                  {renderText(event.category)}
                </span>
              )}
              {/* Wishlist icon top-right */}
              <button onClick={handleToggleFavorite} disabled={favLoading}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", border: "1px solid #E2E8F0" }}>
                <Heart className="h-4 w-4" style={{ fill: isFavorited ? "#EF4444" : "transparent", color: isFavorited ? "#EF4444" : "#64748B" }}/>
              </button>
            </div>

            {/* B. Event Information */}
            <div className="space-y-4">
              {/* Title */}
              <h1 style={{ fontSize: "30px", fontWeight: 700, lineHeight: "38px", color: "#0F172A" }}>
                {renderText(event.title)}
              </h1>

              {/* Compact metadata row: rating · host · category */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ fontSize: "13px", color: "#64748B" }}>
                {event.averageRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"/>
                    <span style={{ fontWeight: 600, color: "#0F172A" }}>{event.averageRating.toFixed(1)}</span>
                    <span>({event.ratingCount || 0} reviews)</span>
                  </span>
                )}
                {event.createdBy && (
                  <span className="flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full inline-block" style={{ background: "#CBD5E1" }}/>
                    Hosted by <span style={{ fontWeight: 500, color: "#0F172A" }}>&nbsp;{typeof event.createdBy === "object" ? (event.createdBy?.name || "Organiser") : renderText(event.createdBy)}</span>
                  </span>
                )}
                {event.live && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: "#FEE2E2", color: "#EF4444" }}>
                    🔴 LIVE
                  </span>
                )}
              </div>

              {/* 2×2 info grid */}
              {(() => {
                const schedule = formatEventSchedule(event);
                return (
                  <div className="space-y-3 py-4" style={{ borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          icon: Calendar,
                          label: "Date",
                          value: schedule.dateText ? (
                            <span>
                              {schedule.dateText}
                              {schedule.isMultiDay && (
                                <span className="ml-1.5 inline-block text-[11px] font-semibold text-primary">
                                  ({schedule.badgeText})
                                </span>
                              )}
                            </span>
                          ) : null
                        },
                        { icon: Clock, label: "Time", value: schedule.timeText },
                        { icon: MapPin, label: "Location", value: renderText(event.location) },
                        { icon: Users, label: "Attendees", value: maxAttendees > 0 ? `${attendeesCount} / ${maxAttendees}` : `${attendeesCount} attending` },
                      ].map(({ icon: Icon, label, value }) => Boolean(value) && (
                        <div key={label} className="flex items-start gap-2.5">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                            style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                            <Icon style={{ width: "16px", height: "16px" }}/>
                          </div>
                          <div>
                            <p style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginTop: "1px" }}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {schedule.hasCustomSchedule && schedule.dailySchedule?.length > 0 && (
                      <div className="rounded-xl border border-border bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-1.5 text-xs mt-2">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Daily Schedule
                        </p>
                        <div className="space-y-1 text-muted-foreground">
                          {schedule.dailySchedule.map((day) => (
                            <div key={day.date} className="flex justify-between items-center py-0.5">
                              <span className="font-medium text-foreground">{day.dayLabel}</span>
                              <span>{formatTime12(day.startTime)} – {formatTime12(day.endTime)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* C. Seat Availability */}
              {maxAttendees > 0 && (
                <div style={{ padding: "12px 0" }}>
                  <div className="flex items-center justify-between mb-2" style={{ fontSize: "13px", color: "#64748B" }}>
                    <span>Seats filled</span>
                    <span style={{ fontWeight: 600, color: "#0F172A" }}>{progress}%</span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "#E2E8F0" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7C3AED, #EC4899)" }}/>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
                    {maxAttendees - attendeesCount > 0 ? `${maxAttendees - attendeesCount} spots remaining` : "Event is full"}
                  </p>
                </div>
              )}

              {/* D. About This Event */}
              {event.description && (
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "10px" }}>About This Event</h3>
                  <p style={{ fontSize: "14px", lineHeight: "22px", color: "#64748B" }}>{renderText(event.description)}</p>
                </div>
              )}

              {/* Venue & Organiser */}
              {event.createdBy && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>Event Organiser</p>
                  <p style={{ fontSize: "14px", color: "#64748B" }}>{typeof event.createdBy === "object" ? (event.createdBy?.name || "Organiser") : renderText(event.createdBy)}</p>
                  {typeof event.createdBy === "object" && event.createdBy?.email && (
                    <a href={`mailto:${event.createdBy.email}`} style={{ fontSize: "13px", color: "#7C3AED", display: "block" }}
                      className="hover:underline">
                      📧 {event.createdBy.email}
                    </a>
                  )}
                </div>
              )}

              {/* Gallery */}
              {event.gallery?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}>Gallery ({event.gallery.length})</h3>
                    <button onClick={() => setShowGallery(!showGallery)}
                      style={{ fontSize: "13px", color: "#7C3AED", fontWeight: 500 }}
                      className="hover:opacity-80 transition-opacity">
                      {showGallery ? "Hide" : "View Gallery"}
                    </button>
                  </div>
                  {showGallery && (
                    <div className="grid grid-cols-3 gap-2">
                      {event.gallery.map((img, idx) => (
                        <button key={idx} onClick={() => setLightboxIndex(idx)}
                          className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
                          <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover"/>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Share */}
              <div>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
                  className="flex items-center gap-2 transition-opacity hover:opacity-70"
                  style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                  <Share2 className="h-4 w-4"/> Share this event
                </button>
              </div>

              {/* Reviews */}
              <div style={{ paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }} className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                    Customer Reviews ({reviews.length})
                  </h3>
                  {reviews.length > 2 && (
                    <button onClick={() => setShowAllReviewsModal(true)}
                      style={{ fontSize: "13px", color: "#7C3AED", fontWeight: 500 }}
                      className="hover:opacity-80 transition-opacity">
                      View all
                    </button>
                  )}
                </div>
                {reviews.length === 0
                  ? <p style={{ fontSize: "14px", color: "#94A3B8", fontStyle: "italic" }}>No reviews yet for this event.</p>
                  : <div className="space-y-3">
                      {reviews.slice(0, 2).map((review) => (
                        <div key={review._id} className="rounded-xl p-4" style={{ border: "1px solid #E2E8F0", background: "#FAFAFA" }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                                {review.customerName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{review.customerName}</p>
                                <div className="flex gap-0.5 mt-0.5">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`h-3 w-3 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-[#E2E8F0]"}`}/>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {review.ratedAt && (
                              <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                                {new Date(review.ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          {review.comment
                            ? <p style={{ fontSize: "13px", color: "#64748B", paddingLeft: "42px" }}>"{review.comment}"</p>
                            : <p style={{ fontSize: "12px", color: "#94A3B8", paddingLeft: "42px", fontStyle: "italic" }}>Rated {review.score}/5 stars</p>}
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>

          {/* â”€â”€â”€ RIGHT: 4 columns sticky booking panel â”€â”€â”€ */}
          <div className="lg:col-span-4">
            <div className="lg:sticky" style={{ top: "96px" }}>
              <div className="rounded-2xl" style={{
                padding: "20px",
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                boxShadow: "0 8px 24px rgba(15,23,42,0.07)"
              }}>

                {/* Panel header */}
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                  {event.live ? "Event Details" : "Select Tickets"}
                </h2>
                <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}>
                  {event.live ? "This event is currently live" : event.eventType === "ticketed" ? "Choose a ticket type and quantity" : "Pick your number of spots"}
                </p>

                {/* Live state */}
                {event.live ? (
                  <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <Video className="mx-auto h-7 w-7" style={{ color: "#EF4444" }}/>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#EF4444" }}>Live â€” Booking Unavailable</p>
                  </div>
                ) : isSoldOut() ? (
                  <div className="rounded-xl p-4 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <Ticket className="mx-auto h-7 w-7 mb-2" style={{ color: "#EF4444", opacity: 0.6 }}/>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "#EF4444" }}>
                      {event.eventType === "ticketed" ? "Sold Out" : "Event Full"}
                    </p>
                    <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>No spots available</p>
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* Session selector */}
                    {event.eventType === "ticketed" && event.hasMultipleSessions &&
                      event.sessions?.day?.enabled && event.sessions?.night?.enabled && (
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "8px" }}>Select Session</p>
                        <div className="grid grid-cols-2 gap-2">
                          {["day", "night"].map(sess => {
                            const soldOut = event.sessions?.[sess]?.tickets?.every(t => ((t.available||0)-(t.sold||0)) <= 0);
                            const active = selectedSession === sess;
                            return (
                              <button key={sess} disabled={soldOut}
                                onClick={() => { setSelectedSession(sess); setSelectedTickets({}); }}
                                className="rounded-xl p-3 text-center transition-all"
                                style={{
                                  border: active ? "2px solid #7C3AED" : "1px solid #E2E8F0",
                                  background: active ? "#F5F3FF" : "#FFFFFF",
                                  opacity: soldOut ? 0.5 : 1,
                                  cursor: soldOut ? "not-allowed" : "pointer"
                                }}>
                                <div style={{ fontSize: "18px" }}>{sess === "day" ? "â˜€ï¸" : "ðŸŒ™"}</div>
                                <div style={{ fontSize: "12px", fontWeight: 600, color: active ? "#7C3AED" : "#0F172A", marginTop: "2px", textTransform: "capitalize" }}>{sess}</div>
                                {soldOut && <div style={{ fontSize: "10px", color: "#EF4444", fontWeight: 700, marginTop: "2px" }}>SOLD OUT</div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ticket rows */}
                    {(event.eventType === "fullService" || !event.hasMultipleSessions || selectedSession ||
                      (event.sessions?.day?.enabled && !event.sessions?.night?.enabled) ||
                      (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) && (() => {
                      const tierConfig = {
                        diamond: { color: "#06B6D4", label: "Diamond" },
                        gold: { color: "#F59E0B", label: "Gold" },
                        silver: { color: "#94A3B8", label: "Silver" },
                      };

                      if (event.eventType === "ticketed") {
                        const tickets = event.hasMultipleSessions && selectedSession
                          ? event.sessions?.[selectedSession]?.tickets
                          : event.tickets;
                        if (!tickets?.length) return <p style={{ fontSize: "13px", color: "#94A3B8" }}>No tickets available</p>;

                        return (
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "10px" }}>Available Tickets</p>
                            <div className="space-y-2">
                              {tickets.map(t => {
                                const remaining = (t.available || 0) - (t.sold || 0);
                                const qty = selectedTickets[t.type] || 0;
                                const cfg = tierConfig[t.type] || { color: "#7C3AED", label: t.type };
                                const soldOut = remaining <= 0;
                                return (
                                  <div key={t.type}
                                    className="flex items-center justify-between rounded-[10px] transition-all"
                                    style={{
                                      height: "64px",
                                      padding: "0 12px",
                                      border: qty > 0 ? `1.5px solid ${cfg.color}` : "1px solid #E2E8F0",
                                      background: qty > 0 ? `${cfg.color}08` : "#FFFFFF",
                                      opacity: soldOut ? 0.5 : 1,
                                    }}>
                                    {/* Left: indicator + name + price + availability */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="flex-shrink-0 w-2 h-8 rounded-full" style={{ background: cfg.color }}/>
                                      <div className="min-w-0">
                                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{cfg.label}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{formatCurrency(t.price)}</span>
                                          {soldOut
                                            ? <span className="rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 700, background: "#FEE2E2", color: "#EF4444" }}>Sold Out</span>
                                            : <span className="rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, background: "#F1F5F9", color: "#64748B" }}>{remaining} left</span>
                                          }
                                        </div>
                                      </div>
                                    </div>
                                    {/* Right: qty controls */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button disabled={qty === 0 || soldOut}
                                        onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: Math.max(0, (p[t.type]||0)-1) }))}
                                        className="flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                                        style={{ width: "30px", height: "30px", border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                                        âˆ’
                                      </button>
                                      <span style={{ width: "24px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{qty}</span>
                                      <button disabled={soldOut || qty >= remaining}
                                        onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: (p[t.type]||0)+1 }))}
                                        className="flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                                        style={{ width: "30px", height: "30px", border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Full-service qty
                      return (
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "10px" }}>Number of Tickets</p>
                          <div className="flex items-center gap-3 rounded-[10px] p-3" style={{ border: "1px solid #E2E8F0" }}>
                            <button onClick={() => setFullServiceQty(q => Math.max(1, q-1))}
                              className="flex items-center justify-center rounded-lg transition-all"
                              style={{ width: "30px", height: "30px", border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: "16px", fontWeight: 700 }}>âˆ’</button>
                            <span style={{ minWidth: "24px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{fullServiceQty}</span>
                            <button
                              disabled={event.maxAttendees > 0 && fullServiceQty >= (event.maxAttendees - (event.attendeesCount||0))}
                              onClick={() => { const r = event.maxAttendees > 0 ? event.maxAttendees-(event.attendeesCount||0) : Infinity; setFullServiceQty(q => Math.min(q+1, r)); }}
                              className="flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                              style={{ width: "30px", height: "30px", border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: "16px", fontWeight: 700 }}>+</button>
                            <span style={{ fontSize: "13px", color: "#64748B", marginLeft: "4px" }}>Ã— {formatCurrency(event.price)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Session prompt */}
                    {event.eventType === "ticketed" && event.hasMultipleSessions && !selectedSession &&
                      !((event.sessions?.day?.enabled && !event.sessions?.night?.enabled) ||
                        (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) && (
                      <div className="rounded-xl p-3 text-center" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: "12px", color: "#92400E" }}>
                        â° Please select a session above
                      </div>
                    )}

                    {/* â”€â”€ Promo Code â”€â”€ */}
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px", marginTop: "4px" }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A" }}>Promo code</p>
                        {appliedPromo && (
                          <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }}
                            className="flex items-center gap-1 transition-opacity hover:opacity-70"
                            style={{ fontSize: "12px", color: "#EF4444" }}>
                            <X className="h-3.5 w-3.5"/> Remove
                          </button>
                        )}
                      </div>
                      {appliedPromo
                        ? <div className="rounded-lg px-3 py-2.5 flex items-center justify-between"
                            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#16A34A", fontFamily: "monospace" }}>{appliedPromo.code}</span>
                            <span style={{ fontSize: "12px", color: "#16A34A" }}>âœ“ Applied</span>
                          </div>
                        : <div className="flex gap-2">
                            <Input placeholder="Enter promo code" value={promoCode}
                              onChange={e => { setPromoCode(e.target.value); setPromoError(""); }}
                              style={{ height: "40px", fontSize: "13px", borderColor: "#E2E8F0", borderRadius: "8px" }}/>
                            <button onClick={applyPromoCode}
                              className="rounded-lg font-semibold transition-all hover:opacity-90 flex-shrink-0"
                              style={{ height: "40px", padding: "0 14px", fontSize: "13px", border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A" }}>
                              Apply
                            </button>
                          </div>
                      }
                      {promoError && <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px" }}>{promoError}</p>}

                      {/* Collapsible available codes */}
                      <button onClick={() => setShowPromoCodes(v => !v)}
                        style={{ fontSize: "12px", color: "#7C3AED", marginTop: "8px", fontWeight: 500 }}
                        className="hover:opacity-80 transition-opacity">
                        {showPromoCodes ? "â–² Hide codes" : "â–¼ View available codes"}
                      </button>
                      {showPromoCodes && (
                        <div className="mt-2">
                          <AvailablePromoCodes onApply={applyPromoByCode} appliedCode={appliedPromo?.code}
                            eventId={event._id} merchantId={event.createdBy?._id || event.createdBy}
                            context={event.eventType === "fullService" ? "fullServiceEvent" : "ticketedEvent"}
                            itemCategory={event.category}/>
                        </div>
                      )}
                    </div>

                    {/* â”€â”€ Price Summary (conditional) â”€â”€ */}
                    {hasSelection && (
                      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
                        <div className="space-y-2">
                          {event.eventType === "ticketed" && Object.entries(selectedTickets).filter(([,q]) => q > 0).map(([type, qty]) => {
                            const list = getTicketList();
                            const t = list.find(t => t.type === type);
                            return (
                              <div key={type} className="flex justify-between">
                                <span style={{ fontSize: "13px", color: "#64748B", textTransform: "capitalize" }}>{type} Ã— {qty}</span>
                                <span style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{formatCurrency((t?.price||0)*qty)}</span>
                              </div>
                            );
                          })}
                          {event.eventType === "fullService" && (
                            <div className="flex justify-between">
                              <span style={{ fontSize: "13px", color: "#64748B" }}>{fullServiceQty} ticket{fullServiceQty > 1 ? "s" : ""}</span>
                              <span style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{formatCurrency(event.price * fullServiceQty)}</span>
                            </div>
                          )}
                          {appliedPromo && (
                            <div className="flex justify-between">
                              <span style={{ fontSize: "13px", color: "#16A34A" }}>Discount</span>
                              <span style={{ fontSize: "13px", color: "#16A34A", fontWeight: 600 }}>
                                -{formatCurrency(getTicketPrice()-getFinalPrice(), { minimumFractionDigits:0, maximumFractionDigits:0 })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2" style={{ borderTop: "1px solid #E2E8F0", marginTop: "4px" }}>
                            <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Total</span>
                            <span style={{ fontSize: "18px", fontWeight: 800, color: "#7C3AED" }}>
                              {formatCurrency(getFinalPrice(), { minimumFractionDigits:0, maximumFractionDigits:0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* â”€â”€ Action Buttons â”€â”€ */}
                    <div className="flex gap-2 pt-1">
                      <button disabled={!hasSelection}
                        onClick={() => handleAddToCart(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ height: "44px", fontSize: "13px", fontWeight: 600, border: "1.5px solid #7C3AED", color: "#7C3AED", background: "#FFFFFF" }}>
                        <ShoppingBag className="h-4 w-4"/> Add to Cart
                      </button>
                      <button disabled={!hasSelection}
                        onClick={() => handleAddToCart(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ height: "44px", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF", border: "none" }}>
                        <Check className="h-4 w-4"/> Continue to Booking
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div className="mt-10 pt-8" style={{ borderTop: "1px solid #E2E8F0" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "20px" }}>Related Events</h2>
            <div ref={relatedGridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedEvents.map(r => (
                <div key={r._id} onClick={() => navigate(`/customer-dashboard/events/${r._id}`)}
                  className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:shadow-md"
                  style={{ border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "#F1F5F9" }}>
                    {r.image
                      ? <img src={imgSrc(r.image)} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                      : <div className="flex h-full items-center justify-center"><CalendarDays className="h-8 w-8" style={{ color: "#CBD5E1" }}/></div>}
                    {r.category && (
                      <span className="absolute top-2 left-2 rounded-full px-2 py-0.5"
                        style={{ fontSize: "10px", fontWeight: 600, background: "rgba(124,58,237,0.9)", color: "#FFFFFF" }}>
                        {r.category}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2" style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", lineHeight: "18px" }}>{r.title}</h3>
                    {r.datetime && <p style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>{new Date(r.datetime).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Gallery Lightbox */}
      {lightboxIndex !== null && event?.gallery?.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-7 w-7"/>
          </button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i-1+event.gallery.length)%event.gallery.length); }}>â€¹</button>
          <img src={imgSrc(event.gallery[lightboxIndex])} alt={`Gallery ${lightboxIndex+1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}/>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i+1)%event.gallery.length); }}>â€º</button>
          <p className="absolute bottom-4 text-white/50 text-sm">{lightboxIndex+1} / {event.gallery.length}</p>
        </div>
      )}

      {/* View All Reviews Modal */}
      <Dialog open={showAllReviewsModal} onOpenChange={setShowAllReviewsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500"/>
              All Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 pr-2">
            {reviews.map(review => (
              <div key={review._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.customerName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s<=review.score?"fill-yellow-400 text-yellow-400":"text-muted-foreground/30"}`}/>)}
                      </div>
                    </div>
                  </div>
                  {review.ratedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.ratedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                    </span>
                  )}
                </div>
                {review.comment
                  ? <p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>
                  : <p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>);
};
export default CustomerEventDetail;
