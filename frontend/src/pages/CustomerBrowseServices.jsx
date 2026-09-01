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
        const catMap = new Map();
        catMap.set("all", "All");
        services.forEach((s) => {
            const raw = typeof s?.category === "object" ? s?.category?.name || "General" : (s?.category || "General");
            const norm = String(raw || "General").trim().toLowerCase();
            if (norm && norm !== "all" && !catMap.has(norm)) {
                const label = norm
                    .split(/\s+/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                catMap.set(norm, label);
            }
        });
        return Array.from(catMap.entries()).map(([value, label]) => ({ value, label }));
    }, [services]);
    const activeFilterCount = [
        selectedCategory && selectedCategory.toLowerCase() !== "all",
        sortBy !== "default",
        !!priceMin,
        !!priceMax,
    ].filter(Boolean).length;
    const clearFilters = () => {
        setSelectedCategory("all");
        setSortBy("default");
        setPriceMin("");
        setPriceMax("");
    };
    const filtered = useMemo(() => {
        let list = services.filter(s => {
            const q = (search || "").toLowerCase();
            const sName = typeof s?.name === "object" ? s?.name?.name || "" : String(s?.name || "");
            const sCat = typeof s?.category === "object" ? s?.category?.name || "general" : String(s?.category || "general");
            const sDesc = typeof s?.description === "object" ? "" : String(s?.description || "");
            const matchSearch = !q ||
                sName.toLowerCase().includes(q) ||
                sCat.toLowerCase().includes(q) ||
                sDesc.toLowerCase().includes(q);
            const selCat = (selectedCategory || "all").trim().toLowerCase();
            const svcCat = sCat.trim().toLowerCase();
            const matchCat = selCat === "all" || svcCat === selCat;
            const price = Number(s?.price) || 0;
            const matchMin = !priceMin || price >= Number(priceMin);
            const matchMax = !priceMax || price <= Number(priceMax);
            return matchSearch && matchCat && matchMin && matchMax;
        });
        switch (sortBy) {
            case "price-asc":
                list = [...list].sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
                break;
            case "price-desc":
                list = [...list].sort((a, b) => (Number(b?.price) || 0) - (Number(a?.price) || 0));
                break;
            case "name-asc":
                list = [...list].sort((a, b) => {
                    const nameA = typeof a?.name === "object" ? a?.name?.name || "" : String(a?.name || "");
                    const nameB = typeof b?.name === "object" ? b?.name?.name || "" : String(b?.name || "");
                    return nameA.localeCompare(nameB);
                });
                break;
            case "name-desc":
                list = [...list].sort((a, b) => {
                    const nameA = typeof a?.name === "object" ? a?.name?.name || "" : String(a?.name || "");
                    const nameB = typeof b?.name === "object" ? b?.name?.name || "" : String(b?.name || "");
                    return nameB.localeCompare(nameA);
                });
                break;
        }
        return list;
    }, [services, search, selectedCategory, sortBy, priceMin, priceMax]);
    const imgSrc = (image) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";
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
                              key={cat.value}
                              onClick={() => setSelectedCategory(cat.value)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                (selectedCategory || "all").toLowerCase() === cat.value
                                  ? "bg-gradient-primary text-white font-bold shadow-sm"
                                  : "bg-secondary text-foreground hover:bg-secondary/70"
                              }`}
                            >
                              {cat.label}
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
                            className="w-full h-[46px] rounded-xl text-xs font-semibold bg-gradient-primary text-white hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToDetail(svc);
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
    </CustomerLayout>);
};
export default CustomerBrowseServices;
