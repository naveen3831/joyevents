import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, Loader2, CalendarDays, ArrowLeft, Mail, Star, ShoppingBag, Percent, MapPin } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiListEvents, apiGetFavorites, apiAddFavorite, apiRemoveFavorite, apiGetAllPromoCodes, apiValidatePromoCode } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

import EventCard from "@/components/EventCard";
import { Tag, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGsapStagger } from "@/lib/gsapAnimations";
const SORT_OPTIONS = [
    { value: "default", label: "Default" },
    { value: "date-asc", label: "Date: Earliest" },
    { value: "date-desc", label: "Date: Latest" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A–Z" },
];
const toTitleCase = (str) => {
    if (!str) return "";
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};
const EVENT_TYPES = ["All", "ticketed", "fullService"];
const CustomerBrowseEvents = () => {
    const { isLoggedIn, token, role } = useAuth();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [favMap, setFavMap] = useState({});

    // Quick Add to Cart State
    const [selectedEventForCart, setSelectedEventForCart] = useState(null);
    const [cartSession, setCartSession] = useState("");
    const [cartTickets, setCartTickets] = useState({});
    const [cartFullServiceQty, setCartFullServiceQty] = useState(1);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [validatePromoLoading, setValidatePromoLoading] = useState(false);
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [searchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
    const [selectedType, setSelectedType] = useState("All");
    const [sortBy, setSortBy] = useState("default");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    // Promo Codes
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    const [showAllPromos, setShowAllPromos] = useState(false);
    const fetchEvents = async (showLoader = false) => {
        if (showLoader)
            setLoading(true);
        try {
            const res = await apiListEvents();
            setEvents(prev => {
                const next = res.events || [];
                if (JSON.stringify(prev) !== JSON.stringify(next))
                    return next;
                return prev;
            });
        }
        catch {
            if (showLoader)
                toast.error("Failed to load events");
        }
        finally {
            if (showLoader)
                setLoading(false);
        }
    };
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
    useEffect(() => {
        fetchEvents(true);
        const interval = setInterval(() => fetchEvents(false), 5000);
        return () => clearInterval(interval);
    }, []);
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
    // Derive unique categories from data
    const categories = useMemo(() => {
        const cats = Array.from(new Set(events.map(e => e.category).filter(Boolean)));
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
            case "date-asc":
                list = [...list].sort((a, b) => new Date(a.datetime || a.date).getTime() - new Date(b.datetime || b.date).getTime());
                break;
            case "date-desc":
                list = [...list].sort((a, b) => new Date(b.datetime || b.date).getTime() - new Date(a.datetime || a.date).getTime());
                break;
            case "price-asc":
                list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case "price-desc":
                list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case "name-asc":
                list = [...list].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
                break;
        }
        return list;
    }, [events, search, selectedCategory, selectedType, sortBy, priceMin, priceMax]);
    const getCartEventTotalRaw = () => {
        if (!selectedEventForCart)
            return 0;
        if (selectedEventForCart.eventType !== "ticketed")
            return (selectedEventForCart.price || 0) * cartFullServiceQty;
        const sess = cartSession || (selectedEventForCart.hasMultipleSessions ? "" : null);
        const tickets = selectedEventForCart.hasMultipleSessions
            ? (selectedEventForCart.sessions?.[sess]?.tickets || [])
            : (selectedEventForCart.tickets || []);
        return Object.entries(cartTickets).reduce((sum, [type, qty]) => {
            const ticket = tickets.find((t) => t.type === type);
            return sum + (ticket?.price || 0) * Number(qty || 0);
        }, 0);
    };
    const getCartEventDiscount = () => {
        if (!appliedPromo || !selectedEventForCart)
            return 0;
        const base = getCartEventTotalRaw();
        let discount = 0;
        if (appliedPromo.discountType === "percentage") {
            discount = (base * appliedPromo.discountValue) / 100;
            if (appliedPromo.maxDiscount)
                discount = Math.min(discount, appliedPromo.maxDiscount);
        }
        else {
            discount = appliedPromo.discountValue;
        }
        return Math.min(base, discount);
    };
    const getCartEventTotal = () => {
        const base = getCartEventTotalRaw();
        const discount = getCartEventDiscount();
        return Math.max(0, base - discount);
    };
    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        setValidatePromoLoading(true);
        setPromoError("");
        try {
            const basePrice = getCartEventTotalRaw();
            if (basePrice <= 0) {
                setPromoError("Select tickets first to validate code");
                setValidatePromoLoading(false);
                return;
            }
            const res = await apiValidatePromoCode(promoCode.toUpperCase(), basePrice, selectedEventForCart._id, undefined, token || undefined);
            setAppliedPromo(res.promo);
            toast.success(`Promo code applied! You saved ${formatCurrency(res.discount)}`);
        }
        catch (err) {
            setPromoError(err.message || "Invalid promo code");
            setAppliedPromo(null);
        }
        finally {
            setValidatePromoLoading(false);
        }
    };
    const handleRemovePromo = () => {
        setPromoCode("");
        setAppliedPromo(null);
        setPromoError("");
    };
    const handleAddEventToCartDirect = () => {
        if (!isLoggedIn) {
            const dashboardUrl = `/customer-dashboard/browse-events`;
            localStorage.setItem("authReturnTo", dashboardUrl);
            toast.error("Please sign in to add items to cart");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
            return;
        }
        if (!selectedEventForCart)
            return;
        if (selectedEventForCart.eventType === "ticketed") {
            if (selectedEventForCart.hasMultipleSessions && !cartSession) {
                toast.error("Please select a session");
                return;
            }
            const totalQty = Object.values(cartTickets).reduce((a, b) => a + b, 0);
            if (totalQty === 0) {
                toast.error("Please select at least one ticket");
                return;
            }
        }
        else {
            if (cartFullServiceQty <= 0) {
                toast.error("Please specify quantity");
                return;
            }
        }
        const basePrice = getCartEventTotalRaw();
        const discount = getCartEventDiscount();
        const finalPrice = Math.max(0, basePrice - discount);
        addToCart({
            type: "event",
            itemId: selectedEventForCart._id,
            name: selectedEventForCart.title,
            price: finalPrice,
            originalPrice: basePrice,
            discountAmount: discount,
            appliedPromo: appliedPromo || undefined,
            date: new Date(selectedEventForCart.datetime).toISOString().split("T")[0],
            time: new Date(selectedEventForCart.datetime).toTimeString().split(" ")[0].slice(0, 5),
            image: selectedEventForCart.image,
            category: selectedEventForCart.category,
            merchantId: selectedEventForCart.createdBy?._id || selectedEventForCart.createdBy,
            details: {
                selectedTickets: selectedEventForCart.eventType === "ticketed" ? cartTickets : undefined,
                selectedSession: cartSession || "",
                selectedSeatNumbers: [],
                quantity: selectedEventForCart.eventType === "fullService" ? cartFullServiceQty : undefined
            }
        });
        setSelectedEventForCart(null);
        setCartSession("");
        setCartTickets({});
        setCartFullServiceQty(1);
        setPromoCode("");
        setAppliedPromo(null);
        setPromoError("");
    };
    const handleToggleFavorite = async (eventId) => {
        if (!isLoggedIn || !token) {
            toast.error("Please sign in to save favorites");
            return;
        }
        const favId = favMap[eventId];
        try {
            if (favId) {
                await apiRemoveFavorite(favId, token);
                setFavMap(prev => { const n = { ...prev }; delete n[eventId]; return n; });
                toast.success("Removed from favorites");
            }
            else {
                const res = await apiAddFavorite(eventId, null, "event", token);
                setFavMap(prev => ({ ...prev, [eventId]: res.favorite._id }));
                toast.success("Saved to favorites");
            }
        }
        catch {
            toast.error("Failed to update favorites");
        }
    };
    const goToDetail = (event) => {
        const dashboardUrl = `/customer-dashboard/events/${event._id}`;
        if (!isLoggedIn) {
            localStorage.setItem("authReturnTo", dashboardUrl);
            toast.error("Please sign in to view event details");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
            return;
        }
        navigate(dashboardUrl);
    };
    const imgSrc = (image) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";
    const gridRef = useGsapStagger([filtered.length, loading]);
    return (<CustomerLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link to="/customer-dashboard">
                <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2"/> Back</Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
                <CalendarDays className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Browse <span className="text-gradient">Events</span></h1>
                <p className="text-sm text-muted-foreground">Discover and book upcoming events</p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative w-full max-w-3xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input placeholder="Search events by name, location or category..." value={search} maxLength={30} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border w-full"/>
              </div>
            </div>

            {/* Category pills */}
            {categories.length > 1 && (<div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 rounded-full px-4 py-2 min-h-[36px] text-xs font-medium transition-colors ${selectedCategory === cat
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70"}`}>
                    {cat}
                  </button>))}
              </div>)}



            {/* Filters removed */}
          </motion.div>

          {/* Results count */}
          {!loading && (<p className="text-xs text-muted-foreground mb-4">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
            </p>)}

          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading events…
            </div>) : filtered.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center">
              <CalendarDays className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground"/>
              <p className="font-medium text-lg text-foreground">No events found</p>
              <p className="text-sm mt-1 text-muted-foreground">Try adjusting your search or filters</p>
              {activeFilterCount > 0 && (<Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear Filters</Button>)}
            </div>) : filtered.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center">
              <CalendarDays className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground"/>
              <p className="font-medium text-lg text-foreground">No events found</p>
              <p className="text-sm mt-1 text-muted-foreground">Try adjusting your search or filters</p>
              {activeFilterCount > 0 && (<Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear Filters</Button>)}
            </div>) : (<div ref={gridRef} className="grid grid-cols-1 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-3 min-[1400px]:grid-cols-4 gap-[20px] items-start w-full">
              {filtered.map((event, idx) => (
                <EventCard
                  key={event._id}
                  event={event}
                  index={idx}
                  isFavorited={favMap[event._id]}
                  onToggleFavorite={() => handleToggleFavorite(event._id)}
                  onViewDetails={() => goToDetail(event)}
                  onBookNow={() => navigate(`/customer-dashboard/events/${event._id}`)}
                />
              ))}
            </div>)}
        </div>
      </section>

      <Dialog open={!!selectedEventForCart} onOpenChange={(open) => { if (!open) {
        setSelectedEventForCart(null);
        setCartSession("");
        setCartTickets({});
        setCartFullServiceQty(1);
    } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Event Booking</DialogTitle>
          </DialogHeader>
          {selectedEventForCart && (<div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Event</h4>
                <p className="text-sm text-muted-foreground">{selectedEventForCart.title}</p>
                <div className="mt-3 grid gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span>Date</span>
                    <span className="font-medium text-foreground">{new Date(selectedEventForCart.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Time</span>
                    <span className="font-medium text-foreground">{new Date(selectedEventForCart.datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {selectedEventForCart.location && (<div className="flex justify-between gap-3">
                      <span>Location</span>
                      <span className="font-medium text-foreground text-right">{selectedEventForCart.location}</span>
                    </div>)}
                </div>
              </div>

              {selectedEventForCart.eventType === "ticketed" ? (<>
                  {selectedEventForCart.hasMultipleSessions && (<div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">Select Session</label>
                      <div className="flex gap-4">
                        {selectedEventForCart.sessions?.day?.enabled && (<Button type="button" variant={cartSession === "day" ? "default" : "outline"} className="flex-1" onClick={() => { setCartSession("day"); setCartTickets({}); }}>
                            Day Session {selectedEventForCart.sessions?.day?.time ? `(${selectedEventForCart.sessions.day.time})` : ""}
                          </Button>)}
                        {selectedEventForCart.sessions?.night?.enabled && (<Button type="button" variant={cartSession === "night" ? "default" : "outline"} className="flex-1" onClick={() => { setCartSession("night"); setCartTickets({}); }}>
                            Night Session {selectedEventForCart.sessions?.night?.time ? `(${selectedEventForCart.sessions.night.time})` : ""}
                          </Button>)}
                      </div>
                    </div>)}

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Select Tickets</label>
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                      {(() => {
                    const sess = cartSession || (selectedEventForCart.sessions?.day?.enabled ? "day" : "night");
                    const tickets = selectedEventForCart.hasMultipleSessions
                        ? (selectedEventForCart.sessions?.[sess]?.tickets || [])
                        : (selectedEventForCart.tickets || []);
                    return tickets.map((t) => {
                        const remaining = (t.available || 0) - (t.sold || 0);
                        const qty = cartTickets[t.type] || 0;
                        return (<div key={t.type} className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold capitalize">{t.type} Tier</span>
                              <span className="text-xs text-muted-foreground block">{formatCurrency(t.price)}</span>
                              <span className={`text-[10px] ${remaining <= 0 ? "text-red-500" : "text-muted-foreground"}`}>{remaining <= 0 ? "Sold out" : `${remaining} left`}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={qty <= 0} onClick={() => setCartTickets(prev => ({ ...prev, [t.type]: Math.max(0, (prev[t.type] || 0) - 1) }))}>
                                -
                              </Button>
                              <span className="text-sm font-bold w-4 text-center">{qty}</span>
                              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={remaining <= 0 || qty >= remaining} onClick={() => setCartTickets(prev => ({ ...prev, [t.type]: (prev[t.type] || 0) + 1 }))}>
                                +
                              </Button>
                            </div>
                          </div>);
                    });
                })()}
                    </div>
                  </div>
                </>) : (<div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setCartFullServiceQty(q => Math.max(1, q - 1))}>
                      -
                    </Button>
                    <span className="text-sm font-bold w-4 text-center">{cartFullServiceQty}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setCartFullServiceQty(q => q + 1)}>
                      +
                    </Button>
                  </div>
                </div>)}

              {/* Promo Code Validation */}
              <div className="border-t border-border pt-4 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Promo Code</label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Percent className="h-3.5 w-3.5" />
                      <span>{appliedPromo.code} Applied ({appliedPromo.discountType === "percentage" ? `${appliedPromo.discountValue}%` : formatCurrency(appliedPromo.discountValue)} off)</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemovePromo} className="text-red-500 hover:text-red-600 h-7 px-2 text-xs">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="ENTER PROMO CODE"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="h-9 rounded-xl text-xs uppercase"
                    />
                    <Button 
                      type="button" 
                      onClick={handleApplyPromo} 
                      disabled={validatePromoLoading}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground h-9 px-3 rounded-xl shrink-0 text-xs"
                    >
                      {validatePromoLoading ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                )}
                {promoError && <p className="text-[10px] text-red-500 font-semibold mt-1">{promoError}</p>}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 space-y-2">
                {getCartEventDiscount() > 0 && (<>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(getCartEventTotalRaw())}</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                      <span>Promo Discount</span>
                      <span>-{formatCurrency(getCartEventDiscount())}</span>
                    </div>
                    <div className="h-px bg-primary/20 my-1"/>
                  </>)}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking total</span>
                  <span className="font-display text-xl font-bold text-gradient">{formatCurrency(getCartEventTotal())}</span>
                </div>
              </div>

              <Button onClick={handleAddEventToCartDirect} className="w-full bg-gradient-primary">
                Add to Cart - {formatCurrency(getCartEventTotal())}
              </Button>
            </div>)}
        </DialogContent>
      </Dialog>
    </CustomerLayout>);
};
export default CustomerBrowseEvents;
