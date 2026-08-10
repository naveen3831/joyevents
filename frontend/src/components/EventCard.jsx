import { motion } from "framer-motion";
import { Video, Heart, Mail, MapPin, Calendar, Star, Eye, CalendarCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useGsapCardHover } from "@/lib/gsapAnimations";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ContactMerchantModal from "@/components/ContactMerchantModal";
import { useAuth } from "@/contexts/AuthContext";

const PENDING_CONTACT_KEY = "pendingContactOrganiser";

const EventCard = ({ event, index = 0, onBookNow, onViewDetails, onImageClick, isFavorited, onToggleFavorite }) => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [showContact, setShowContact] = useState(false);
    const hoverRef = useGsapCardHover({ lift: -8, scale: 1.015 });

    const allSoldOut = event.eventType === "ticketed" && event.tickets?.length > 0 &&
        event.tickets.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);

    useEffect(() => {
        if (!isLoggedIn) return;
        try {
            const pending = localStorage.getItem(PENDING_CONTACT_KEY);
            if (pending && pending === event._id) {
                localStorage.removeItem(PENDING_CONTACT_KEY);
                setShowContact(true);
            }
        } catch { }
    }, [isLoggedIn, event._id]);

    const handleTitleClick = () => {
        if (onViewDetails) {
            onViewDetails(event);
        } else if (onBookNow) {
            onBookNow(event);
        } else {
            const path = window.location.pathname;
            if (path.includes("customer-dashboard")) {
                navigate(`/customer-dashboard/events/${event._id}`);
            } else if (path.includes("admin-dashboard")) {
                navigate(`/admin-dashboard/events/${event._id}`);
            } else {
                navigate(`/events/${event._id}`);
            }
        }
    };

    const handleContactClick = () => {
        if (!isLoggedIn) {
            localStorage.setItem(PENDING_CONTACT_KEY, event._id);
            localStorage.setItem("authReturnTo", `/events`);
            navigate(`/login?redirect=${encodeURIComponent("/events")}`);
            return;
        }
        setShowContact(true);
    };

    const priceLabel = allSoldOut ? "Sold Out" : (() => {
        if (event.eventType === "ticketed" && event.tickets?.length > 0) {
            const minPrice = Math.min(...event.tickets.map((t) => t.price || 0).filter((p) => p > 0));
            return minPrice > 0 ? `From ${formatCurrency(minPrice)}` : `From ${formatCurrency(event.price || 0)}`;
        }
        return `From ${formatCurrency(event.price || 0)}`;
    })();

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05, duration: 0.3 }} className="h-full w-full">
        <div ref={hoverRef} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-all h-full shadow-card will-change-transform w-full">

          {/* Image — Top Full Width on both mobile and desktop */}
          <div className="relative overflow-hidden bg-secondary shrink-0 w-full h-48 sm:h-52">
            {event.image ? (
              <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-secondary/80">
                <Calendar className="h-10 w-10 opacity-30"/>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"/>

            {/* Category badge top-left */}
            {event.category && (
              <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                {event.category}
              </span>
            )}

            {/* Live badge */}
            {event.live && (
              <span className="absolute top-3 right-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm animate-pulse">
                <Video className="h-3 w-3"/> LIVE
              </span>
            )}

            {/* Favorite */}
            {onToggleFavorite && (
              <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(event); }} className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors">
                <Heart className={`h-4 w-4 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`}/>
              </button>
            )}

            {/* Price badge overlaid at bottom left of image */}
            <span className="absolute bottom-3 left-3 rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/10">
              {priceLabel}
            </span>
          </div>

          {/* Content — Below image on both mobile and desktop */}
          <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0 justify-between">
            <div>
              <h3 onClick={handleTitleClick} className="font-display text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug cursor-pointer min-h-[2.5rem]">
                {event.title}
              </h3>

              {/* Rating display */}
              {event.averageRating && event.averageRating > 0 ? (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0"/>
                  <span className="text-xs font-semibold text-foreground">
                    {event.averageRating.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ({event.ratingCount || 0})
                  </span>
                </div>
              ) : null}

              {/* Date + location */}
              <ul className="mt-3 space-y-1.5">
                {event.datetime && (
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-tint-orange text-tint-orange-fg">
                      <Calendar className="h-3.5 w-3.5"/>
                    </span>
                    <span className="truncate">{new Date(event.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </li>
                )}
                {event.location && (
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-tint-pink text-tint-pink-fg">
                      <MapPin className="h-3.5 w-3.5"/>
                    </span>
                    <span className="truncate">{event.location}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {onViewDetails && (
                  <button onClick={() => onViewDetails(event)} className="min-h-[40px] rounded-xl text-xs font-semibold border border-border hover:bg-secondary text-foreground transition-all flex items-center justify-center gap-1.5">
                    <Eye className="h-4 w-4"/> Details
                  </button>
                )}
                {onBookNow && (
                  <button onClick={() => onBookNow(event)} disabled={event.live || allSoldOut} className={`min-h-[40px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${event.live || allSoldOut
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"}`}>
                    <CalendarCheck className="h-4 w-4"/> {event.live ? "Live" : allSoldOut ? "Sold Out" : "Book Now"}
                  </button>
                )}
              </div>
              {event.createdBy && (
                <button onClick={handleContactClick} className="w-full min-h-[34px] rounded-xl text-xs font-medium border border-border/80 hover:bg-secondary transition-all text-muted-foreground flex items-center justify-center gap-1.5">
                  <Mail className="h-3.5 w-3.5"/> Contact Organiser
                </button>
              )}
            </div>
          </div>
        </div>

        {showContact && (<ContactMerchantModal itemTitle={event.title} eventId={event._id} onClose={() => setShowContact(false)}/>)}
      </motion.div>
    );
};

export default EventCard;
