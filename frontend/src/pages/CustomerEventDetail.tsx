import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CalendarDays, Calendar, Clock, MapPin, Users, Loader2,
  Heart, Share2, Tag, Ticket, X, Check, Star, CheckCircle2, Images, Video, ShoppingBag,
} from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SimplePayment from "@/components/SimplePayment";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiGetEventById, apiCheckFavorite, apiAddFavorite, apiRemoveFavorite, apiValidatePromoCode, apiListEvents, apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { savePendingEventBooking, getPendingEventBooking, clearPendingEventBooking } from "@/lib/bookingState";
import AvailablePromoCodes from "@/components/AvailablePromoCodes";

const CustomerEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn, token } = useAuth() as any;
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedEvents, setRelatedEvents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGetPublicReviews()
      .then((res: any) => {
        const allReviews = res.reviews || [];
        const filtered = allReviews.filter((r: any) => r.eventId === id);
        setReviews(filtered);
      })
      .catch((err) => console.error("Failed to load reviews:", err));
  }, [id]);

  // Booking state
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [selectedSession, setSelectedSession] = useState<"day" | "night" | null>(null);
  const [fullServiceQty, setFullServiceQty] = useState(1);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Favorites
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favLoading, setFavLoading] = useState(false);

  const imgSrc = (img: string) => !img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`;

  // Load + poll
  useEffect(() => {
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const [res, allEventsRes] = await Promise.all([
          apiGetEventById(id!),
          apiListEvents()
        ]);
        const currentEvent = res.event;
        setEvent(currentEvent);

        const allEvents = allEventsRes.events || [];
        const related = allEvents.filter((e: any) => 
          e._id !== id && 
          (e.category === currentEvent.category || e.createdBy?._id === currentEvent.createdBy?._id)
        );
        if (related.length < 3) {
          const other = allEvents.filter((e: any) => 
            e._id !== id && 
            !related.some((r: any) => r._id === e._id)
          );
          related.push(...other.slice(0, 3 - related.length));
        }
        setRelatedEvents(related.slice(0, 4));
      } catch {
        if (initial) { toast.error("Failed to load event"); navigate("/customer-dashboard/browse-events"); }
      } finally {
        if (initial) setLoading(false);
      }
    };
    load(true);
    const interval = setInterval(() => load(false), 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Favorites
  useEffect(() => {
    if (!event || !isLoggedIn || !token) return;
    apiCheckFavorite("event", event._id, token)
      .then((res: any) => { setIsFavorited(res.isFavorited); setFavoriteId(res.favoriteId || null); })
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
    
    // Re-apply promo code if present
    if (pending.promoCode) {
      applyPromoByCode(pending.promoCode);
    }

    // Auto-open payment modal if all required info is present
    if (event.eventType === "ticketed") {
      if (pending.selectedSession && Object.values(pending.selectedTickets || {}).some(q => q > 0)) {
        setShowPaymentModal(true);
      }
    } else {
      setShowPaymentModal(true);
    }
  }, [isLoggedIn, event]);

  const handleToggleFavorite = async () => {
    if (!isLoggedIn || !token) { toast.error("Please sign in to save favorites"); return; }
    setFavLoading(true);
    try {
      if (isFavorited && favoriteId) {
        await apiRemoveFavorite(favoriteId, token);
        setIsFavorited(false); setFavoriteId(null);
        toast.success("Removed from favorites");
      } else {
        const res: any = await apiAddFavorite(event._id, null, "event", token);
        setIsFavorited(true); setFavoriteId(res.favorite?._id || null);
        toast.success("Saved to favorites");
      }
    } catch { toast.error("Failed to update favorites"); }
    finally { setFavLoading(false); }
  };

  const getTicketPrice = () => {
    if (!event) return 0;
    if (event.eventType === "ticketed") {
      let total = 0;
      if (event.hasMultipleSessions && selectedSession) {
        const tickets = event.sessions?.[selectedSession]?.tickets || [];
        Object.entries(selectedTickets).forEach(([type, qty]) => {
          const t = tickets.find((t: any) => t.type === type);
          total += (t?.price || 0) * qty;
        });
      } else {
        Object.entries(selectedTickets).forEach(([type, qty]) => {
          const t = event.tickets?.find((t: any) => t.type === type);
          total += (t?.price || 0) * qty;
        });
      }
      return total;
    }
    return event.price * fullServiceQty;
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

  const applyPromoByCode = async (code: string) => {
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
    } catch (error: any) {
      setPromoError(error?.message || "Failed to apply promo code");
      setAppliedPromo(null);
      toast.error(error?.message || "Failed to apply promo code");
    }
  };

  const handleAddToCart = (redirectAfterAdding = false) => {
    if (!isLoggedIn || !token) {
      const returnUrl = `/customer-dashboard/events/${id}`;
      savePendingEventBooking({
        eventId: id!, eventTitle: event.title,
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
    if (!event) return false;
    if (event.eventType === "ticketed") {
      if (event.hasMultipleSessions) {
        const d = event.sessions?.day?.tickets?.every((t: any) => ((t.available || 0) - (t.sold || 0)) <= 0);
        const n = event.sessions?.night?.tickets?.every((t: any) => ((t.available || 0) - (t.sold || 0)) <= 0);
        return d && n;
      }
      return event.tickets?.every((t: any) => ((t.available || 0) - (t.sold || 0)) <= 0);
    }
    return event.maxAttendees > 0 && (event.attendeesCount || 0) >= event.maxAttendees;
  };

  const getTicketList = () => {
    if (!event) return [];
    if (event.hasMultipleSessions) {
      const sess = selectedSession || (event.sessions?.day?.enabled ? "day" : "night");
      return event.sessions?.[sess]?.tickets || [];
    }
    return event.tickets || [];
  };

  if (loading) return (
    <CustomerLayout>
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading event…
      </div>
    </CustomerLayout>
  );

  if (!event) return null;

  const attendeesCount = event.attendeesCount || 0;
  const maxAttendees = event.maxAttendees || 0;
  const progress = maxAttendees > 0 ? Math.min(100, Math.round((attendeesCount / maxAttendees) * 100)) : 0;
  const remaining = maxAttendees > 0 ? maxAttendees - attendeesCount : Infinity;

  return (
    <CustomerLayout>
      <div className="min-h-screen">
        {/* Back */}
        <div className="px-3 sm:px-6 lg:px-12 pt-4 sm:pt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/customer-dashboard/browse-events")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Button>
        </div>

        {/* Split layout */}
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] px-3 sm:px-6 lg:px-12 gap-4 sm:gap-8 pb-8 sm:pb-12 mt-4 sm:mt-6">

          {/* LEFT — Image + Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2 bg-card rounded-2xl border border-border overflow-hidden flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary shrink-0">
              {imgSrc(event.image) ? (
                <img src={imgSrc(event.image)} alt={event.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <CalendarDays className="h-24 w-24 opacity-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                {event.category && (
                  <span className="inline-block rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-xs font-semibold text-primary mb-3">
                    {event.category}
                  </span>
                )}
                <h1 className="font-display text-4xl font-bold text-white leading-tight">{event.title}</h1>
                {/* Rating display */}
                {event.averageRating && event.averageRating > 0 ? (
                  <div className="flex items-center gap-1.5 mt-2 text-white">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
                    <span className="text-sm font-semibold">
                      {event.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-white/70">
                      ({event.ratingCount || 0} reviews)
                    </span>
                  </div>
                ) : null}
                {event.createdBy?.name && (
                  <p className="mt-2 text-white/70 text-sm">
                    Hosted by <span className="text-white font-medium">{event.createdBy.name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="border-t border-border p-8 flex-1">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: Calendar, label: event.datetime ? new Date(event.datetime).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : null },
                  { icon: Clock, label: event.datetime ? new Date(event.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null },
                  { icon: MapPin, label: event.location },
                  { icon: Users, label: maxAttendees > 0 ? `${attendeesCount} / ${maxAttendees} attendees` : `${attendeesCount} attending` },
                ].map(({ icon: Icon, label }) => label && (
                  <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>

              {/* Attendee progress */}
              {maxAttendees > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Seats filled</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {event.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> About This Event
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Ticket types info */}
              {event.eventType === "ticketed" && !event.hasMultipleSessions && event.tickets?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" /> Ticket Types
                  </h3>
                  <div className="space-y-2">
                    {event.tickets.map((t: any) => {
                      const rem = (t.available || 0) - (t.sold || 0);
                      return (
                        <div key={t.type} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                          <div>
                            <span className="text-sm font-medium capitalize">{t.type}</span>
                            {rem <= 0 && <span className="ml-2 text-xs text-red-500 font-semibold">SOLD OUT</span>}
                            {rem > 0 && <span className="ml-2 text-xs text-green-500">{rem} left</span>}
                          </div>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(t.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Favorite + Share */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={handleToggleFavorite} disabled={favLoading}>
                  <Heart className={`mr-2 h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                  {isFavorited ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>

              {/* Organiser contact */}
              {event.createdBy && (
                <div className="mt-4 rounded-lg bg-card border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Event Organiser</p>
                  <p className="font-semibold text-sm">{event.createdBy.name}</p>
                  {event.createdBy.email && (
                    <a href={`mailto:${event.createdBy.email}`} className="text-xs text-primary hover:underline mt-1 block">
                      📧 {event.createdBy.email}
                    </a>
                  )}
                </div>
              )}

              {/* Gallery */}
              {event.gallery?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Images className="h-4 w-4 text-primary" /> Gallery ({event.gallery.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 font-semibold"
                      onClick={() => setShowGallery(!showGallery)}
                    >
                      {showGallery ? "Hide Gallery" : "View Gallery"}
                    </Button>
                  </div>
                  {showGallery && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {event.gallery.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity"
                        >
                          <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Section */}
              <div className="mt-8 border-t border-border pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Customer Reviews ({reviews.length})
                  </h3>
                  {reviews.length > 2 && (
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowAllReviewsModal(true)}>
                      View All
                    </Button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No reviews yet for this event.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 2).map((review) => (
                      <div key={review._id} className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                              {review.customerName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{review.customerName}</p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.ratedAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        {review.comment ? (
                          <p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Booking Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/2 bg-card rounded-2xl border border-border">
            <div className="p-8 max-w-lg mx-auto">
              <h2 className="font-display text-2xl font-bold mb-1">
                {event.live ? "Event Details" : "Book This Event"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {event.live ? "This event is currently live" : event.eventType === "ticketed" ? "Select your seats below" : "Pick your spots in the hall"}
              </p>

              {/* Live event — show details, hide booking */}
              {event.live ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                    <Video className="mx-auto h-8 w-8 text-red-500 opacity-70 mb-2" />
                    <p className="font-semibold text-red-500">Live Event — View Only</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Booking is not available while this event is live.
                    </p>
                  </div>
                  {/* Show event info */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                    {event.price > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-bold text-primary">{formatCurrency(event.price)}</span>
                      </div>
                    )}
                    {event.datetime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="text-sm font-medium">{new Date(event.datetime).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <span className="text-sm font-medium text-right max-w-[60%]">{event.location}</span>
                      </div>
                    )}
                    {event.attendeesCount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Attending</span>
                        <span className="text-sm font-medium">{event.attendeesCount} people</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : isSoldOut() ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                  <Ticket className="mx-auto h-12 w-12 text-red-500 opacity-50 mb-3" />
                  <p className="font-semibold text-red-500 text-lg">
                    {event.eventType === "ticketed" ? "Sold Out" : "Event Full"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">No more spots available</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Session selector for day/night events */}
                  {event.eventType === "ticketed" && event.hasMultipleSessions &&
                    event.sessions?.day?.enabled && event.sessions?.night?.enabled && (
                    <div>
                      <p className="text-sm font-semibold mb-3">Select Session</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["day", "night"] as const).map(sess => {
                          const soldOut = event.sessions?.[sess]?.tickets?.every((t: any) => ((t.available || 0) - (t.sold || 0)) <= 0);
                          return (
                            <button
                              key={sess}
                              disabled={soldOut}
                              onClick={() => { setSelectedSession(sess); setSelectedTickets({}); }}
                              className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                selectedSession === sess
                                  ? "border-primary bg-primary/10 text-primary"
                                  : soldOut
                                  ? "border-red-500/30 bg-red-500/5 text-red-500 opacity-60 cursor-not-allowed"
                                  : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              <div className="text-xl mb-1">{sess === "day" ? "☀️" : "🌙"}</div>
                              <div className="capitalize">{sess} Session</div>
                              <div className="text-xs text-muted-foreground mt-1">{event.sessions?.[sess]?.time}</div>
                              {soldOut && <div className="text-xs font-bold mt-1 text-red-500">SOLD OUT</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ticket Selection */}
                  {(event.eventType === "fullService" ||
                    !event.hasMultipleSessions ||
                    selectedSession ||
                    (event.sessions?.day?.enabled && !event.sessions?.night?.enabled) ||
                    (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        {event.eventType === "ticketed" ? "Select Tickets" : "Number of Tickets"}
                      </p>
                      {event.eventType === "ticketed" ? (
                        (() => {
                          const tickets = event.hasMultipleSessions && selectedSession
                            ? event.sessions?.[selectedSession]?.tickets
                            : event.tickets;
                          if (!tickets?.length) return <p className="text-xs text-muted-foreground">No tickets available</p>;
                          const tierStyle: Record<string, { emoji: string; bg: string; border: string; label: string; price: string; badge: string }> = {
                            diamond: { emoji: "💎", bg: "bg-cyan-500/10", border: "border-cyan-500/40", label: "text-cyan-300 font-bold", price: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
                            gold:    { emoji: "🥇", bg: "bg-yellow-500/10", border: "border-yellow-500/40", label: "text-yellow-300 font-bold", price: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
                            silver:  { emoji: "🥈", bg: "bg-slate-400/10", border: "border-slate-400/40", label: "text-slate-300 font-bold", price: "text-slate-300", badge: "bg-slate-400/20 text-slate-300 border-slate-400/30" },
                          };
                          return tickets.map((t: any) => {
                            const remaining = (t.available || 0) - (t.sold || 0);
                            const qty = selectedTickets[t.type] || 0;
                            const s = tierStyle[t.type] || { emoji: "🎫", bg: "bg-primary/10", border: "border-primary/30", label: "text-primary font-bold", price: "text-primary", badge: "bg-primary/20 text-primary border-primary/30" };
                            return (
                              <div key={t.type} className={`flex items-center justify-between p-3 rounded-xl border-2 ${s.border} ${s.bg} transition-all ${qty > 0 ? "ring-1 ring-offset-1 ring-offset-background " + s.border : ""}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{s.emoji}</span>
                                  <div>
                                    <span className={`text-sm capitalize ${s.label}`}>{t.type}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-sm font-bold ${s.price}`}>{formatCurrency(t.price)}</span>
                                      {remaining <= 0
                                        ? <span className="text-xs text-red-400 font-semibold">Sold Out</span>
                                        : <span className={`text-xs px-1.5 py-0.5 rounded-full border ${s.badge}`}>{remaining} left</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button disabled={qty === 0} onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: Math.max(0, (p[t.type] || 0) - 1) }))}
                                    className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold disabled:opacity-40 transition-colors">−</button>
                                  <span className={`w-6 text-center font-bold text-sm ${qty > 0 ? s.price : ""}`}>{qty}</span>
                                  <button disabled={remaining <= 0 || qty >= remaining} onClick={() => setSelectedTickets(p => ({ ...p, [t.type]: (p[t.type] || 0) + 1 }))}
                                    className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold disabled:opacity-40 transition-colors">+</button>
                                </div>
                              </div>
                            );
                          });
                        })()
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                          <button onClick={() => setFullServiceQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 font-bold text-lg transition-colors">−</button>
                          <span className="w-10 text-center font-semibold text-lg">{fullServiceQty}</span>
                          <button 
                            disabled={event.maxAttendees > 0 && fullServiceQty >= (event.maxAttendees - (event.attendeesCount || 0))} 
                            onClick={() => {
                              const remaining = event.maxAttendees > 0 ? (event.maxAttendees - (event.attendeesCount || 0)) : Infinity;
                              setFullServiceQty(q => Math.min(q + 1, remaining));
                            }} 
                            className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 font-bold text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >+</button>
                          <span className="text-xs text-muted-foreground ml-1">× {formatCurrency(event.price)} each</span>
                        </div>
                      )}
                    </div>
                  )}

                  {event.eventType === "ticketed" && event.hasMultipleSessions && !selectedSession &&
                    !((event.sessions?.day?.enabled && !event.sessions?.night?.enabled) ||
                      (!event.sessions?.day?.enabled && event.sessions?.night?.enabled)) && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-600 font-medium">
                      ⏰ Please select a session above to view available seats
                    </div>
                  )}

                  {/* Promo Code */}
                  <div className="border-t border-border pt-6">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" /> Promo Code
                    </p>
                    {appliedPromo ? (
                      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                        <span className="font-mono font-bold text-green-600 text-sm">{appliedPromo.code} applied</span>
                        <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }} className="text-green-600"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input placeholder="Enter promo code" value={promoCode}
                          onChange={e => { setPromoCode(e.target.value); setPromoError(""); }} className="h-10" />
                        <Button variant="outline" onClick={applyPromoCode} className="h-10 px-5">Apply</Button>
                      </div>
                    )}
                    {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
                    <AvailablePromoCodes
                      onApply={applyPromoByCode}
                      appliedCode={appliedPromo?.code}
                      eventId={event._id}
                      merchantId={event.createdBy?._id || event.createdBy}
                      context={event.eventType === "fullService" ? "fullServiceEvent" : "ticketedEvent"}
                      itemCategory={event.category}
                    />
                  </div>

                  {/* Price Summary */}
                  <div className="border-t border-border pt-6">
                    <div className="rounded-xl bg-primary/10 border border-primary/30 p-5">
                      {event.eventType === "ticketed" && Object.entries(selectedTickets).filter(([, q]) => q > 0).map(([type, qty]) => {
                        const tickets = getTicketList();
                        const t = tickets.find((t: any) => t.type === type);
                        return (
                          <div key={type} className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span className="capitalize">{type} × {qty}</span>
                            <span>{formatCurrency((t?.price || 0) * qty)}</span>
                          </div>
                        );
                      })}
                      {event.eventType === "fullService" && (
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                          <span>{fullServiceQty} × {formatCurrency(event.price)}</span>
                          <span>{formatCurrency(event.price * fullServiceQty)}</span>
                        </div>
                      )}
                      {appliedPromo && (
                        <div className="flex justify-between text-sm text-green-600 mb-2">
                          <span>Discount</span>
                          <span>-{formatCurrency(getTicketPrice() - getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      )}
                      <div className="border-t border-primary/20 mt-3 pt-3 flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Booking — gated behind seat selection */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 text-base border-primary/40 hover:bg-primary/5 text-primary"
                      onClick={() => handleAddToCart(false)}
                      disabled={
                        (event.eventType === "ticketed" && Object.values(selectedTickets).reduce((s: number, q: any) => s + q, 0) === 0) ||
                        (event.eventType === "fullService" && fullServiceQty === 0)
                      }
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Add to Cart
                    </Button>
                    <Button
                      className="flex-1 h-12 text-base bg-gradient-primary text-primary-foreground hover:opacity-90"
                      onClick={() => handleAddToCart(true)}
                      disabled={
                        (event.eventType === "ticketed" && Object.values(selectedTickets).reduce((s: number, q: any) => s + q, 0) === 0) ||
                        (event.eventType === "fullService" && fullServiceQty === 0)
                      }
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Book Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Related Events Section */}
        {relatedEvents.length > 0 && (
          <div className="px-3 sm:px-6 lg:px-12 mt-16 pt-12 pb-16 border-t border-border">
            <h2 className="font-display text-2xl font-bold mb-6">Related Events</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {relatedEvents.map((r) => (
                <div
                  key={r._id}
                  onClick={() => navigate(`/customer-dashboard/events/${r._id}`)}
                  className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden flex-shrink-0">
                    {r.image ? (
                      <img
                        src={imgSrc(r.image)}
                        alt={r.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <CalendarDays className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {r.category && (
                      <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                        {r.category}
                      </span>
                    )}
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-primary">
                      {(() => {
                        if (r.eventType === "ticketed" && r.tickets?.length > 0) {
                          const minPrice = Math.min(...r.tickets.map((t: any) => t.price || 0).filter((p: number) => p > 0));
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
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    {r.averageRating && r.averageRating > 0 ? (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        <span className="text-xs font-semibold">
                          {r.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({r.ratingCount || 0})
                        </span>
                      </div>
                    ) : null}
                    {r.createdBy?.name && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Hosted by <span className="font-medium text-foreground">{r.createdBy.name}</span>
                      </p>
                    )}
                    <ul className="mt-3 space-y-1">
                      {r.category && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {r.category} event
                        </li>
                      )}
                      {r.datetime && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {new Date(r.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </li>
                      )}
                      {r.location && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground line-clamp-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {r.location}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checkout processed via Cart */}

      {/* Gallery Lightbox */}
      {lightboxIndex !== null && event?.gallery?.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-7 w-7" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! - 1 + event.gallery.length) % event.gallery.length); }}
          >‹</button>
          <img
            src={imgSrc(event.gallery[lightboxIndex])}
            alt={`Gallery ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! + 1) % event.gallery.length); }}
          >›</button>
          <p className="absolute bottom-4 text-white/50 text-sm">{lightboxIndex + 1} / {event.gallery.length}</p>
        </div>
      )}

      {/* View All Reviews Modal */}
      <Dialog open={showAllReviewsModal} onOpenChange={setShowAllReviewsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              All Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 pr-2">
            {reviews.map((review) => (
              <div key={review._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.customerName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.ratedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {review.comment ? (
                  <p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>
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




