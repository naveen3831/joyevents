import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Briefcase, ArrowLeft, Mail, Star, ShoppingBag, Percent, Sparkles, Tag, Ticket, ChevronLeft, ChevronRight, Calendar, MapPin, ArrowRight, SlidersHorizontal, Filter, RotateCcw, X } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiListServices, apiGetAllPromoCodes, apiValidatePromoCode } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import ContactMerchantModal from "@/components/ContactMerchantModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGsapStagger } from "@/lib/gsapAnimations";
const SORT_OPTIONS = [
    { value: "default", label: "Default" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A–Z" },
    { value: "name-desc", label: "Name: Z–A" },
];
const CustomerBrowseServices = () => {
    const { isLoggedIn, token } = useAuth();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [contactService, setContactService] = useState(null);
    const [showCustomModal, setShowCustomModal] = useState(false);
    // Quick Add to Cart State
    const [selectedServiceForCart, setSelectedServiceForCart] = useState(null);
    const [cartDate, setCartDate] = useState("");
    const [cartTime, setCartTime] = useState("");
    const [cartAddress, setCartAddress] = useState("");
    const [cartGuestCount, setCartGuestCount] = useState(1);
    const [cartAddOns, setCartAddOns] = useState({});
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [validatePromoLoading, setValidatePromoLoading] = useState(false);
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [searchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
    const [sortBy, setSortBy] = useState("default");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    // Promo Codes
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    const [showAllPromos, setShowAllPromos] = useState(false);
    const fetchServices = async (showLoader = false) => {
        if (showLoader)
            setLoading(true);
        try {
            const res = await apiListServices();
            const active = (res.services || []).filter((s) => s.active !== false);
            setServices(prev => JSON.stringify(prev) !== JSON.stringify(active) ? active : prev);
        }
        catch {
            if (showLoader)
                toast.error("Failed to load services");
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
        fetchServices(true);
        const interval = setInterval(() => {
            fetchServices(false);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const availableCategories = useMemo(() => {
        const serviceCats = Array.from(new Set(services.map(s => s.category).filter(Boolean)));
        return ["All", ...serviceCats.sort()];
    }, [services]);
    const activeFilterCount = [
        selectedCategory !== "All",
        sortBy !== "default",
        !!priceMin,
        !!priceMax,
    ].filter(Boolean).length;
    const clearFilters = () => {
        setSelectedCategory("All");
        setSortBy("default");
        setPriceMin("");
        setPriceMax("");
    };
    const filtered = useMemo(() => {
        let list = services.filter(s => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                s.name?.toLowerCase().includes(q) ||
                s.category?.toLowerCase().includes(q) ||
                s.description?.toLowerCase().includes(q);
            const matchCat = selectedCategory === "All" || s.category === selectedCategory;
            const price = s.price || 0;
            const matchMin = !priceMin || price >= Number(priceMin);
            const matchMax = !priceMax || price <= Number(priceMax);
            return matchSearch && matchCat && matchMin && matchMax;
        });
        switch (sortBy) {
            case "price-asc":
                list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case "price-desc":
                list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case "name-asc":
                list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                break;
            case "name-desc":
                list = [...list].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
                break;
        }
        return list;
    }, [services, search, selectedCategory, sortBy, priceMin, priceMax]);
    const imgSrc = (image) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";
    const getCartAddOnTotal = () => (selectedServiceForCart?.addOns || []).reduce((sum, addon) => {
        const qty = Number(cartAddOns[addon.name] || 0);
        return sum + (Number(addon.price) || 0) * qty;
    }, 0);
    const getCartServiceTotalRaw = () => (selectedServiceForCart?.price || 0) + getCartAddOnTotal();
    const getCartServiceDiscount = () => {
        if (!appliedPromo || !selectedServiceForCart)
            return 0;
        const base = getCartServiceTotalRaw();
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
    const getCartServiceTotal = () => {
        const base = getCartServiceTotalRaw();
        const discount = getCartServiceDiscount();
        return Math.max(0, base - discount);
    };
    const resetServiceCartForm = () => {
        setSelectedServiceForCart(null);
        setCartDate("");
        setCartTime("");
        setCartAddress("");
        setCartGuestCount(1);
        setCartAddOns({});
        setPromoCode("");
        setAppliedPromo(null);
        setPromoError("");
    };
    const updateCartAddOn = (addon, nextQty) => {
        const maxQty = Number(addon.maxQuantity || 1);
        const minQty = Number(addon.minQuantity || 1);
        const qty = Math.max(0, Math.min(maxQty, Number(nextQty || 0)));
        setCartAddOns((prev) => {
            const next = { ...prev };
            if (qty <= 0) {
                delete next[addon.name];
            }
            else {
                next[addon.name] = Math.max(minQty, qty);
            }
            return next;
        });
    };
    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        setValidatePromoLoading(true);
        setPromoError("");
        try {
            const basePrice = getCartServiceTotalRaw();
            if (basePrice <= 0) {
                setPromoError("Select add-ons/details first to validate code");
                setValidatePromoLoading(false);
                return;
            }
            const res = await apiValidatePromoCode(promoCode.toUpperCase(), basePrice, undefined, selectedServiceForCart._id, token || undefined);
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
    const handleAddServiceToCartDirect = () => {
        if (!isLoggedIn) {
            const dashboardUrl = `/customer-dashboard/browse-services`;
            localStorage.setItem("authReturnTo", dashboardUrl);
            toast.error("Please sign in to add items to cart");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
            return;
        }
        if (!selectedServiceForCart)
            return;
        if (!cartDate || !cartTime) {
            toast.error("Please select a date and time");
            return;
        }
        if (!cartAddress) {
            toast.error("Please enter a delivery address");
            return;
        }
        if (selectedServiceForCart.allowGuests && (!cartGuestCount || cartGuestCount <= 0)) {
            toast.error("Please enter guest count");
            return;
        }
        const selectedAddOns = (selectedServiceForCart.addOns || [])
            .filter((addon) => (cartAddOns[addon.name] || 0) > 0)
            .map((addon) => ({
            name: addon.name,
            price: Number(addon.price) || 0,
            quantity: Number(cartAddOns[addon.name]) || 1
        }));
        const basePrice = getCartServiceTotalRaw();
        const discount = getCartServiceDiscount();
        const finalPrice = Math.max(0, basePrice - discount);
        addToCart({
            type: "service",
            itemId: selectedServiceForCart._id,
            name: selectedServiceForCart.name,
            price: finalPrice,
            originalPrice: basePrice,
            discountAmount: discount,
            appliedPromo: appliedPromo || undefined,
            date: cartDate,
            time: cartTime,
            image: selectedServiceForCart.image,
            category: selectedServiceForCart.category,
            merchantId: selectedServiceForCart.createdBy?._id || selectedServiceForCart.createdBy,
            details: {
                addOns: selectedAddOns,
                customerLocation: { address: cartAddress, latitude: 12.9716, longitude: 77.5946 },
                guestCount: selectedServiceForCart.allowGuests ? Number(cartGuestCount) : undefined
            }
        });
        resetServiceCartForm();
    };
    const goToDetail = (svc) => {
        const dashboardUrl = `/customer-dashboard/services/${svc._id}`;
        if (!isLoggedIn) {
            localStorage.setItem("authReturnTo", dashboardUrl);
            toast.error("Please sign in to view service details");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
            return;
        }
        navigate(dashboardUrl);
    };
    const gridRef = useGsapStagger([filtered.length, loading]);
    return (
    <CustomerLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            {/* Header Copy / Matter */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Curated Marketplace
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  Explore & Book <span className="text-gradient">Professional Services</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                  Discover wedding decor, photography, catering, DJ services, and professional helpers for your next celebration. Filter by category or request a custom service instantly.
                </p>
              </div>

              <Button onClick={() => navigate("/customer-dashboard/request-custom-service")} className="bg-gradient-primary text-white font-bold h-11 px-5 rounded-2xl shadow-glow hover:scale-105 transition-all shrink-0">
                <Sparkles className="h-4 w-4 mr-2" /> Request Custom Service
              </Button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                  placeholder="Search services by title, category, description..."
                  value={search}
                  maxLength={50}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border rounded-xl h-11 text-sm w-full shadow-sm"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-11 px-5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 ${
                  showFilters
                    ? "bg-gradient-primary text-white shadow-glow"
                    : activeFilterCount > 0
                    ? "bg-primary/15 border border-primary/40 text-primary hover:bg-primary/20"
                    : "bg-card border border-border hover:bg-secondary text-foreground"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-white shadow-sm">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Expandable Filter Drawer Panel (Only visible when showFilters is TRUE) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card shadow-card space-y-5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4.5 w-4.5 text-primary" />
                        <h3 className="font-display text-base font-bold text-foreground">Filter & Sort Options</h3>
                      </div>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


                      {/* Filter 2: Price Range */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Price Range (₹)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Min ₹"
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="h-10 text-xs rounded-xl bg-secondary/50 border-border"
                          />
                          <span className="text-muted-foreground text-xs font-bold">–</span>
                          <Input
                            type="number"
                            placeholder="Max ₹"
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="h-10 text-xs rounded-xl bg-secondary/50 border-border"
                          />
                        </div>
                      </div>

                      {/* Filter 3: Sort By */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Sort Order
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filter 4: Category Pills inside Filter Panel */}
                    {availableCategories.length > 1 && (
                      <div className="pt-2 border-t border-border/60">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                          Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                selectedCategory === cat
                                  ? "bg-gradient-primary text-white font-bold shadow-sm"
                                  : "bg-secondary text-foreground hover:bg-secondary/70"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Services Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-500" /> Services ({filtered.length})
              </h2>
            </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading services...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                  <Briefcase className="mx-auto mb-4 h-12 w-12 opacity-30 text-muted-foreground" />
                  <p className="font-medium text-lg text-foreground">No services found</p>
                  <p className="text-sm mt-1 text-muted-foreground">Try adjusting your search or filters</p>
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div ref={gridRef} className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((svc, i) => (
                    <motion.div
                      key={svc._id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => goToDetail(svc)}
                      className="group rounded-[14px] border border-border bg-card overflow-hidden flex flex-col shadow-[0_4px_14px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(15,23,42,0.1)] hover:border-primary/50 transition-all duration-300 w-full min-w-0 h-full cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative overflow-hidden bg-secondary shrink-0 w-full h-[175px]">
                        {imgSrc(svc.image) ? (
                          <img
                            src={imgSrc(svc.image)}
                            alt={svc.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Briefcase className="h-10 w-10 opacity-20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                          From {formatCurrency(svc.price)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-[14px_18px_16px_18px] flex flex-col flex-grow min-w-0">
                        <div>
                          <h3 className="font-display text-base sm:text-lg font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors cursor-pointer">
                            {svc.name}
                          </h3>

                          {/* Rating display */}
                          {svc.averageRating && svc.averageRating > 0 ? (
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                              <span className="text-xs font-semibold">
                                {svc.averageRating.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({svc.ratingCount || 0})
                              </span>
                            </div>
                          ) : null}

                          {svc.highlights?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {svc.highlights.slice(0, 2).map((h, hi) => (
                                <li key={hi} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                  <span className="line-clamp-1">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Action Area */}
                        <div className="mt-auto pt-[16px] space-y-[10px]">
                          <Button
                            className="w-full h-[46px] rounded-xl text-xs font-semibold bg-gradient-primary text-white hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedServiceForCart(svc);
                            }}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" /> Book Now
                          </Button>

                          {svc.createdBy && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactService(svc);
                              }}
                              className="w-full h-[24px] max-h-[24px] text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer pt-0.5"
                            >
                              <Mail className="h-3.5 w-3.5" /> Contact Provider
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </section>
      {contactService && (<ContactMerchantModal itemTitle={contactService.name} serviceId={contactService._id} onClose={() => setContactService(null)}/>)}
      <Dialog open={!!selectedServiceForCart} onOpenChange={(open) => { if (!open)
        resetServiceCartForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Service Booking</DialogTitle>
          </DialogHeader>
          {selectedServiceForCart && (<div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Service</h4>
                <p className="text-sm text-muted-foreground">{selectedServiceForCart.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedServiceForCart.category}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Date</label>
                  <Input type="date" value={cartDate} onChange={e => setCartDate(e.target.value)} min={new Date().toISOString().split("T")[0]}/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Time</label>
                  <Input type="time" value={cartTime} onChange={e => setCartTime(e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Event Location / Delivery Address</label>
                <Input type="text" value={cartAddress} onChange={e => setCartAddress(e.target.value)} placeholder="e.g. 123 Main St, Bengaluru"/>
              </div>
              {selectedServiceForCart.allowGuests && (<div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Guest Count</label>
                  <Input type="number" min="1" max={selectedServiceForCart.maxGuests || 100} value={cartGuestCount} onChange={e => setCartGuestCount(Math.max(1, Math.min(Number(selectedServiceForCart.maxGuests || 100), Number(e.target.value || 1))))}/>
                  <p className="text-[10px] text-muted-foreground mt-1">Maximum {selectedServiceForCart.maxGuests || 100} guests</p>
                </div>)}
              {selectedServiceForCart.addOns?.length > 0 && (<div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-3">Optional Add-ons</p>
                  <div className="space-y-2">
                    {selectedServiceForCart.addOns.map((addon) => {
                const qty = cartAddOns[addon.name] || 0;
                if (!addon.showGuestCount) {
                    return (<div key={addon.name} onClick={() => updateCartAddOn(addon, qty > 0 ? 0 : 1)} className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${qty > 0 ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary"}`}>
                            <div>
                              <p className="text-sm font-medium">{addon.name}</p>
                              <p className="text-xs text-muted-foreground">Tap to {qty > 0 ? "remove" : "add"}</p>
                            </div>
                            <span className="text-sm font-semibold text-primary">+{formatCurrency(addon.price)}</span>
                          </div>);
                }
                return (<div key={addon.name} className={`rounded-xl border-2 px-4 py-3 transition-all ${qty > 0 ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{addon.name}</p>
                              <p className="text-xs text-primary font-semibold">{formatCurrency(addon.price)} per {addon.guestLabel || "guest"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={qty <= 0} onClick={() => updateCartAddOn(addon, qty - 1)}>
                                -
                              </Button>
                              <span className="w-8 text-center text-sm font-bold">{qty}</span>
                              <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" disabled={qty >= (addon.maxQuantity || 1)} onClick={() => updateCartAddOn(addon, qty + 1)}>
                                +
                              </Button>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-muted-foreground">Min {addon.minQuantity || 1}, max {addon.maxQuantity || 1} {addon.guestLabel || "guests"}</p>
                        </div>);
            })}
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
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Base price</span>
                  <span className="font-medium">{formatCurrency(selectedServiceForCart.price)}</span>
                </div>
                {(selectedServiceForCart.addOns || []).filter((addon) => (cartAddOns[addon.name] || 0) > 0).map((addon) => (<div key={addon.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{addon.name} x {cartAddOns[addon.name]}</span>
                    <span className="font-medium">+{formatCurrency((Number(addon.price) || 0) * (cartAddOns[addon.name] || 0))}</span>
                  </div>))}
                {getCartServiceDiscount() > 0 && (<>
                    <div className="h-px bg-primary/20 my-1"/>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(getCartServiceTotalRaw())}</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                      <span>Promo Discount</span>
                      <span>-{formatCurrency(getCartServiceDiscount())}</span>
                    </div>
                  </>)}
                <div className="border-t border-primary/20 pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-xl font-bold text-gradient">{formatCurrency(getCartServiceTotal())}</span>
                </div>
              </div>
              <Button onClick={handleAddServiceToCartDirect} className="w-full bg-gradient-primary">
                Add to Cart - {formatCurrency(getCartServiceTotal())}
              </Button>
            </div>)}
        </DialogContent>
      </Dialog>
    </CustomerLayout>);
};
export default CustomerBrowseServices;
