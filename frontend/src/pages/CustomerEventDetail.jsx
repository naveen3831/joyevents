import { useState, useEffect } from "react";
import { formatCurrency, formatEventSchedule, formatTime12 } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  Heart,
  Share2,
  Ticket,
  X,
  Check,
  Star,
  Video,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Sun,
  Moon,
  CalendarDays
} from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  apiGetEventById,
  apiCheckFavorite,
  apiAddFavorite,
  apiRemoveFavorite,
  apiValidatePromoCode,
  apiListEvents,
  apiGetPublicReviews
} from "@/lib/api";
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
        if (!id) return;
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
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [lightboxIndex, setLightboxIndex] = useState(null);

    // Favorites
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteId, setFavoriteId] = useState(null);
    const [favLoading, setFavLoading] = useState(false);

    const imgSrc = (img) => (!img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`);

    // Load + poll
    useEffect(() => {
        const load = async (initial = false) => {
            if (initial) setLoading(true);
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
            } catch {
                if (initial) {
                    toast.error("Failed to load event");
                    navigate("/customer-dashboard/browse-events");
                }
            } finally {
                if (initial) setLoading(false);
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
        if (!event || !isLoggedIn || !token) return;
        apiCheckFavorite("event", event._id, token)
            .then((res) => { setIsFavorited(res.isFavorited); setFavoriteId(res.favoriteId || null); })
            .catch(() => {});
    }, [event?._id, isLoggedIn, token]);

    // Restore pending booking after login redirect
    useEffect(() => {
        if (!isLoggedIn || !event) return;
        const pending = getPendingEventBooking();
        if (!pending || pending.eventId !== id) return;
        clearPendingEventBooking();
        setSelectedTickets(pending.selectedTickets || {});
        setSelectedSession(pending.selectedSession || null);
        setFullServiceQty(pending.fullServiceQty || 1);
        setPromoCode(pending.promoCode || "");
        if (pending.promoCode) {
            applyPromoByCode(pending.promoCode);
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
            } else {
                const res = await apiAddFavorite(event._id, null, "event", token);
                setIsFavorited(true);
                setFavoriteId(res.favorite?._id || null);
                toast.success("Saved to favorites");
            }
        } catch {
            toast.error("Failed to update favorites");
        } finally {
            setFavLoading(false);
        }
    };

    const getTicketPrice = () => {
        if (!event) return 0;
        if (event.eventType === "ticketed") {
            let total = 0;
            if (event.hasMultipleSessions && selectedSession) {
                const tickets = event.sessions?.[selectedSession]?.tickets || [];
                Object.entries(selectedTickets).forEach(([type, qty]) => {
                    const t = tickets.find((t) => t.type === type);
                    total += (t?.price || 0) * qty;
                });
            } else {
                Object.entries(selectedTickets).forEach(([type, qty]) => {
                    const t = event.tickets?.find((t) => t.type === type);
                    total += (t?.price || 0) * qty;
                });
            }
            return total;
        }
        return (event.price || 0) * fullServiceQty;
    };

    const getFinalPrice = () => {
        const base = getTicketPrice();
        if (!appliedPromo) return base;
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
        } catch (error) {
            setPromoError(error?.message || "Failed to apply promo code");
            setAppliedPromo(null);
            toast.error(error?.message || "Failed to apply promo code");
        }
    };

    const handleAddToCart = (redirectAfterAdding = false) => {
        if (!isLoggedIn || !token) {
            const returnUrl = `/customer-dashboard/events/${id}`;
            savePendingEventBooking({
                eventId: id,
                eventTitle: event.title,
                selectedTickets,
                selectedSession,
                fullServiceQty,
                promoCode,
                returnTo: returnUrl,
            });
            localStorage.setItem("authReturnTo", returnUrl);
            toast.error("Please sign in to book");
            navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
            return;
        }
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
                quantity: event.eventType === "fullService" ? fullServiceQty : undefined
            },
            appliedPromo
        });
        if (redirectAfterAdding) {
            navigate("/customer-dashboard/cart");
        }
    };

    const isSoldOut = () => {
        if (!event) return false;
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

    const relatedGridRef = useGsapStagger([relatedEvents.length]);

    if (loading) {
        return (
            <CustomerLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm font-medium">Loading event details...</p>
                </div>
            </CustomerLayout>
        );
    }

    if (!event) return null;

    const attendeesCount = event.attendeesCount || 0;
    const maxAttendees = event.maxAttendees || 0;
    const availableSpots = maxAttendees > 0 ? Math.max(0, maxAttendees - attendeesCount) : null;
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

    const formatTitle = (titleStr) => {
        const str = renderText(titleStr);
        if (!str) return "";
        if (str === str.toLowerCase()) {
            return str.replace(/\b\w/g, (c) => c.toUpperCase());
        }
        return str;
    };

    const formatShortLocation = (loc) => {
        const raw = renderText(loc);
        if (!raw) return "Venue details inside";
        const parts = raw.split(",").map(p => p.trim()).filter(Boolean);
        if (parts.length <= 2) return raw;
        const venue = parts[0];
        const cityOrState = parts.find(p => /hyderabad|bengaluru|bangalore|mumbai|delhi|chennai|pune|kolkata|ahmedabad|jaipur|telangana/i.test(p)) || parts[parts.length - 2] || parts[1];
        return `${venue}, ${cityOrState}`;
    };

    const getPrimaryTicketPrice = () => {
        if (!event) return 0;
        if (event.eventType === "fullService") return event.price || 0;
        if (event.tickets?.length) return event.tickets[0]?.price || 0;
        if (event.sessions?.day?.tickets?.length) return event.sessions.day.tickets[0]?.price || 0;
        return event.price || 0;
    };

    return (
        <CustomerLayout>
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-5 font-sans text-slate-900 dark:text-slate-100">
                
                {/* Breadcrumb Navigation */}
                <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    <button
                        onClick={() => navigate("/customer-dashboard/browse-events")}
                        className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Events
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="truncate max-w-[280px] sm:max-w-md text-slate-900 dark:text-slate-100 font-medium">
                        {formatTitle(event.title)}
                    </span>
                </div>

                {/* 1. FULL-WIDTH EVENT HERO BANNER */}
                <div className="relative w-full h-[280px] sm:h-[320px] lg:h-[340px] rounded-[18px] overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-5">
                    {imgSrc(event.image) ? (
                        <img
                            src={imgSrc(event.image)}
                            alt={formatTitle(event.title)}
                            className="w-full h-full object-cover object-center"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                            <CalendarDays className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                        </div>
                    )}

                    {/* Category Badge Top-Left */}
                    {event.category && (
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-slate-900/90 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 backdrop-blur-md shadow-sm">
                            {renderText(event.category)}
                        </span>
                    )}

                    {/* Favorite Icon Top-Right */}
                    <button
                        type="button"
                        onClick={handleToggleFavorite}
                        disabled={favLoading}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm hover:scale-105 transition-all cursor-pointer"
                        aria-label="Toggle favorite"
                    >
                        <Heart
                            className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-slate-600 dark:text-slate-400"}`}
                        />
                    </button>
                </div>

                {/* 2. TITLE & HOST SECTION DIRECTLY BELOW HERO */}
                <div className="space-y-1.5 mb-5">
                    <h1 className="text-2xl sm:text-[32px] font-bold text-slate-900 dark:text-slate-50 leading-snug tracking-tight max-w-4xl">
                        {formatTitle(event.title)}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {event.createdBy && (
                            <span>
                                Hosted by <strong className="text-slate-800 dark:text-slate-200 font-semibold">{typeof event.createdBy === "object" ? (event.createdBy?.name || "Organiser") : renderText(event.createdBy)}</strong>
                            </span>
                        )}
                        {event.averageRating > 0 && (
                            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="font-bold">{event.averageRating.toFixed(1)}</span>
                                <span className="text-xs text-slate-500">({event.ratingCount || 0})</span>
                            </span>
                        )}
                        {event.live && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                                🔴 LIVE NOW
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. LIGHTWEIGHT HORIZONTAL EVENT SUMMARY STRIP (4 Columns in 1 Row) */}
                {(() => {
                    const schedule = formatEventSchedule(event);
                    return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-200/80 dark:border-slate-800 mb-7">
                            
                            {/* Date */}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <Calendar className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {schedule.dateText}
                                    </p>
                                </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <Clock className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Time</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {schedule.timeText || "Check Schedule"}
                                    </p>
                                </div>
                            </div>

                            {/* Location (Concise 1-2 line summary) */}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <MapPin className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Location</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {formatShortLocation(event.location)}
                                    </p>
                                </div>
                            </div>

                            {/* Availability */}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <Users className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Availability</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                        {availableSpots !== null
                                            ? `${availableSpots} spots left`
                                            : `${attendeesCount} spots booked`}
                                    </p>
                                </div>
                            </div>

                        </div>
                    );
                })()}

                {/* 5 & 6. TWO-COLUMN LAYOUT: ABOUT/DETAILS (LEFT) & BOOKING CARD (RIGHT) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: About, Venue, Schedule, Policies, Reviews (~66%) */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* About this Event */}
                        {event.description && (
                            <div className="space-y-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">About this Event</h2>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                    {renderText(event.description)}
                                </p>
                            </div>
                        )}

                        {/* Venue Detail Section (Full Address) */}
                        {event.location && (
                            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Venue</h3>
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200/60 dark:border-slate-800 space-y-1">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {formatShortLocation(event.location)}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                        {renderText(event.location)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Multi-day schedule breakdown if custom */}
                        {(() => {
                            const schedule = formatEventSchedule(event);
                            if (!schedule.hasCustomSchedule || !schedule.dailySchedule?.length) return null;
                            return (
                                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule</h3>
                                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2 text-xs">
                                        {schedule.isMultiDay && schedule.lastDateText && (
                                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                                                🏁 Last Date of Event: {schedule.lastDateText}
                                            </p>
                                        )}
                                        <div className="space-y-2 text-slate-600 dark:text-slate-400 divide-y divide-slate-200/60 dark:divide-slate-800">
                                            {schedule.dailySchedule.map((day) => (
                                                <div key={day.date} className="flex justify-between items-center pt-2">
                                                    <span className="font-medium text-slate-900 dark:text-slate-200">{day.dayLabel}</span>
                                                    <span>{formatTime12(day.startTime)} - {formatTime12(day.endTime)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Gallery Section */}
                        {event.gallery?.length > 0 && (
                            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Gallery ({event.gallery.length})</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowGallery(!showGallery)}
                                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                    >
                                        {showGallery ? "Hide Gallery" : "View Gallery"}
                                    </button>
                                </div>
                                {showGallery && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                                        {event.gallery.map((img, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setLightboxIndex(idx)}
                                                className="aspect-square rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:opacity-90 transition-opacity cursor-pointer"
                                            >
                                                <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Organiser & Share */}
                        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("Event link copied to clipboard!");
                                }}
                                className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                            >
                                <Share2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Share this event
                            </button>
                            {typeof event.createdBy === "object" && event.createdBy?.email && (
                                <a
                                    href={`mailto:${event.createdBy.email}`}
                                    className="font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    ✉ Contact Organiser
                                </a>
                            )}
                        </div>

                        {/* Reviews Section */}
                        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    Customer Reviews ({reviews.length})
                                </h3>
                                {reviews.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllReviewsModal(true)}
                                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                    >
                                        View all
                                    </button>
                                )}
                            </div>
                            {reviews.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No reviews yet for this event.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {reviews.slice(0, 2).map((review) => (
                                        <div key={review._id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                                        {review.customerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{review.customerName}</p>
                                                        <div className="flex gap-0.5 mt-0.5">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star key={s} className={`h-2.5 w-2.5 ${s <= review.score ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                {review.ratedAt && (
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(review.ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                    </span>
                                                )}
                                            </div>
                                            {review.comment ? (
                                                <p className="text-xs text-slate-600 dark:text-slate-300 pl-9 italic">"{review.comment}"</p>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 pl-9 italic">Rated {review.score}/5 stars</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* 6 & 7. RIGHT COLUMN: STICKY BOOKING CARD BESIDE ABOUT/DETAILS (~34%) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                        <div className="rounded-[18px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5">
                            
                            {/* Card Header & Price */}
                            <div className="space-y-2">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                        Select Tickets
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Choose number of tickets
                                    </p>
                                </div>

                                {/* Prominent Price Display */}
                                <div className="pt-2">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {formatCurrency(getPrimaryTicketPrice())}
                                        </span>
                                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                            per ticket
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Live or Sold Out Banner */}
                            {event.live ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-center space-y-1">
                                    <Video className="mx-auto h-5 w-5 text-red-500 animate-pulse" />
                                    <p className="text-xs font-semibold text-red-600">Event is currently live</p>
                                </div>
                            ) : isSoldOut() ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-center space-y-1">
                                    <Ticket className="mx-auto h-6 w-6 text-red-500 opacity-60" />
                                    <p className="text-xs font-bold text-red-600">Sold Out</p>
                                    <p className="text-[11px] text-slate-500">No spots available</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    
                                    {/* Session Selector (Day / Night) */}
                                    {event.eventType === "ticketed" && event.hasMultipleSessions &&
                                        event.sessions?.day?.enabled && event.sessions?.night?.enabled && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Select Session</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {["day", "night"].map((sess) => {
                                                    const soldOut = event.sessions?.[sess]?.tickets?.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
                                                    const active = selectedSession === sess;
                                                    return (
                                                        <button
                                                            key={sess}
                                                            type="button"
                                                            disabled={soldOut}
                                                            onClick={() => { setSelectedSession(sess); setSelectedTickets({}); }}
                                                            className={`rounded-xl p-2.5 text-center transition-all cursor-pointer border ${
                                                                active
                                                                    ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold"
                                                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-400"
                                                            } ${soldOut ? "opacity-40 cursor-not-allowed" : ""}`}
                                                        >
                                                            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                                                                {sess === "day" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                                                                <span className="capitalize">{sess}</span>
                                                            </div>
                                                            {soldOut && <p className="text-[9px] text-red-500 font-bold mt-0.5">SOLD OUT</p>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 8. Compact Quantity Steppers */}
                                    {event.eventType === "fullService" ? (
                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity</p>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    type="button"
                                                    disabled={fullServiceQty <= 1}
                                                    onClick={() => setFullServiceQty((q) => Math.max(1, q - 1))}
                                                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>

                                                <span className="min-w-[32px] text-center font-bold text-base text-slate-900 dark:text-slate-100">
                                                    {fullServiceQty}
                                                </span>

                                                <button
                                                    type="button"
                                                    disabled={event.maxAttendees > 0 && fullServiceQty >= (event.maxAttendees - (event.attendeesCount || 0))}
                                                    onClick={() => {
                                                        const rem = event.maxAttendees > 0 ? event.maxAttendees - (event.attendeesCount || 0) : Infinity;
                                                        setFullServiceQty((q) => Math.min(q + 1, rem));
                                                    }}
                                                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Ticketed Event Tiers with Compact Steppers */
                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ticket Tiers</p>
                                            {(() => {
                                                const tickets = event.hasMultipleSessions && selectedSession
                                                    ? event.sessions?.[selectedSession]?.tickets
                                                    : event.tickets;

                                                if (!tickets?.length) return <p className="text-xs text-slate-400">No tickets available</p>;

                                                const tierConfig = {
                                                    diamond: { color: "bg-cyan-500", label: "Diamond" },
                                                    gold: { color: "bg-amber-500", label: "Gold" },
                                                    silver: { color: "bg-slate-400", label: "Silver" },
                                                };

                                                return (
                                                    <div className="space-y-2">
                                                        {tickets.map((t) => {
                                                            const remaining = (t.available || 0) - (t.sold || 0);
                                                            const qty = selectedTickets[t.type] || 0;
                                                            const cfg = tierConfig[t.type] || { color: "bg-purple-600", label: t.type };
                                                            const soldOut = remaining <= 0;

                                                            return (
                                                                <div
                                                                    key={t.type}
                                                                    className={`flex items-center justify-between rounded-xl p-2.5 border transition-all ${
                                                                        qty > 0 ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/30" : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                                                                    } ${soldOut ? "opacity-40" : ""}`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className={`w-1.5 h-6 rounded-full ${cfg.color} shrink-0`} />
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">{cfg.label}</p>
                                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                                {formatCurrency(t.price)}
                                                                                {soldOut ? (
                                                                                    <span className="ml-1 text-[9px] font-bold text-red-500">Sold Out</span>
                                                                                ) : (
                                                                                    <span className="ml-1 text-[10px] font-normal text-slate-400">({remaining} left)</span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            disabled={qty === 0 || soldOut}
                                                                            onClick={() => setSelectedTickets((p) => ({ ...p, [t.type]: Math.max(0, (p[t.type] || 0) - 1) }))}
                                                                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                                            aria-label="Decrease quantity"
                                                                        >
                                                                            <Minus className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <span className="w-5 text-center font-bold text-xs text-slate-900 dark:text-slate-100">{qty}</span>
                                                                        <button
                                                                            type="button"
                                                                            disabled={soldOut || qty >= remaining}
                                                                            onClick={() => setSelectedTickets((p) => ({ ...p, [t.type]: (p[t.type] || 0) + 1 }))}
                                                                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                                            aria-label="Increase quantity"
                                                                        >
                                                                            <Plus className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Session prompt warning */}
                                    {event.eventType === "ticketed" && event.hasMultipleSessions && !selectedSession &&
                                        !((event.sessions?.day?.enabled && !event.sessions?.night?.enabled) ||
                                            (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) && (
                                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-center text-xs text-amber-700 dark:text-amber-300 font-medium">
                                            Please select a session above
                                        </div>
                                    )}

                                    {/* Promo Code Section */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Promo Code</p>
                                            {appliedPromo && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setAppliedPromo(null); setPromoCode(""); }}
                                                    className="text-[11px] font-semibold text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <X className="h-3 w-3" /> Remove
                                                </button>
                                            )}
                                        </div>

                                        {appliedPromo ? (
                                            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 flex items-center justify-between text-xs">
                                                <span className="font-mono font-bold text-green-700 dark:text-green-300">{appliedPromo.code}</span>
                                                <span className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-1">
                                                    <Check className="h-3.5 w-3.5" /> Applied
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Enter promo code"
                                                    value={promoCode}
                                                    onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
                                                    className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 uppercase font-mono flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={applyPromoCode}
                                                    className="h-9 text-xs font-semibold px-3 cursor-pointer shrink-0"
                                                >
                                                    Apply
                                                </Button>
                                            </div>
                                        )}
                                        {promoError && <p className="text-[11px] text-red-500">{promoError}</p>}

                                        {/* Toggle Available Promos */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPromoCodes((v) => !v)}
                                            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                                        >
                                            {showPromoCodes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            <span>{showPromoCodes ? "Hide available promo codes" : "View available promo codes"}</span>
                                        </button>

                                        {showPromoCodes && (
                                            <div className="pt-1">
                                                <AvailablePromoCodes
                                                    onApply={applyPromoByCode}
                                                    appliedCode={appliedPromo?.code}
                                                    eventId={event._id}
                                                    merchantId={event.createdBy?._id || event.createdBy}
                                                    context={event.eventType === "fullService" ? "fullServiceEvent" : "ticketedEvent"}
                                                    itemCategory={event.category}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Summary Breakdown */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                                        {event.eventType === "ticketed" &&
                                            Object.entries(selectedTickets).filter(([, q]) => q > 0).map(([type, qty]) => {
                                                const list = event.hasMultipleSessions && selectedSession
                                                    ? event.sessions?.[selectedSession]?.tickets
                                                    : event.tickets;
                                                const t = list?.find((t) => t.type === type);
                                                return (
                                                    <div key={type} className="flex justify-between text-slate-500">
                                                        <span className="capitalize">{type} × {qty}</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency((t?.price || 0) * qty)}</span>
                                                    </div>
                                                );
                                            })}

                                        {event.eventType === "fullService" && (
                                            <div className="flex justify-between text-slate-500">
                                                <span>{fullServiceQty} × {formatCurrency(event.price)}</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(event.price * fullServiceQty)}</span>
                                            </div>
                                        )}

                                        {appliedPromo && (
                                            <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                                                <span>Discount</span>
                                                <span>-{formatCurrency(getTicketPrice() - getFinalPrice())}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Total & Stacked CTAs */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total</span>
                                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                                                {formatCurrency(getFinalPrice())}
                                            </span>
                                        </div>

                                        {/* 9. CTA Button Priority: Stacked Full Width Buttons */}
                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                disabled={!hasSelection}
                                                onClick={() => handleAddToCart(true)}
                                                className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                Continue to Booking
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={!hasSelection}
                                                onClick={() => handleAddToCart(false)}
                                                className="w-full h-11 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                <ShoppingBag className="h-4 w-4" /> Add to Cart
                                            </Button>
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    </div>

                </div>

                {/* Related Events Section */}
                {relatedEvents.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Related Events</h2>
                        <div ref={relatedGridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {relatedEvents.map((r) => (
                                <div
                                    key={r._id}
                                    onClick={() => navigate(`/customer-dashboard/events/${r._id}`)}
                                    className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer group hover:shadow-md transition-all"
                                >
                                    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        {r.image ? (
                                            <img src={imgSrc(r.image)} alt={r.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <CalendarDays className="h-8 w-8 text-slate-400" />
                                            </div>
                                        )}
                                        {r.category && (
                                            <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-600 text-white">
                                                {r.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-3 space-y-1">
                                        <h3 className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{r.title}</h3>
                                        {r.datetime && (
                                            <p className="text-[11px] text-slate-500">
                                                {new Date(r.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Gallery Lightbox */}
            {lightboxIndex !== null && event?.gallery?.length > 0 && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    onClick={() => setLightboxIndex(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <X className="h-7 w-7" />
                    </button>
                    <button
                        type="button"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + event.gallery.length) % event.gallery.length); }}
                    >
                        <ChevronLeft className="h-10 w-10" />
                    </button>
                    <img
                        src={imgSrc(event.gallery[lightboxIndex])}
                        alt={`Gallery ${lightboxIndex + 1}`}
                        className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % event.gallery.length); }}
                    >
                        <ChevronRight className="h-10 w-10" />
                    </button>
                    <p className="absolute bottom-4 text-white/50 text-xs">{lightboxIndex + 1} / {event.gallery.length}</p>
                </div>
            )}

            {/* All Reviews Modal */}
            <Dialog open={showAllReviewsModal} onOpenChange={setShowAllReviewsModal}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                            All Reviews ({reviews.length})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4 pr-1">
                        {reviews.map((review) => (
                            <div key={review._id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                            {review.customerName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{review.customerName}</p>
                                            <div className="flex gap-0.5 mt-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} className={`h-2.5 w-2.5 ${s <= review.score ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {review.ratedAt && (
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(review.ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    )}
                                </div>
                                {review.comment ? (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-9 italic">"{review.comment}"</p>
                                ) : (
                                    <p className="text-[10px] text-slate-400 pl-9 italic">Rated {review.score}/5 stars</p>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </CustomerLayout>
    );
};

export default CustomerEventDetail;
