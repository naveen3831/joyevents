import { motion } from "framer-motion";
import { Video, Heart, Mail, MapPin, Calendar, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ContactMerchantModal from "@/components/ContactMerchantModal";
import { useAuth } from "@/contexts/AuthContext";
const PENDING_CONTACT_KEY = "pendingContactOrganiser";
const EventCard = ({ event, index = 0, onBookNow, onViewDetails, onImageClick, isFavorited, onToggleFavorite }) => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [showContact, setShowContact] = useState(false);
    const allSoldOut = event.eventType === "ticketed" && event.tickets?.length > 0 &&
        event.tickets.every((t) => ((t.available || 0) - (t.sold || 0)) <= 0);
    useEffect(() => {
        if (!isLoggedIn)
            return;
        try {
            const pending = localStorage.getItem(PENDING_CONTACT_KEY);
            if (pending && pending === event._id) {
                localStorage.removeItem(PENDING_CONTACT_KEY);
                setShowContact(true);
            }
        }
        catch { }
    }, [isLoggedIn, event._id]);
    const handleContactClick = () => {
        if (!isLoggedIn) {
            localStorage.setItem(PENDING_CONTACT_KEY, event._id);
            localStorage.setItem("authReturnTo", `/events`);
            navigate(`/login?redirect=${encodeURIComponent("/events")}`);
            return;
        }
        setShowContact(true);
    };
    return (<motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05, duration: 0.3 }} className="h-full">
      <div className="group rounded-xl sm:rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors h-full">

        {/* Image — portrait on mobile like BookMyShow */}
        <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
          {event.image ? (<img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
              <Calendar className="h-8 w-8 opacity-30"/>
            </div>)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>

          {/* Category badge top-left */}
          {event.category && (<span className="absolute top-2 left-2 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-primary-foreground">
              {event.category}
            </span>)}

          {/* Live badge */}
          {event.live && (<span className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
              <Video className="h-2.5 w-2.5"/> LIVE
            </span>)}

          {/* Favorite */}
          {onToggleFavorite && (<button onClick={(e) => { e.stopPropagation(); onToggleFavorite(event); }} className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1 hover:bg-black/70 transition-colors">
              <Heart className={`h-3.5 w-3.5 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-white"}`}/>
            </button>)}

          {/* Price at bottom of image */}
          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white">
            {allSoldOut ? "Sold Out" : (() => {
            if (event.eventType === "ticketed" && event.tickets?.length > 0) {
                const minPrice = Math.min(...event.tickets.map((t) => t.price || 0).filter((p) => p > 0));
                return minPrice > 0 ? `Starts from ${formatCurrency(minPrice)}` : `Starts from ${formatCurrency(event.price || 0)}`;
            }
            return `Starts from ${formatCurrency(event.price || 0)}`;
        })()}
          </span>
        </div>

        {/* Content — compact on mobile */}
        <div className="p-2 sm:p-5 flex flex-col flex-1">
          <h3 className="font-semibold text-xs sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
            {event.title}
          </h3>

          {/* Rating display */}
          {event.averageRating && event.averageRating > 0 ? (<div className="flex items-center gap-1 mt-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0"/>
              <span className="text-xs font-semibold">
                {event.averageRating.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({event.ratingCount || 0})
              </span>
            </div>) : null}

          {/* Date + location — hidden on mobile to save space */}
          <div className="hidden sm:block mt-3 space-y-1">
            {event.datetime && (<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0"/>
                {new Date(event.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>)}
            {event.location && (<p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                <MapPin className="h-3 w-3 shrink-0"/>
                {event.location}
              </p>)}
          </div>

          <div className="flex-1"/>

          {/* Buttons — stacked, compact on mobile */}
          <div className="mt-2 sm:mt-5 flex flex-col gap-1.5 sm:gap-2">
            {onViewDetails && (<button onClick={() => onViewDetails(event)} className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold border border-primary text-primary hover:bg-primary/10 transition-all">
                View Details
              </button>)}
            {onBookNow && (<button onClick={() => onBookNow(event)} disabled={event.live || allSoldOut} className={`w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold transition-all ${event.live || allSoldOut
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-gradient-primary text-primary-foreground hover:opacity-90"}`}>
                {event.live ? "Live — View Only" : allSoldOut ? "Sold Out" : "Book Now"}
              </button>)}
            {event.createdBy && (<button onClick={handleContactClick} className="w-full rounded-lg py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium border border-border hover:bg-secondary transition-all text-muted-foreground flex items-center justify-center gap-1">
                <Mail className="h-3 w-3"/> Contact Organiser
              </button>)}
          </div>
        </div>
      </div>

      {showContact && (<ContactMerchantModal itemTitle={event.title} eventId={event._id} onClose={() => setShowContact(false)}/>)}
    </motion.div>);
};
export default EventCard;
