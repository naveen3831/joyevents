import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles, Calendar, MapPin, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCustomerRecommendations } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger, useGsapCardHover } from "@/lib/gsapAnimations";

const RecommendationCard = ({ event, index, navigate, imgSrc }) => {
    const hoverRef = useGsapCardHover({ lift: -5, scale: 1.02 });
    return (
      <div
        ref={hoverRef}
        onClick={() => navigate(`/customer-dashboard/events/${event._id}`)}
        className="rounded-xl border border-border bg-card overflow-hidden will-change-transform group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
      >
        {/* Image */}
        <div className="relative h-40 overflow-hidden bg-secondary">
          {imgSrc(event.image) ? (<img src={imgSrc(event.image)} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh">
              <Calendar className="h-10 w-10 opacity-20"/>
            </div>)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
          {event.category && (<span className="absolute top-2 left-2 rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {event.category}
            </span>)}
          {event.live && (<span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"/> LIVE
            </span>)}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{event.title}</h3>

            <div className="mt-2 space-y-1">
              {event.datetime && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0"/>
                  {new Date(event.datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>)}
              {event.location && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0"/>
                  <span className="truncate">{event.location}</span>
                </div>)}
            </div>

            {/* AI reason */}
            {event._reason && (<div className="mt-2 flex items-center gap-1.5 text-xs text-primary/80 bg-primary/5 rounded-lg px-2 py-1">
                <Sparkles className="h-3 w-3 shrink-0"/>
                <span className="truncate">{event._reason}</span>
              </div>)}
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
            <span className="font-bold text-sm text-gradient">{formatCurrency(event.price)}</span>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-8 px-3 text-xs min-h-[32px]" onClick={(e) => { e.stopPropagation(); navigate(`/customer-dashboard/events/${event._id}`); }}>
              Book <ArrowRight className="ml-1 h-3 w-3"/>
            </Button>
          </div>
        </div>
      </div>);
};

const AIRecommendations = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalHistory, setTotalHistory] = useState(0);
    const gridRef = useGsapStagger([recommendations]);
    useEffect(() => {
        if (!token)
            return;
        apiGetCustomerRecommendations(token)
            .then(res => {
            setRecommendations(res.recommendations || []);
            setTotalHistory(res.totalHistory || 0);
        })
            .catch((err) => toast.error(err?.message || "Failed to load recommendations"))
            .finally(() => setLoading(false));
    }, [token]);
    const imgSrc = (img) => !img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`;
    return (<CustomerLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  AI <span className="text-gradient">Recommendations</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  {totalHistory > 0
            ? `Personalised picks based on your ${totalHistory} past bookings`
            : "Trending events you might love"}
                </p>
              </div>
            </div>

            {/* AI badge */}
            <div className="mt-4 mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5"/>
              Powered by smart preference matching
            </div>
          </motion.div>

          {loading ? (<div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin"/> Analysing your preferences…
            </div>) : recommendations.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p className="font-semibold text-lg text-muted-foreground">No events available right now</p>
              <p className="text-sm mt-2 text-muted-foreground">Check back soon for upcoming events</p>
              <Link to="/customer-dashboard/browse-events" className="mt-4 inline-block">
                <Button className="bg-gradient-primary text-primary-foreground">Browse Events</Button>
              </Link>
            </div>) : (<div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recommendations.map((event, idx) => (<RecommendationCard key={event._id} event={event} index={idx} navigate={navigate} imgSrc={imgSrc}/>))}
            </div>)}
        </div>
      </section>
    </CustomerLayout>);
};
export default AIRecommendations;
