import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, Loader2, CalendarDays, ArrowLeft, SlidersHorizontal, X, Mail, Star } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiListEvents, apiGetFavorites, apiAddFavorite, apiRemoveFavorite, apiGetAllPromoCodes } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import ContactMerchantModal from "@/components/ContactMerchantModal";
import { Tag, Ticket, Copy } from "lucide-react";

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "date-asc", label: "Date: Earliest" },
  { value: "date-desc", label: "Date: Latest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
];

const EVENT_TYPES = ["All", "ticketed", "fullService"];

const CustomerBrowseEvents = () => {
  const { isLoggedIn, token, role } = useAuth() as any;
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favMap, setFavMap] = useState<Record<string, string>>({});
  const [contactEvent, setContactEvent] = useState<any>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Promo Codes
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [showAllPromos, setShowAllPromos] = useState(false);

  const fetchEvents = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiListEvents();
      setEvents(prev => {
        const next = res.events || [];
        if (JSON.stringify(prev) !== JSON.stringify(next)) return next;
        return prev;
      });
    } catch {
      if (showLoader) toast.error("Failed to load events");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Load promo codes
  useEffect(() => {
    const loadPromoCodes = async () => {
      try {
        const res = await apiGetAllPromoCodes();
        setPromoCodes((res.promoCodes || []).filter((p: any) => p.isActive));
      } catch (error) {
      } finally {
        setPromoLoading(false);
      }
    };

    loadPromoCodes();
    const pollInterval = setInterval(loadPromoCodes, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    fetchEvents(true);
    const interval = setInterval(() => fetchEvents(false), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !token || role !== "customer") return;
    apiGetFavorites(token)
      .then((res: any) => {
        const map: Record<string, string> = {};
        (res.favorites || []).forEach((f: any) => {
          if (f.type === "event" && f.event?._id) map[f.event._id] = f._id;
        });
        setFavMap(map);
      })
      .catch(() => {});
  }, [isLoggedIn, token, role]);

  // Derive unique categories from data
  const categories = useMemo(() => {
    const cats = Array.from(new Set(events.map(e => e.category).filter(Boolean))) as string[];
    return ["All", ...cats.sort()];
  }, [events]);

  const activeFilterCount = [
    selectedCategory !== "All",
    selectedType !== "All",
    sortBy !== "default",
    !!priceMin,
    !!priceMax,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedType("All");
    setSortBy("default");
    setPriceMin("");
    setPriceMax("");
  };

  const filtered = useMemo(() => {
    let list = events.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);
      const matchCat = selectedCategory === "All" || e.category === selectedCategory;
      const matchType = selectedType === "All" || e.eventType === selectedType;
      const price = e.price || 0;
      const matchMin = !priceMin || price >= Number(priceMin);
      const matchMax = !priceMax || price <= Number(priceMax);
      return matchSearch && matchCat && matchType && matchMin && matchMax;
    });

    switch (sortBy) {
      case "date-asc": list = [...list].sort((a, b) => new Date(a.datetime || a.date).getTime() - new Date(b.datetime || b.date).getTime()); break;
      case "date-desc": list = [...list].sort((a, b) => new Date(b.datetime || b.date).getTime() - new Date(a.datetime || a.date).getTime()); break;
      case "price-asc": list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case "price-desc": list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "name-asc": list = [...list].sort((a, b) => (a.title || "").localeCompare(b.title || "")); break;
    }
    return list;
  }, [events, search, selectedCategory, selectedType, sortBy, priceMin, priceMax]);

  const handleToggleFavorite = async (eventId: string) => {
    if (!isLoggedIn || !token) { toast.error("Please sign in to save favorites"); return; }
    const favId = favMap[eventId];
    try {
      if (favId) {
        await apiRemoveFavorite(favId, token);
        setFavMap(prev => { const n = { ...prev }; delete n[eventId]; return n; });
        toast.success("Removed from favorites");
      } else {
        const res: any = await apiAddFavorite(eventId, null, "event", token);
        setFavMap(prev => ({ ...prev, [eventId]: res.favorite._id }));
        toast.success("Saved to favorites");
      }
    } catch { toast.error("Failed to update favorites"); }
  };

  const goToDetail = (event: any) => {
    const dashboardUrl = `/customer-dashboard/events/${event._id}`;
    if (!isLoggedIn) {
      localStorage.setItem("authReturnTo", dashboardUrl);
      toast.error("Please sign in to view event details");
      navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
      return;
    }
    navigate(dashboardUrl);
  };

  const imgSrc = (image: string) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";

  return (
    <CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link to="/customer-dashboard">
                <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">Browse <span className="text-gradient">Events</span></h1>
                <p className="text-muted-foreground text-sm">Discover and book upcoming events</p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative w-full max-w-3xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search events by name, location or category..."
                  value={search}
                  maxLength={30}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border w-full"
                />
              </div>
            </div>

            {/* Category pills */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Promo Codes Section */}
            {!promoLoading && promoCodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold font-display">Exclusive <span className="text-gradient">Offers</span></h2>
                  </div>
                  {promoCodes.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPromos(!showAllPromos)}
                      className="text-primary hover:text-primary/80 font-semibold"
                    >
                      {showAllPromos ? "Show Less" : `View All (${promoCodes.length})`}
                    </Button>
                  )}
                </div>
                {showAllPromos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                    {promoCodes.map((promo) => (
                      <div
                        key={promo._id}
                        className="p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col gap-2 group hover:border-primary/40 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                            {promo.code}
                          </span>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `${formatCurrency(promo.discountValue)} OFF`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium line-clamp-1">{promo.description || `Special discount for you!`}</p>
                        <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-tight">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            Min. {formatCurrency(promo.minBookingAmount || 0)}
                          </span>
                          {promo.expiryDate && (
                            <span>Expires: {new Date(promo.expiryDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2 w-full h-8 text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(promo.code);
                            toast.success("Code copied to clipboard!");
                          }}
                        >
                          Copy Code
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {promoCodes.slice(0, 5).map((promo) => (
                      <div
                        key={promo._id}
                        className="shrink-0 w-72 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col gap-2 group hover:border-primary/40 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                            {promo.code}
                          </span>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `${formatCurrency(promo.discountValue)} OFF`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium line-clamp-1">{promo.description || `Special discount for you!`}</p>
                        <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-tight">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            Min. {formatCurrency(promo.minBookingAmount || 0)}
                          </span>
                          {promo.expiryDate && (
                            <span>Expires: {new Date(promo.expiryDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2 w-full h-8 text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(promo.code);
                            toast.success("Code copied to clipboard!");
                          }}
                        >
                          Copy Code
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Filters removed */}
          </motion.div>

          {/* Results count */}
          {!loading && (
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p className="font-medium text-lg">No events found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((event, idx) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
                    {imgSrc(event.image) ? (
                      <img src={imgSrc(event.image)} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><CalendarDays className="h-12 w-12 opacity-20" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {event.category && (
                      <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {event.category}
                      </span>
                    )}
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {(() => {
                        // For ticketed events, show min ticket price
                        if (event.eventType === "ticketed" && event.tickets?.length > 0) {
                          const minPrice = Math.min(...event.tickets.map((t: any) => t.price || 0).filter((p: number) => p > 0));
                          return minPrice > 0 ? `Starts from ${formatCurrency(minPrice)}` : `Starts from ${formatCurrency(event.price || 0)}`;
                        }
                        // For session events
                        if (event.eventType === "ticketed" && event.hasMultipleSessions) {
                          return `Starts from ${formatCurrency(event.price || 0)}`;
                        }
                        return event.price > 0 ? `Starts from ${formatCurrency(event.price)}` : `Starts from ${formatCurrency(0)}`;
                      })()}
                    </span>
                    {role === "customer" && (
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleFavorite(event._id); }}
                        className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 backdrop-blur-sm hover:bg-black/70 transition-colors"
                      >
                        <svg className={`h-4 w-4 ${favMap[event._id] ? "fill-red-500 text-red-500" : "text-white"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-2 sm:p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-xs sm:text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    {/* Rating display */}
                    {event.averageRating && event.averageRating > 0 ? (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        <span className="text-xs font-semibold">
                          {event.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({event.ratingCount || 0})
                        </span>
                      </div>
                    ) : null}
                    <ul className="mt-3 space-y-1">
                      {event.category && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {event.category} event
                        </li>
                      )}
                      {event.datetime && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {new Date(event.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </li>
                      )}
                      {event.location && (
                        <li className="flex items-center gap-2 text-xs text-muted-foreground line-clamp-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {event.location}
                        </li>
                      )}
                    </ul>

                    <div className="flex-1" />

                    <div className="mt-2 sm:mt-5 flex flex-col gap-1.5 sm:gap-2">
                      <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10" onClick={() => goToDetail(event)}>
                        View Details
                      </Button>
                      <Button className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => goToDetail(event)}>
                        Book Now
                      </Button>
                      {event.createdBy && (
                        <button
                          onClick={() => setContactEvent(event)}
                          className="w-full rounded-lg py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium border border-border hover:bg-secondary transition-all text-muted-foreground flex items-center justify-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" /> Contact Organiser
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
      {contactEvent && (
        <ContactMerchantModal
          itemTitle={contactEvent.title}
          eventId={contactEvent._id}
          onClose={() => setContactEvent(null)}
        />
      )}
    </CustomerLayout>
  );
};

export default CustomerBrowseEvents;




