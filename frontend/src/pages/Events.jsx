import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, Filter, X, Loader2, ChevronLeft, ChevronRight, ArrowRight, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventCard from "@/components/EventCard";
import Layout from "@/components/Layout";
import SimplePayment from "@/components/SimplePayment";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiListEvents, apiListCategories, apiGetFavorites, apiAddFavorite, apiRemoveFavorite, apiGetAllPromoCodes } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ManageCategoriesModal from "@/components/ManageCategoriesModal";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
const Events = () => {
    const settings = useHomepageSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [dbCategories, setDbCategories] = useState([]);
    const [showCatModal, setShowCatModal] = useState(false);
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    // favorites: map of eventId -> favoriteId (or true if favorited)
    const [favMap, setFavMap] = useState({});
    const { isLoggedIn, role, token } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        loadEvents();
        // Real-time polling — silent update every 5s, no loading flash
        const pollInterval = setInterval(async () => {
            try {
                const res = await apiListEvents();
                setEvents(prev => {
                    const next = res.events || [];
                    // Only update if data actually changed
                    if (JSON.stringify(prev) !== JSON.stringify(next))
                        return next;
                    return prev;
                });
            }
            catch {
                // silently ignore polling errors
            }
        }, 5000);
        const handleEventUpdate = () => loadEvents();
        window.addEventListener('eventUpdated', handleEventUpdate);
        window.addEventListener('eventCreated', handleEventUpdate);
        window.addEventListener('globalEventUpdate', handleEventUpdate);
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('eventUpdated', handleEventUpdate);
            window.removeEventListener('eventCreated', handleEventUpdate);
            window.removeEventListener('globalEventUpdate', handleEventUpdate);
        };
    }, []);
    const loadEvents = async () => {
        try {
            const res = await apiListEvents();
            setEvents(res.events || []);
        }
        catch (error) {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };
    const loadCategories = async () => {
        try {
            const res = await apiListCategories("event");
            setDbCategories(res.categories || []);
        }
        catch (e) {
            // silently ignore category load errors
        }
    };
    useEffect(() => {
        loadCategories();
    }, []);
    // Load promo codes
    useEffect(() => {
        const loadPromoCodes = async () => {
            try {
                const res = await apiGetAllPromoCodes();
                setPromoCodes((res.promoCodes || []).filter((p) => p.isActive));
            }
            catch (error) {
            }
            finally {
                setPromoLoading(false);
            }
        };
        loadPromoCodes();
        const pollInterval = setInterval(loadPromoCodes, 10000);
        return () => clearInterval(pollInterval);
    }, []);
    // Load favorites for logged-in customers
    useEffect(() => {
        if (!isLoggedIn || !token || role !== "customer")
            return;
        apiGetFavorites(token)
            .then((res) => {
            const map = {};
            (res.favorites || []).forEach((f) => {
                if (f.type === "event" && f.event?._id)
                    map[f.event._id] = f._id;
            });
            setFavMap(map);
        })
            .catch(() => { });
    }, [isLoggedIn, token, role]);
    const handleToggleFavorite = async (event) => {
        if (!isLoggedIn || !token) {
            toast.error("Please sign in to save favorites");
            return;
        }
        const favId = favMap[event._id];
        try {
            if (favId) {
                await apiRemoveFavorite(favId, token);
                setFavMap(prev => { const n = { ...prev }; delete n[event._id]; return n; });
                toast.success("Removed from favorites");
            }
            else {
                const res = await apiAddFavorite(event._id, null, "event", token);
                setFavMap(prev => ({ ...prev, [event._id]: res.favorite._id }));
                toast.success("Saved to favorites");
            }
        }
        catch {
            toast.error("Failed to update favorites");
        }
    };
    // Sync state with URL parameter if it changes externally
    useEffect(() => {
        const urlCategory = searchParams.get("category");
        if (urlCategory && urlCategory !== activeCategory) {
            setActiveCategory(urlCategory);
        }
        else if (!urlCategory && activeCategory !== "All") {
            setActiveCategory("All");
        }
    }, [searchParams]);
    // Sync URL parameter if state changes internally
    const handleCategoryChange = (cat) => {
        setActiveCategory(cat);
        if (cat === "All") {
            setSearchParams({});
        }
        else {
            setSearchParams({ category: cat });
        }
    };
    const handleBookNow = (event) => {
        const dashboardUrl = `/customer-dashboard/events/${event._id}`;
        if (!isLoggedIn || !token) {
            // Save the specific event ID to redirect after login
            localStorage.setItem("authReturnTo", dashboardUrl);
            sessionStorage.setItem("postLoginRedirect", dashboardUrl);
            toast.error("Please login to book events");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`, {
                state: { from: dashboardUrl }
            });
            return;
        }
        // If logged in as customer, go to dashboard version for booking
        if (role === "customer") {
            navigate(dashboardUrl);
        }
        else {
            navigate(`/events/${event._id}`);
        }
    };
    const handlePaymentSuccess = (booking) => {
        setShowModal(false);
        toast.success("Payment successful! Your booking is being reviewed.");
        navigate("/customer-dashboard/bookings");
    };
    const handlePaymentError = (_error) => {
        // Keep modal open so user can retry
    };
    const handleImageClick = (event, idx) => {
        setSelectedEvent(event);
        setSelectedImageIndex(idx);
    };
    const categories = ["All", ...Array.from(new Set([
            ...dbCategories.map(c => c.name),
            ...events.map(e => e.category).filter(Boolean)
        ]))];
    const filtered = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
            event.location.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === "All" || event.category === activeCategory;
        return matchesSearch && matchesCategory;
    });
    return (<Layout>
      {/* Hero Banner */}
      <section className="relative isolate overflow-hidden">
        <img src={settings.eventsImage || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1600&q=80"} alt="Browse Events" className="h-[50vh] min-h-[320px] w-full object-cover sm:h-[55vh] md:h-[60vh] lg:h-[65vh]" loading="eager"/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"/>
        <div className="absolute inset-0 flex items-center pt-20">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Browse Events</p>
              <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Discover events that <span className="text-primary">move</span> you
              </h1>
              <p className="mt-5 text-lg text-white/75">
                From live concerts and sports to cultural festivals and workshops — find, book, and experience extraordinary events near you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                    Host an Event <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </Link>
                <Link to="/services">
                  <Button variant="outline">Browse Services</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto">

          {/* Search & Filter */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input placeholder="Search events, locations..." value={search} maxLength={30} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border"/>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0"/>
              {categories.map((cat) => (<button key={cat} onClick={() => handleCategoryChange(cat)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${activeCategory === cat
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {cat}
                </button>))}
              {role === "admin" && (<Button variant="outline" size="sm" onClick={() => setShowCatModal(true)} className="ml-2 gap-1 rounded-full whitespace-nowrap">
                  <Filter className="h-3 w-3"/> Manage Categories
                </Button>)}
            </div>
          </motion.div>

          {/* Results */}
          {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading events…
            </div>) : filtered.length === 0 ? (<div className="py-20 text-center text-muted-foreground">
              No events found matching your criteria.
            </div>) : (<div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((event, idx) => (<motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}>
                  <EventCard event={event} index={idx} onBookNow={handleBookNow} onViewDetails={(e) => navigate(`/events/${e._id}`)} onImageClick={(imageIdx) => handleImageClick(event, imageIdx)} isFavorited={!!favMap[event._id]} onToggleFavorite={role === "customer" ? handleToggleFavorite : undefined}/>
                </motion.div>))}
            </div>)}
        </div>
      </section>


      {/* Booking Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment & Booking Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (<SimplePayment amount={selectedEvent.eventType === "ticketed" ? 0 : selectedEvent.price} bookingData={{
                eventName: selectedEvent.title,
                eventId: selectedEvent._id,
                date: new Date(selectedEvent.datetime).toISOString().split('T')[0],
                time: new Date(selectedEvent.datetime).toTimeString().split(' ')[0].slice(0, 5),
                ticketType: selectedEvent.eventType === "ticketed" ? undefined : undefined,
            }} onSuccess={handlePaymentSuccess} onError={handlePaymentError} onClose={() => setShowModal(false)}/>)}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      {selectedImageIndex !== null && selectedEvent && selectedEvent.gallery && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setSelectedImageIndex(null)}>
          <div className="relative max-w-7xl max-h-screen p-4 flex items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setSelectedImageIndex(null)} className="absolute top-4 right-4 z-[60] rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
              <X className="h-6 w-6"/>
            </button>

            {/* Previous button */}
            {selectedImageIndex > 0 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="h-8 w-8"/>
              </button>)}

            {/* Next button */}
            {selectedImageIndex < selectedEvent.gallery.length - 1 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="h-8 w-8"/>
              </button>)}

            {/* Image */}
            <motion.img key={selectedImageIndex} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} src={selectedEvent.gallery[selectedImageIndex]?.startsWith("http") ? selectedEvent.gallery[selectedImageIndex] : `${API_URL}${selectedEvent.gallery[selectedImageIndex]}`} alt={`Gallery ${selectedImageIndex + 1}`} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"/>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm z-[60]">
              {selectedImageIndex + 1} / {selectedEvent.gallery.length}
            </div>
          </div>
        </motion.div>)}

      {showCatModal && (<ManageCategoriesModal type="event" onClose={() => setShowCatModal(false)} onCategoriesChanged={loadCategories}/>)}
    </Layout>);
};
export default Events;
