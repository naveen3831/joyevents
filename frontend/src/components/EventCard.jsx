import { motion } from "framer-motion";
import { Video, Heart, Mail, MapPin, Calendar, Eye, CalendarCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};

const EventCard = ({ event, index = 0, onBookNow, onViewDetails, isFavorited, onToggleFavorite }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const allSoldOut =
    event.eventType === "ticketed" &&
    event.tickets?.length > 0 &&
    event.tickets.every((t) => (t.available || 0) - (t.sold || 0) <= 0);

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

  const handleContactClick = (e) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      const returnTo = window.location.pathname;
      localStorage.setItem("authReturnTo", returnTo);
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }
    const params = new URLSearchParams({
      title: event.title,
      eventId: event._id,
      returnTo: window.location.pathname,
    });
    if (event.createdBy?._id) params.set("merchantId", event.createdBy._id);
    if (event.image) params.set("image", event.image);
    if (event.category) params.set("category", event.category);
    if (event.datetime) params.set("datetime", event.datetime);
    if (event.location) params.set("location", event.location);
    navigate(`/customer-dashboard/contact-organiser?${params.toString()}`);
  };

  const priceLabel = allSoldOut
    ? "Sold Out"
    : (() => {
        if (event.eventType === "ticketed" && event.tickets?.length > 0) {
          const minPrice = Math.min(...event.tickets.map((t) => t.price || 0).filter((p) => p > 0));
          return minPrice > 0 ? `From ${formatCurrency(minPrice)}` : `From ${formatCurrency(event.price || 0)}`;
        }
        return `From ${formatCurrency(event.price || 0)}`;
      })();

  const formattedDate = event.datetime
    ? new Date(event.datetime).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="w-full min-w-0"
    >
      <div className="group rounded-[14px] border border-[#E5E7EB] bg-card overflow-hidden flex flex-col shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition-all duration-300 w-full min-w-0 h-auto">
        
        {/* 180px Event Image */}
        <div onClick={handleTitleClick} className="relative w-full h-[170px] sm:h-[180px] overflow-hidden bg-secondary shrink-0 cursor-pointer">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-secondary/80">
              <Calendar className="h-10 w-10 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Category Badge Top-Left */}
          {event.category && (
            <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[12px] font-semibold text-white shadow-xs z-10 max-h-[30px] flex items-center">
              {toTitleCase(event.category)}
            </span>
          )}

          {/* Live Badge Top-Right */}
          {event.live && (
            <span className="absolute top-3 right-3 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1 shadow-xs animate-pulse z-10 max-h-[30px]">
              <Video className="h-3 w-3" /> LIVE
            </span>
          )}

          {/* Favorite Button Top-Right */}
          {onToggleFavorite && !event.live && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(event);
              }}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 backdrop-blur-sm hover:bg-black/60 transition-colors"
              title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-4 w-4 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
          )}

          {/* Price Badge Overlay Bottom-Left */}
          <span className="absolute bottom-3 left-3 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-[12px] font-bold text-white border border-white/10 z-10 max-h-[30px] flex items-center">
            {priceLabel}
          </span>
        </div>

        {/* 16px Card Body Padding */}
        <div className="p-[16px] flex flex-col flex-1 min-w-0 justify-between">
          <div>
            {/* One-Line Event Title */}
            <h3
              onClick={handleTitleClick}
              className="text-[18px] leading-[24px] font-bold text-foreground group-hover:text-primary transition-colors truncate cursor-pointer mb-[12px]"
              title={event.title}
            >
              {event.title}
            </h3>

            {/* Date & Location Metadata */}
            <div className="space-y-[6px] text-[14px] leading-[20px] text-muted-foreground">
              {formattedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{formattedDate}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2" title={event.location}>
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-4 pt-1 space-y-2">
            {/* Compact Details + Book Now Row (42px height, 10px gap) */}
            <div className="grid grid-cols-2 gap-[10px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetails) onViewDetails(event);
                  else handleTitleClick();
                }}
                className="h-[42px] rounded-xl text-xs font-semibold border border-border bg-transparent text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5 w-full"
              >
                <Eye className="h-3.5 w-3.5" /> Details
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBookNow) onBookNow(event);
                  else handleTitleClick();
                }}
                disabled={event.live || allSoldOut}
                className={`h-[42px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 w-full ${
                  event.live || allSoldOut
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-gradient-primary text-white hover:opacity-90 shadow-xs"
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                {event.live ? "Live" : allSoldOut ? "Sold Out" : "Book Now"}
              </button>
            </div>

            {/* Small Contact Organiser Text Link (24px max height) */}
            {event.createdBy && (
              <button
                type="button"
                onClick={handleContactClick}
                className="w-full h-[24px] max-h-[24px] text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer pt-0.5"
              >
                <Mail className="h-3.5 w-3.5" /> Contact Organiser
              </button>
            )}
          </div>
        </div>
      </div>

    </motion.div>
  );
};

export default EventCard;
