import { useParams, Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign, Share2, Heart, Image as ImageIcon, X, ChevronLeft, ChevronRight, Ticket, Check, Tag, Video, Star, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import SimplePayment from "@/components/SimplePayment";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { apiGetEventById, apiCheckFavorite, apiAddFavorite, apiRemoveFavorite, apiValidatePromoCode, apiListEvents, apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { Input } from "@/components/ui/input";
import AvailablePromoCodes from "@/components/AvailablePromoCodes";
import { savePendingEventBooking } from "@/lib/bookingState";
const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, token, role } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState({});
    const [selectedSession, setSelectedSession] = useState(null);
    const [showSeatModal, setShowSeatModal] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [fullServiceQty, setFullServiceQty] = useState(1);
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteId, setFavoriteId] = useState(null);
    const [favLoading, setFavLoading] = useState(false);
    const [relatedEvents, setRelatedEvents] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;
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
    useEffect(() => {
        const loadEvent = async () => {
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
                // If modal is open, check if current session is sold out and switch to available one
                if (showTicketModal && event?.hasMultipleSessions) {
                    const dayEnabled = res.event.sessions?.day?.enabled;
                    const nightEnabled = res.event.sessions?.night?.enabled;
                    const dayAllSoldOut = res.event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                    const nightAllSoldOut = res.event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                    // If current session is sold out, switch to available one
                    if (selectedSession === "day" && dayAllSoldOut && nightEnabled && !nightAllSoldOut) {
                        setSelectedSession("night");
                        setSelectedTickets({});
                    }
                    else if (selectedSession === "night" && nightAllSoldOut && dayEnabled && !dayAllSoldOut) {
                        setSelectedSession("day");
                        setSelectedTickets({});
                    }
                }
            }
            catch (error) {
            }
            finally {
                setLoading(false);
            }
        };
        loadEvent();
        // Real-time polling - refresh every 2 seconds to show live ticket availability
        const pollInterval = setInterval(() => {
            loadEvent();
        }, 2000);
        // Listen for event updates from merchant dashboard
        const handleEventUpdate = (e) => {
            if (e.detail?.eventId === id || !e.detail?.eventId) {
                loadEvent();
            }
        };
        const handleGlobalUpdate = () => {
            loadEvent();
        };
        window.addEventListener('eventUpdated', handleEventUpdate);
        window.addEventListener('eventCreated', handleEventUpdate);
        window.addEventListener('globalEventUpdate', handleGlobalUpdate);
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('eventUpdated', handleEventUpdate);
            window.removeEventListener('eventCreated', handleEventUpdate);
            window.removeEventListener('globalEventUpdate', handleGlobalUpdate);
        };
    }, [id]);
    // Check favorite status when event loads
    useEffect(() => {
        if (!event || !isLoggedIn || !token)
            return;
        apiCheckFavorite("event", event._id, token)
            .then((res) => {
            setIsFavorited(res.isFavorited);
            setFavoriteId(res.favoriteId || null);
        })
            .catch(() => { });
    }, [event?._id, isLoggedIn, token]);
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
    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => toast.success("Link copied to clipboard!"))
            .catch(() => toast.error("Failed to copy link"));
    };
    // Refresh event data when payment modal closes to get updated ticket counts
    useEffect(() => {
        if (!showPaymentModal && event && id) {
            const refreshEvent = async () => {
                try {
                    const res = await apiGetEventById(id);
                    setEvent(res.event);
                }
                catch (error) {
                }
            };
            refreshEvent();
        }
    }, [showPaymentModal]);
    const handleBookEvent = () => {
        if (!isLoggedIn || !token) {
            const returnUrl = `/customer-dashboard/events/${id}`;
            savePendingEventBooking({
                eventId: id,
                eventTitle: event.title,
                selectedTickets: {},
                selectedSession: null,
                fullServiceQty: 1,
                promoCode: appliedPromo?.code || promoCode,
                returnTo: returnUrl
            });
            localStorage.setItem("authReturnTo", returnUrl);
            toast.error("Please sign in to book this event");
            navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
            return;
        }
        // Seats already selected inline — go straight to payment
        setShowPaymentModal(true);
    };
    const handleProceedToPayment = () => {
        if (event.hasMultipleSessions && !selectedSession) {
            toast.error("Please select a session (Day or Night)");
            return;
        }
        if (Object.keys(selectedTickets).length === 0 || !Object.values(selectedTickets).some((q) => q > 0)) {
            toast.error("Please select at least one ticket");
            return;
        }
        setShowTicketModal(false);
        setShowPaymentModal(true);
    };
    const getTicketPrice = () => {
        if (event.eventType === "ticketed") {
            let totalPrice = 0;
            if (event.hasMultipleSessions && selectedSession) {
                // Day/Night sessions
                const sessionData = event.sessions?.[selectedSession];
                if (sessionData?.tickets) {
                    Object.entries(selectedTickets).forEach(([ticketType, quantity]) => {
                        const ticket = sessionData.tickets.find((t) => t.type === ticketType);
                        totalPrice += (ticket?.price || 0) * quantity;
                    });
                }
            }
            else {
                // Single session
                Object.entries(selectedTickets).forEach(([ticketType, quantity]) => {
                    const ticket = event.tickets?.find((t) => t.type === ticketType);
                    totalPrice += (ticket?.price || 0) * quantity;
                });
            }
            return totalPrice;
        }
        // fullService: multiply by quantity
        return event.price * fullServiceQty;
    };
    const applyPromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        try {
            setPromoError("");
            const data = await apiValidatePromoCode(promoCode.toUpperCase(), getTicketPrice(), event._id, undefined, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo code applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const removePromoCode = () => {
        setAppliedPromo(null);
        setPromoCode("");
        setPromoError("");
    };
    const applyPromoByCode = async (code) => {
        if (!code?.trim())
            return;
        try {
            setPromoCode(code);
            setPromoError("");
            const data = await apiValidatePromoCode(code.toUpperCase(), getTicketPrice(), event?._id, undefined, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo code applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const getFinalPrice = () => {
        const basePrice = getTicketPrice();
        if (!appliedPromo)
            return basePrice;
        let discount = 0;
        if (appliedPromo.discountType === "percentage") {
            discount = (basePrice * appliedPromo.discountValue) / 100;
            if (appliedPromo.maxDiscount) {
                discount = Math.min(discount, appliedPromo.maxDiscount);
            }
        }
        else {
            discount = appliedPromo.discountValue;
        }
        return Math.max(0, basePrice - discount);
    };
    // No restore needed - user will be redirected back to this page after login and can book normally
    const handlePaymentSuccess = (booking) => {
        setShowPaymentModal(false);
        toast.success("Payment successful! Your booking is being reviewed.");
        navigate("/customer-dashboard/bookings");
    };
    const handlePaymentError = (error) => {
    };
    if (loading) {
        return (<Layout>
        <div className="container mx-auto py-20 text-center">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </Layout>);
    }
    if (!event) {
        return (<Layout>
        <div className="container mx-auto py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Event Not Found</h1>
          <Link to="/events" className="mt-4 inline-block text-primary hover:underline">Back to Events</Link>
        </div>
      </Layout>);
    }
    const attendeesCount = event.attendeesCount || 0;
    const maxAttendees = event.maxAttendees || 0;
    const progress = maxAttendees > 0 ? Math.min(100, Math.round((attendeesCount / maxAttendees) * 100)) : 0;
    return (<Layout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="px-3 sm:px-6 lg:px-12">
          <Link to="/events" className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4"/> Back to Events
          </Link>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 mt-4 sm:mt-6">
            {/* Main */}
            <div className="lg:w-1/2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="relative h-64 overflow-hidden rounded-xl md:h-96">
                  <img src={imgSrc(event.image)} alt={event.title} className="h-full w-full object-cover"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                  <span className="absolute top-4 left-4 rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                    {event.category}
                  </span>
                </div>
                
                {/* Gallery Images Section */}
                {event.gallery && event.gallery.length > 0 && (<div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-xl font-semibold">Event Gallery ({event.gallery.length})</h3>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowGallery(!showGallery)}>
                        {showGallery ? "Hide Gallery" : "View Gallery"}
                      </Button>
                    </div>
                    {showGallery && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {event.gallery.map((img, idx) => (<motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer" onClick={() => setSelectedImageIndex(idx)}>
                            <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all"/>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                                <ImageIcon className="h-6 w-6 text-primary"/>
                              </div>
                            </div>
                          </motion.div>))}
                      </div>)}
                  </div>)}
                
                <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">{event.title}</h1>
                {/* Rating display */}
                {event.averageRating && event.averageRating > 0 ? (<div className="flex items-center gap-1.5 mt-2">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0"/>
                    <span className="text-sm font-semibold text-foreground">
                      {event.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({event.ratingCount || 0} reviews)
                    </span>
                  </div>) : null}
                {(event.createdBy?.name || event.merchant) && (<p className="mt-2 text-sm text-muted-foreground">Hosted by <span className="text-primary">{event.createdBy?.name || event.merchant}</span></p>)}
                <p className="mt-6 text-muted-foreground leading-relaxed">{event.description}</p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Join us for an extraordinary experience that brings together enthusiasts from around the world. 
                  This event features top-tier speakers, interactive sessions, networking opportunities, and much more. 
                  Whether you're a seasoned professional or just starting out, there's something for everyone.
                </p>

                {/* Reviews Section */}
                <div className="mt-8 border-t border-border pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500"/>
                      Customer Reviews ({reviews.length})
                    </h3>
                    {reviews.length > 2 && (<Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowAllReviewsModal(true)}>
                        View All
                      </Button>)}
                  </div>

                  {reviews.length === 0 ? (<p className="text-sm text-muted-foreground italic">No reviews yet for this event.</p>) : (<div className="space-y-4">
                      {reviews.slice(0, 2).map((review) => (<div key={review._id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {review.customerName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{review.customerName}</p>
                                <div className="flex gap-0.5 mt-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`h-3 w-3 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}/>))}
                                </div>
                              </div>
                            </div>
                            {review.ratedAt && (<span className="text-xs text-muted-foreground">
                                {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })}
                              </span>)}
                          </div>
                          {review.comment ? (<p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>) : (<p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>)}
                        </div>))}
                    </div>)}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:w-1/2">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 space-y-5">

                {/* ── Live event block ─────────────────────────────────── */}
                {event.live ? (<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center mb-2">
                    <Video className="mx-auto h-8 w-8 text-red-500 opacity-70 mb-2"/>
                    <p className="font-semibold text-red-500">Live Event — View Only</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This event is currently live and cannot be booked.
                    </p>
                  </div>) : null}

                {/* ── Header price — always visible ────────────────────── */}
                {event.eventType === "ticketed" ? (<div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary"/>
                    <span className="font-display text-lg font-semibold">
                      {event.live ? "Event Details" : "Book This Event"}
                    </span>
                  </div>) : (<div className="flex items-center justify-between">
                    <span className="font-display text-3xl font-bold text-gradient">{formatCurrency(event.price)}</span>
                    <span className="text-sm text-muted-foreground">per person</span>
                  </div>)}

                {/* ── Event meta — always visible ──────────────────────── */}
                <div className="space-y-3">
                  {[
            { icon: Calendar, label: event.datetime ? new Date(event.datetime).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : null },
            { icon: Clock, label: event.datetime ? new Date(event.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null },
            { icon: MapPin, label: event.location },
        ].map(({ icon: Icon, label }) => label ? (<div key={String(label)} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary"/>
                      {label}
                    </div>) : null)}
                </div>

                {/* ── Attendees bar (fullService) — always visible ─────── */}
                {event.eventType === "fullService" && (<div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> Attendees</span>
                      <span className="text-foreground font-medium">
                        {attendeesCount}{maxAttendees > 0 ? ` / ${maxAttendees}` : " booked"}
                        {maxAttendees > 0 && attendeesCount >= maxAttendees && (<span className="ml-2 text-red-500 font-semibold text-xs">Full</span>)}
                      </span>
                    </div>
                    {maxAttendees > 0 && (<div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }}/>
                      </div>)}
                  </div>)}

                {!event.live && (<>
                {isLoggedIn && role === "customer" ? (<>
                    {/* Session selector for day/night events */}
                    {event.eventType === "ticketed" && event.hasMultipleSessions &&
                    event.sessions?.day?.enabled && event.sessions?.night?.enabled && (<div>
                        <p className="text-sm font-semibold mb-2">Select Session</p>
                        <div className="grid grid-cols-2 gap-2">
                          {["day", "night"].map(sess => {
                        const soldOut = event.sessions?.[sess]?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                        return (<button key={sess} disabled={soldOut} onClick={() => { setSelectedSession(sess); setSelectedTickets({}); }} className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedSession === sess ? "border-primary bg-primary/10 text-primary"
                                : soldOut ? "border-red-500/30 bg-red-500/5 text-red-500 opacity-60 cursor-not-allowed"
                                    : "border-border bg-card hover:border-primary/50"}`}>
                                <div className="text-lg mb-1">{sess === "day" ? "☀️" : "🌙"}</div>
                                <div className="capitalize">{sess} Session</div>
                                <div className="text-xs text-muted-foreground mt-1">{event.sessions?.[sess]?.time}</div>
                                {soldOut && <div className="text-xs font-bold mt-1 text-red-500">SOLD OUT</div>}
                              </button>);
                    })}
                        </div>
                      </div>)}

                    {/* Ticket quantity selectors */}
                    {event.eventType === "ticketed" ? (<div className="space-y-2">
                        <p className="text-sm font-semibold flex items-center gap-2"><Ticket className="h-4 w-4 text-primary"/> Select Tickets</p>
                        {(() => {
                        const tickets = event.hasMultipleSessions && selectedSession
                            ? event.sessions?.[selectedSession]?.tickets
                            : event.tickets;
                        if (!tickets?.length)
                            return <p className="text-xs text-muted-foreground">No tickets available</p>;
                        const tierStyle = {
                            diamond: { emoji: "💎", bg: "bg-cyan-500/10", border: "border-cyan-500/40", label: "text-cyan-300 font-bold", price: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
                            gold: { emoji: "🥇", bg: "bg-yellow-500/10", border: "border-yellow-500/40", label: "text-yellow-300 font-bold", price: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
                            silver: { emoji: "🥈", bg: "bg-slate-400/10", border: "border-slate-400/40", label: "text-slate-300 font-bold", price: "text-slate-300", badge: "bg-slate-400/20 text-slate-300 border-slate-400/30" },
                        };
                        return tickets.map((t) => {
                            const remaining = (t.available || 0) - (t.sold || 0);
                            const qty = selectedTickets[t.type] || 0;
                            const s = tierStyle[t.type] || { emoji: "🎫", bg: "bg-primary/10", border: "border-primary/30", label: "text-primary font-bold", price: "text-primary", badge: "bg-primary/20 text-primary border-primary/30" };
                            return (<div key={t.type} className={`flex items-center justify-between p-3 rounded-xl border-2 ${s.border} ${s.bg} transition-all ${qty > 0 ? "ring-1 ring-offset-1 ring-offset-background " + s.border : ""}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{s.emoji}</span>
                                  <div>
                                    <span className={`text-sm capitalize ${s.label}`}>{t.type}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-sm font-bold ${s.price}`}>{formatCurrency(t.price)}</span>
                                      {remaining <= 0
                                    ? <span className="text-xs text-red-400 font-semibold">Sold Out</span>
                                    : <span className={`text-xs px-1.5 py-0.5 rounded-full border ${s.badge}`}>Available</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button disabled={qty === 0} onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: Math.max(0, (p[t.type] || 0) - 1) }))} className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold disabled:opacity-40 transition-colors">−</button>
                                  <span className={`w-6 text-center font-bold text-sm ${qty > 0 ? s.price : ""}`}>{qty}</span>
                                  <button disabled={remaining <= 0 || qty >= remaining} onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: (p[t.type] || 0) + 1 }))} className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold disabled:opacity-40 transition-colors">+</button>
                                </div>
                              </div>);
                        });
                    })()}
                      </div>) : (<div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Users className="h-4 w-4 text-primary"/> Number of Tickets
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => setFullServiceQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 font-bold text-lg transition-colors">−</button>
                          <span className="w-10 text-center font-semibold text-lg">{fullServiceQty}</span>
                          <button disabled={event.maxAttendees > 0 && fullServiceQty >= (event.maxAttendees - (event.attendeesCount || 0))} onClick={() => {
                        const remaining = event.maxAttendees > 0 ? (event.maxAttendees - (event.attendeesCount || 0)) : Infinity;
                        setFullServiceQty(q => Math.min(q + 1, remaining));
                    }} className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 font-bold text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                          <span className="text-xs text-muted-foreground ml-1">× {formatCurrency(event.price)} each</span>
                        </div>
                      </div>)}

                    {/* ── Promo code ─────────────────────────────────────── */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-amber-600"/>
                        <p className="text-sm font-semibold text-amber-600">Promo Code</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input placeholder="Enter code" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }} className="text-sm h-8"/>
                          <Button onClick={applyPromoCode} size="sm" variant="outline" className="h-8">Apply</Button>
                        </div>
                        {promoError && <p className="text-xs text-red-500">{promoError}</p>}
                      </div>
                      <AvailablePromoCodes onApply={applyPromoByCode} appliedCode={appliedPromo?.code} eventId={event._id} merchantId={event.createdBy?._id || event.createdBy} context={event.eventType === "fullService" ? "fullServiceEvent" : "ticketedEvent"} itemCategory={event.category}/>
                    </div>

                    {/* ── Price summary ──────────────────────────────────── */}
                    <div className="space-y-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      {appliedPromo && (<div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="line-through text-muted-foreground">{formatCurrency(getTicketPrice())}</span>
                        </div>)}
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-semibold">Total:</span>
                        <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      {appliedPromo && (<p className="text-xs text-green-600 font-semibold">
                          You save {formatCurrency(getTicketPrice() - getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>)}
                    </div>

                    {/* ── Confirm Booking button — gated behind seat selection ── */}
                    <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed" size="lg" onClick={handleBookEvent} disabled={
                // ticketed: must have at least 1 seat selected
                (event.eventType === "ticketed" && Object.values(selectedTickets).reduce((s, q) => s + q, 0) === 0) ||
                    // fullService: must have qty > 0 and not full
                    (event.eventType === "fullService" && (fullServiceQty === 0 || (maxAttendees > 0 && attendeesCount >= maxAttendees))) ||
                    // sold out checks
                    (event.eventType === "ticketed" && (() => {
                        if (event.hasMultipleSessions) {
                            const d = event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                            const n = event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                            return d && n;
                        }
                        return event.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                    })())}>
                      <DollarSign className="mr-2 h-4 w-4"/>
                      {(() => {
                    if (event.eventType === "ticketed") {
                        const soldOut = event.hasMultipleSessions
                            ? event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0) &&
                                event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0)
                            : event.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                        if (soldOut)
                            return "Sold Out";
                        const total = Object.values(selectedTickets).reduce((s, q) => s + q, 0);
                        return total === 0 ? "Select Tickets to Continue" : `Confirm Booking — ${formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                    }
                    if (maxAttendees > 0 && attendeesCount >= maxAttendees)
                        return "Full";
                    return fullServiceQty === 0 ? "Select Tickets to Continue" : `Confirm Booking — ${formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                })()}
                    </Button>
                  </>) : (
            /* ── Not logged in or not a customer: show price + login prompt ── */
            <>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-3">
                      <Ticket className="h-8 w-8 text-primary mx-auto"/>
                      <p className="text-sm font-semibold">Sign in as a customer to select seats and book</p>
                      <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={handleBookEvent}>
                        Sign In to Book
                      </Button>
                    </div>
                  </>)}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleToggleFavorite} disabled={favLoading}>
                    <Heart className={`mr-2 h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}/>
                    {isFavorited ? "Saved" : "Save"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4"/> Share
                  </Button>
                </div>

                {/* Organiser contact */}
                {event.createdBy && (<div className="mt-4 rounded-lg bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Event Organiser</p>
                    <p className="font-semibold text-sm">{event.createdBy.name}</p>
                    {event.createdBy.email && (<a href={`mailto:${event.createdBy.email}`} className="text-xs text-primary hover:underline mt-1 block">
                        📧 {event.createdBy.email}
                      </a>)}
                  </div>)}
                </>)}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Related Events Section */}
        {relatedEvents.length > 0 && (<div className="px-3 sm:px-6 lg:px-12 mt-16 pt-12 pb-16 border-t border-border w-full relative z-10">
            <h2 className="font-display text-3xl font-black tracking-tight mb-8">Related Events</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {relatedEvents.map((r) => (<div key={r._id} onClick={() => navigate(`/events/${r._id}`)} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden flex-shrink-0">
                    {r.image ? (<img src={imgSrc(r.image)} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center">
                        <CalendarDays className="h-8 w-8 opacity-20"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    {r.category && (<span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                        {r.category}
                      </span>)}
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-primary">
                      {(() => {
                    if (r.eventType === "ticketed" && r.tickets?.length > 0) {
                        const minPrice = Math.min(...r.tickets.map((t) => t.price || 0).filter((p) => p > 0));
                        return minPrice > 0 ? `From ${formatCurrency(minPrice)}` : `From ${formatCurrency(r.price || 0)}`;
                    }
                    if (r.eventType === "ticketed" && r.hasMultipleSessions) {
                        return `From ${formatCurrency(r.price || 0)}`;
                    }
                    return r.price > 0 ? `From ${formatCurrency(r.price)}` : `From ${formatCurrency(0)}`;
                })()}
                    </span>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col flex-1">
                    <Link to={`/events/${r._id}`}>
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer">
                        {r.title}
                      </h3>
                    </Link>
                    {r.averageRating && r.averageRating > 0 ? (<div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0"/>
                        <span className="text-xs font-semibold">
                          {r.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({r.ratingCount || 0})
                        </span>
                      </div>) : null}
                    {r.createdBy?.name && (<p className="text-[10px] text-muted-foreground mt-1">
                        Hosted by <span className="font-medium text-foreground">{r.createdBy.name}</span>
                      </p>)}
                    <ul className="mt-3 space-y-1">
                      {r.category && (<li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>
                          {r.category} event
                        </li>)}
                      {r.datetime && (<li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>
                          {new Date(r.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </li>)}
                      {r.location && (<li className="flex items-center gap-2 text-xs text-muted-foreground line-clamp-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>
                          {r.location}
                        </li>)}
                    </ul>
                  </div>
                </div>))}
            </div>
          </div>)}
      </section>

      {/* Image Lightbox Modal */}
      {selectedImageIndex !== null && event.gallery && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={() => setSelectedImageIndex(null)}>
          <div className="relative max-w-7xl max-h-screen p-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setSelectedImageIndex(null)} className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
              <X className="h-6 w-6"/>
            </button>

            {/* Previous button */}
            {selectedImageIndex > 0 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="h-8 w-8"/>
              </button>)}

            {/* Next button */}
            {selectedImageIndex < event.gallery.length - 1 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="h-8 w-8"/>
              </button>)}

            {/* Image */}
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} src={imgSrc(event.gallery[selectedImageIndex])} alt={`Gallery ${selectedImageIndex + 1}`} className="max-h-[85vh] max-w-full object-contain rounded-lg"/>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
              {selectedImageIndex + 1} / {event.gallery.length}
            </div>
          </div>
        </motion.div>)}

      {/* Ticket Selection Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary"/>
              Select Your Tickets
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Day/Night Session Selection - Only show if BOTH sessions are enabled */}
            {event?.hasMultipleSessions && event.sessions?.day?.enabled && event.sessions?.night?.enabled && (<div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm font-semibold text-purple-600 mb-3">Select Session</p>
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                const dayAllSoldOut = event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                const nightAllSoldOut = event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                return (<>
                        <button onClick={() => {
                        if (!dayAllSoldOut) {
                            setSelectedSession("day");
                            setSelectedTickets({});
                        }
                    }} disabled={dayAllSoldOut} className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${selectedSession === "day"
                        ? "border-primary bg-primary/10 text-primary"
                        : dayAllSoldOut
                            ? "border-red-500/30 bg-red-500/5 text-red-500 cursor-not-allowed opacity-60"
                            : "border-border bg-card hover:border-primary/50"}`}>
                          <div className="text-lg">☀️</div>
                          <div>Day Session</div>
                          <div className="text-xs text-muted-foreground mt-1">{event.sessions?.day?.time}</div>
                          {dayAllSoldOut && <div className="text-xs font-semibold mt-1">SOLD OUT</div>}
                        </button>
                        <button onClick={() => {
                        if (!nightAllSoldOut) {
                            setSelectedSession("night");
                            setSelectedTickets({});
                        }
                    }} disabled={nightAllSoldOut} className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${selectedSession === "night"
                        ? "border-primary bg-primary/10 text-primary"
                        : nightAllSoldOut
                            ? "border-red-500/30 bg-red-500/5 text-red-500 cursor-not-allowed opacity-60"
                            : "border-border bg-card hover:border-primary/50"}`}>
                          <div className="text-lg">🌙</div>
                          <div>Night Session</div>
                          <div className="text-xs text-muted-foreground mt-1">{event.sessions?.night?.time}</div>
                          {nightAllSoldOut && <div className="text-xs font-semibold mt-1">SOLD OUT</div>}
                        </button>
                      </>);
            })()}
                </div>
              </div>)}

            {!event?.hasMultipleSessions && (<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-600">
                  📌 Book any number of available tickets
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total selected: {Object.values(selectedTickets).reduce((sum, q) => sum + q, 0)}
                </p>
              </div>)}

            {event?.hasMultipleSessions && (event.sessions?.day?.enabled && event.sessions?.night?.enabled) && selectedSession && (<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-600">
                  📌 Book any number of available tickets
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total selected: {Object.values(selectedTickets).reduce((sum, q) => sum + q, 0)}
                </p>
              </div>)}

            {event?.hasMultipleSessions && (event.sessions?.day?.enabled && event.sessions?.night?.enabled) && !selectedSession && (<div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-semibold text-amber-600">
                  ⏰ Please select a session above to view available tickets
                </p>
              </div>)}

            {event?.hasMultipleSessions && event.sessions?.day?.enabled && !event.sessions?.night?.enabled && (<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-600">
                  ☀️ Day Session - {event.sessions?.day?.time}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  📌 Book any number of available tickets | Total selected: {Object.values(selectedTickets).reduce((sum, q) => sum + q, 0)}
                </p>
              </div>)}

            {event?.hasMultipleSessions && !event.sessions?.day?.enabled && event.sessions?.night?.enabled && (<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-600">
                  🌙 Night Session - {event.sessions?.night?.time}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  📌 Book any number of available tickets | Total selected: {Object.values(selectedTickets).reduce((sum, q) => sum + q, 0)}
                </p>
              </div>)}

            {/* Tickets Display */}
            {event?.hasMultipleSessions ? (
        // Day/Night session tickets - show if session is selected OR if only one session is enabled
        (selectedSession || (event.sessions?.day?.enabled && !event.sessions?.night?.enabled) || (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) ? (<>
                  {/* Show session info and check if sold out */}
                  {selectedSession && (<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                      <p className="text-sm font-semibold text-blue-600">
                        {selectedSession === "day" ? "☀️ Day Session - " : "🌙 Night Session - "}
                        {selectedSession === "day" ? event.sessions?.day?.time : event.sessions?.night?.time}
                      </p>
                    </div>)}
                  
                  {/* Check if selected session is completely sold out */}
                  {selectedSession && event.sessions?.[selectedSession]?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0) ? (<div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm font-semibold text-red-600 mb-3">
                        ❌ {selectedSession === "day" ? "Day" : "Night"} Session - All Tickets Sold Out
                      </p>
                      {event.sessions?.day?.enabled && event.sessions?.night?.enabled && selectedSession === "day" && !event.sessions?.night?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0) && (<div className="space-y-2">
                          <p className="text-xs text-red-500">💡 Day session tickets are completely sold out</p>
                          <button onClick={() => {
                        setSelectedSession("night");
                        setSelectedTickets({});
                    }} className="w-full px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors">
                            Switch to Night Session 🌙
                          </button>
                        </div>)}
                      {event.sessions?.day?.enabled && event.sessions?.night?.enabled && selectedSession === "night" && !event.sessions?.day?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0) && (<div className="space-y-2">
                          <p className="text-xs text-red-500">💡 Night session tickets are completely sold out</p>
                          <button onClick={() => {
                        setSelectedSession("day");
                        setSelectedTickets({});
                    }} className="w-full px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold transition-colors">
                            Switch to Day Session ☀️
                          </button>
                        </div>)}
                    </div>) : (event.sessions?.[selectedSession || (event.sessions?.day?.enabled ? "day" : "night")]?.tickets?.map((ticket) => {
                const remaining = (ticket.available || 0) - (ticket.sold || 0);
                const isSoldOut = remaining <= 0;
                const quantity = selectedTickets[ticket.type] || 0;
                return (<div key={ticket.type} className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-display font-semibold capitalize text-lg">{ticket.type}</p>
                              <p className="text-sm text-muted-foreground">{formatCurrency(ticket.price)} per ticket</p>
                            </div>
                            <div className="text-right">
                              {isSoldOut ? (<span className="text-red-500 text-sm font-semibold">SOLD OUT</span>) : (<span className="text-green-500 text-sm font-semibold">Available</span>)}
                            </div>
                          </div>
                          
                          {!isSoldOut && (<div className="flex items-center gap-3">
                              <button onClick={() => {
                            if (quantity > 0) {
                                setSelectedTickets(prev => ({
                                    ...prev,
                                    [ticket.type]: quantity - 1
                                }));
                            }
                        }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-semibold">
                                −
                              </button>
                              <input type="number" min="0" value={quantity} onChange={(e) => {
                            const newQuantity = Math.max(0, Math.min(remaining, parseInt(e.target.value) || 0));
                            setSelectedTickets(prev => ({
                                ...prev,
                                [ticket.type]: newQuantity
                            }));
                        }} className="flex-1 text-center px-3 py-2 rounded-lg bg-card border border-border font-semibold"/>
                              <button onClick={() => {
                            if (quantity < remaining) {
                                setSelectedTickets(prev => ({
                                    ...prev,
                                    [ticket.type]: quantity + 1
                                }));
                            }
                        }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={quantity >= remaining}>
                                +
                              </button>
                              {quantity > 0 && (<div className="text-right">
                                  <p className="text-sm font-semibold text-primary">{formatCurrency(ticket.price * quantity)}</p>
                                </div>)}
                            </div>)}
                        </div>);
            }))}
                </>) : null) : (
        // Single session tickets
        event?.tickets?.map((ticket) => {
            const remaining = (ticket.available || 0) - (ticket.sold || 0);
            const isSoldOut = remaining <= 0;
            const quantity = selectedTickets[ticket.type] || 0;
            return (<div key={ticket.type} className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-display font-semibold capitalize text-lg">{ticket.type}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(ticket.price)} per ticket</p>
                      </div>
                      <div className="text-right">
                        {isSoldOut ? (<span className="text-red-500 text-sm font-semibold">SOLD OUT</span>) : (<span className="text-green-500 text-sm font-semibold">Available</span>)}
                      </div>
                    </div>
                    
                    {!isSoldOut && (<div className="flex items-center gap-3">
                        <button onClick={() => {
                        if (quantity > 0) {
                            setSelectedTickets(prev => ({
                                ...prev,
                                [ticket.type]: quantity - 1
                            }));
                        }
                    }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-semibold">
                          −
                        </button>
                        <input type="number" min="0" value={quantity} onChange={(e) => {
                        const newQuantity = Math.max(0, Math.min(remaining, parseInt(e.target.value) || 0));
                        setSelectedTickets(prev => ({
                            ...prev,
                            [ticket.type]: newQuantity
                        }));
                    }} className="flex-1 text-center px-3 py-2 rounded-lg bg-card border border-border font-semibold"/>
                        <button onClick={() => {
                        if (quantity < remaining) {
                            setSelectedTickets(prev => ({
                                ...prev,
                                [ticket.type]: quantity + 1
                            }));
                        }
                    }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={quantity >= remaining}>
                          +
                        </button>
                        {quantity > 0 && (<div className="text-right">
                            <p className="text-sm font-semibold text-primary">{formatCurrency(ticket.price * quantity)}</p>
                          </div>)}
                      </div>)}
                  </div>);
        }))}
          </div>

          {Object.keys(selectedTickets).length > 0 && Object.values(selectedTickets).some((q) => q > 0) && (<div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-lg font-semibold">Total Price:</span>
                <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(getTicketPrice())}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                {Object.entries(selectedTickets).map(([type, qty]) => {
                if (qty > 0) {
                    let ticket;
                    if (event?.hasMultipleSessions && selectedSession) {
                        ticket = event.sessions?.[selectedSession]?.tickets?.find((t) => t.type === type);
                    }
                    else {
                        ticket = event?.tickets?.find((t) => t.type === type);
                    }
                    return (<p key={type} className="capitalize flex items-center justify-between">
                        <span>{type} × {qty}</span>
                        <span>{formatCurrency((ticket?.price || 0) * qty)}</span>
                      </p>);
                }
            })}
              </div>
            </div>)}

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowTicketModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleProceedToPayment} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={!Object.values(selectedTickets).some((q) => q > 0)}>
              <Check className="mr-2 h-4 w-4"/>
              Proceed to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment & Booking Details</DialogTitle>
          </DialogHeader>
          {event && (<>
              <SimplePayment amount={getFinalPrice()} bookingData={{
                eventName: event.title,
                eventId: event._id,
                date: new Date(event.datetime).toISOString().split('T')[0],
                time: new Date(event.datetime).toTimeString().split(' ')[0].slice(0, 5),
                selectedTickets: event.eventType === "fullService" ? undefined : selectedTickets,
                selectedSession: selectedSession,
                quantity: event.eventType === "fullService" ? fullServiceQty : undefined,
                promoCode: appliedPromo,
                originalAmount: getTicketPrice(),
                discount: getTicketPrice() - getFinalPrice(),
            }} onSuccess={handlePaymentSuccess} onError={handlePaymentError} onClose={() => setShowPaymentModal(false)}/>
            </>)}
        </DialogContent>
      </Dialog>

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
            {reviews.map((review) => (<div key={review._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.customerName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`h-3 w-3 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}/>))}
                      </div>
                    </div>
                  </div>
                  {review.ratedAt && (<span className="text-xs text-muted-foreground">
                      {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                })}
                    </span>)}
                </div>
                {review.comment ? (<p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>) : (<p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>)}
              </div>))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>);
};
export default EventDetail;
