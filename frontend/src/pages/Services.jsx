import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, X, Loader2, Briefcase, CheckCircle2, Star, Users, Zap, Search, Image as ImageIcon, ChevronLeft, ChevronRight, MapPin, Navigation, Tag, Copy, Mail, Eye, CalendarCheck, Sparkle } from "lucide-react";
import { useGsapStagger, useGsapCardHover } from "@/lib/gsapAnimations";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATIC_IMAGES } from "@/lib/staticImages";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListServices, apiListCategories, apiValidatePromoCode, apiGetAllPromoCodes } from "@/lib/api";
import { API_URL } from "@/lib/config";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import LocationPicker from "@/components/LocationPicker";
import ManageCategoriesModal from "@/components/ManageCategoriesModal";
import SimplePayment from "@/components/SimplePayment";
import { savePendingServiceBooking, getPendingServiceBooking, clearPendingServiceBooking } from "@/lib/bookingState";
import ContactMerchantModal from "@/components/ContactMerchantModal";
const PENDING_CONTACT_SVC_KEY = "pendingContactService";
const WHY_US = [
    { icon: Star, title: "Premium Quality", desc: "Every vendor and service is curated to meet the highest standards of quality and professionalism." },
    { icon: Users, title: "Dedicated Support", desc: "A personal event coordinator is assigned to guide you from first enquiry to final execution." },
    { icon: CheckCircle2, title: "Transparent Pricing", desc: "No hidden fees. Every service listing shows a clear starting price so you can plan with confidence." },
    { icon: Zap, title: "Fast Turnaround", desc: "Submit your request and receive a confirmed response from our team within 24 hours." },
];
const PROCESS = [
    { step: "01", title: "Browse & Select", desc: "Explore our full range of services and click 'Book Now' on what fits your vision." },
    { step: "02", title: "Pick Date & Time", desc: "Choose your preferred event date and time in the booking modal." },
    { step: "03", title: "Confirmation", desc: "Our team reviews your request and sends a confirmation within 24 hours." },
    { step: "04", title: "Event Day", desc: "Relax and enjoy — our professionals handle every detail on the day." },
];
import { useHomepageSettings } from "@/hooks/useHomepageSettings";

const normalizeCategory = (value) =>
  String(typeof value === "object" ? value?.name || "" : value || "")
    .trim()
    .toLowerCase();

const formatCategoryLabel = (cat) => {
  const norm = normalizeCategory(cat);
  if (!norm || norm === "all") return "All";
  return norm
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const HIGHLIGHT_TINTS = [
    "bg-tint-orange text-tint-orange-fg",
    "bg-tint-pink text-tint-pink-fg",
    "bg-tint-violet text-tint-violet-fg",
    "bg-tint-blue text-tint-blue-fg",
];
const ServiceGridCard = ({ svc, imgSrc, navigate, openBook, handleContactService }) => {
    const hoverRef = useGsapCardHover({ lift: -8, scale: 1.015 });
    return (
        <div 
            ref={hoverRef} 
            onClick={() => navigate(`/services/${svc._id}`)} 
            className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-card will-change-transform w-full h-full cursor-pointer"
        >
            <div className="relative overflow-hidden bg-secondary shrink-0 w-full h-48 sm:h-52">
                {imgSrc(svc.image) ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full w-full items-center justify-center bg-gradient-mesh text-primary/30">
                    <Briefcase className="h-10 w-10 opacity-30"/>
                  </div>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/>
                <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-glow">
                    From {formatCurrency(svc.price)}
                </span>
            </div>
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0 justify-between">
                <div>
                    <h3 className="font-display text-base sm:text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{svc.name}</h3>

                    {svc.averageRating && svc.averageRating > 0 ? (<div className="flex items-center gap-1 mt-2">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0"/>
                        <span className="text-xs font-semibold">{svc.averageRating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({svc.ratingCount || 0})</span>
                      </div>) : null}

                    {svc.highlights?.length > 0 && (<ul className="mt-3 space-y-1.5 flex-1">
                        {svc.highlights.slice(0, 2).map((h, hi) => (<li key={h} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${HIGHLIGHT_TINTS[hi % HIGHLIGHT_TINTS.length]}`}>
                                <Sparkle className="h-3 w-3"/>
                            </span>
                            <span className="line-clamp-1">{h}</span>
                          </li>))}
                      </ul>)}
                </div>

                <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                        <Button className="min-h-[40px] rounded-xl text-xs font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-1.5" onClick={(e) => { e.stopPropagation(); openBook(svc); }}>
                            <CalendarCheck className="h-4 w-4"/> Book Now
                        </Button>
                    </div>
                    {svc.createdBy && (<button onClick={(e) => { e.stopPropagation(); handleContactService(svc); }} className="w-full min-h-[34px] rounded-xl text-xs font-medium border border-border/80 hover:bg-secondary transition-all text-muted-foreground flex items-center justify-center gap-1.5">
                        <Mail className="h-3.5 w-3.5"/> Contact Organiser
                      </button>)}
                </div>
            </div>
        </div>
    );
};

const Services = () => {
    const settings = useHomepageSettings();
    const { isLoggedIn, role, token } = useAuth();
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeCategory, setActiveCategory] = useState(
      normalizeCategory(searchParams.get("category")) || "all"
    );
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [selectedAddOns, setSelectedAddOns] = useState([]);
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerLocation, setCustomerLocation] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [dbCategories, setDbCategories] = useState([]);
    const [showCatModal, setShowCatModal] = useState(false);
    // favorites: map of serviceId -> favoriteId
    const [favMap, setFavMap] = useState({});
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    // contact organiser
    const [contactService, setContactService] = useState(null);
    // Auto-open contact modal after login redirect
    useEffect(() => {
        if (!isLoggedIn || services.length === 0)
            return;
        try {
            const pendingId = localStorage.getItem(PENDING_CONTACT_SVC_KEY);
            if (pendingId) {
                const svc = services.find((s) => s._id === pendingId);
                if (svc) {
                    localStorage.removeItem(PENDING_CONTACT_SVC_KEY);
                    setContactService(svc);
                }
            }
        }
        catch { }
    }, [isLoggedIn, services]);
    useEffect(() => {
        apiListServices()
            .then((res) => setServices((res.services || []).filter((s) => s.active !== false)))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);
    const loadCategories = async () => {
        try {
            const res = await apiListCategories("service");
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
    // Sync state with URL parameter if it changes externally
    useEffect(() => {
        const urlCategory = searchParams.get("category");
        const normUrlCategory = normalizeCategory(urlCategory) || "all";
        if (normUrlCategory !== normalizeCategory(activeCategory)) {
            setActiveCategory(normUrlCategory);
        }
    }, [searchParams]);
    // Sync URL parameter if state changes internally
    const handleCategoryChange = (catValue) => {
        const normCat = normalizeCategory(catValue);
        setActiveCategory(normCat);
        if (!normCat || normCat === "all") {
            setSearchParams({});
        }
        else {
            setSearchParams({ category: normCat });
        }
    };
    // Extract unique normalized categories with display labels
    const categories = useMemo(() => {
        const categoryMap = new Map();
        categoryMap.set("all", "All");

        dbCategories.forEach((c) => {
            const raw = typeof c === "string" ? c : c?.name;
            const norm = normalizeCategory(raw);
            if (norm && norm !== "all" && !categoryMap.has(norm)) {
                categoryMap.set(norm, formatCategoryLabel(raw));
            }
        });

        services.forEach((s) => {
            const raw = s.category || "General";
            const norm = normalizeCategory(raw);
            if (norm && norm !== "all" && !categoryMap.has(norm)) {
                categoryMap.set(norm, formatCategoryLabel(raw));
            }
        });

        return Array.from(categoryMap.entries()).map(([value, label]) => ({
            value,
            label,
        }));
    }, [dbCategories, services]);

    // Filter services based on search and normalized category
    const filteredServices = useMemo(() => {
        return services.filter((service) => {
            const term = search.trim().toLowerCase();
            const matchesSearch =
                !term ||
                service.name?.toLowerCase().includes(term) ||
                (service.description && service.description.toLowerCase().includes(term));

            const serviceCat = normalizeCategory(service.category || "General");
            const activeCat = normalizeCategory(activeCategory);
            const matchesCategory = !activeCat || activeCat === "all" || serviceCat === activeCat;

            return matchesSearch && matchesCategory;
        });
    }, [services, search, activeCategory]);

    const servicesPageGridRef = useGsapStagger([filteredServices.length], { scrollTrigger: true, y: 24 });
    const openBook = (svc) => {
        const dashboardUrl = `/customer-dashboard/services/${svc._id}`;
        if (!isLoggedIn || !token) {
            // Save the specific service ID and state to redirect after login
            savePendingServiceBooking({
                serviceId: svc._id,
                serviceName: svc.name,
                servicePrice: svc.price,
                date: "",
                time: "",
                selectedAddOns: {},
                customerAddress: "",
                customerLocation: null,
                promoCode: "",
                returnTo: dashboardUrl,
            });
            localStorage.setItem("authReturnTo", dashboardUrl);
            sessionStorage.setItem("postLoginRedirect", dashboardUrl);
            toast.error("Please sign in to book this service");
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
            setSelectedService(svc);
            setDate("");
            setTime("");
            setSelectedAddOns([]);
            setCustomerAddress("");
            setCustomerLocation(null);
            setShowLocationPicker(false);
            setPromoCode("");
            setAppliedPromo(null);
            setPromoError("");
            setShowServiceModal(true);
        }
    };
    const handleContactService = (svc) => {
        if (!isLoggedIn) {
            localStorage.setItem(PENDING_CONTACT_SVC_KEY, svc._id);
            localStorage.setItem("authReturnTo", "/services");
            navigate(`/login?redirect=${encodeURIComponent("/services")}`);
            return;
        }
        setContactService(svc);
    };
    // Restore pending booking after login redirect
    useEffect(() => {
        if (!isLoggedIn || !token || services.length === 0)
            return;
        const pending = getPendingServiceBooking();
        if (!pending)
            return;
        const svc = services.find((s) => s._id === pending.serviceId);
        if (!svc) {
            clearPendingServiceBooking();
            return;
        }
        clearPendingServiceBooking();
        setSelectedService(svc);
        setDate(pending.date || "");
        setTime(pending.time || "");
        setSelectedAddOns(Array.isArray(pending.selectedAddOns)
            ? pending.selectedAddOns
            : Object.keys(pending.selectedAddOns || {}));
        setCustomerAddress(pending.customerAddress || "");
        setCustomerLocation(pending.customerLocation || null);
        setPromoCode(pending.promoCode || "");
        // Re-apply promo code if present
        if (pending.promoCode) {
            applyPromoByCode(pending.promoCode);
        }
        setShowServiceModal(true);
    }, [isLoggedIn, token, services]);
    const applyPromoByCode = async (code) => {
        if (!code?.trim())
            return;
        try {
            setPromoCode(code);
            setPromoError("");
            const data = await apiValidatePromoCode(code.toUpperCase(), selectedService?.price || 0, undefined, selectedService?._id, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const proceedToPayment = () => {
        if (!date || !time) {
            toast.error("Please select date and time");
            return;
        }
        if (!customerLocation || !customerAddress) {
            toast.error("Please provide your location details");
            return;
        }
        setShowServiceModal(false);
        setShowPaymentModal(true);
    };
    const applyPromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        try {
            setPromoError("");
            const data = await apiValidatePromoCode(promoCode.toUpperCase(), selectedService?.price || 0, undefined, selectedService?._id, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const removePromoCode = () => { setAppliedPromo(null); setPromoCode(""); setPromoError(""); };
    const getFinalPrice = () => {
        if (!selectedService)
            return 0;
        const addOnTotal = (selectedService.addOns || [])
            .filter((a) => selectedAddOns.includes(a.name))
            .reduce((sum, a) => sum + Number(a.price), 0);
        const base = selectedService.price + addOnTotal;
        if (!appliedPromo)
            return base;
        let discount = 0;
        if (appliedPromo.discountType === "percentage") {
            discount = (base * appliedPromo.discountValue) / 100;
            if (appliedPromo.maxDiscount)
                discount = Math.min(discount, appliedPromo.maxDiscount);
        }
        else {
            discount = appliedPromo.discountValue;
        }
        return Math.max(0, base - discount);
    };
    const handlePaymentSuccess = (booking) => {
        setShowPaymentModal(false);
        setShowServiceModal(false);
        clearPendingServiceBooking();
        toast.success("Payment successful! Your booking is being reviewed.");
        navigate("/customer-dashboard/bookings");
    };
    const handlePaymentError = (_error) => {
        // Keep payment modal open so user can retry
    };
    const imgSrc = (image) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";
    return (<Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <img src={settings.servicesImage || STATIC_IMAGES.servicesHero} alt="Our Services" className="h-[50vh] min-h-[320px] w-full object-cover sm:h-[55vh] md:h-[60vh] lg:h-[65vh]" loading="eager"/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"/>
        <div className="absolute inset-0 flex items-center pt-20">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Our Services</p>
              <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Full-service planning for <span className="text-primary">every</span> kind of event
              </h1>
              <p className="mt-5 text-lg text-white/75">
                From intimate gatherings to large productions, we manage the details that turn complex logistics into seamless, unforgettable experiences.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact">
                  <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                    Contact Us <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline">Browse Events</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <section className="border-y border-border bg-secondary/30 py-10">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
            { value: "18+", label: "Service Categories" },
            { value: "340+", label: "Trusted Merchants" },
            { value: "50K+", label: "Happy Clients" },
            { value: "98%", label: "Satisfaction Rate" },
        ].map((s, i) => (<motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="font-display text-xl sm:text-4xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </motion.div>))}
          </div>
        </div>
      </section>

      {/* ── Service Cards ─────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">What We Offer</p>
            <h2 className="font-display mt-3 text-4xl font-bold">
              Services built for <span className="text-primary">every occasion</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Click "Book Now" on any service to get started</p>
          </motion.div>

          {/* Search & Filter */}
          <div className="mt-8 space-y-4">
            {/* Search Bar - Extra Large */}
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"/>
              <Input placeholder="Search services by name or description..." value={search} maxLength={30} onChange={(e) => setSearch(e.target.value)} className="pl-14 pr-4 py-7 h-14 bg-card border-border text-lg rounded-xl focus:ring-2 focus:ring-primary shadow-md"/>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-3">
              {role === "admin" && (<Button variant="outline" size="sm" onClick={() => setShowCatModal(true)} className="gap-1 rounded-md">
                  Manage Categories
                </Button>)}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = (normalizeCategory(activeCategory) || "all") === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-primary text-primary-foreground shadow-md scale-105"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {loading ? (<div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin"/> Loading services…
            </div>) : filteredServices.length === 0 ? (<div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Briefcase className="h-12 w-12 opacity-30"/>
              <p className="font-medium">No services available right now.</p>
              <p className="text-sm">Check back soon or contact us directly.</p>
            </div>) : (<div ref={servicesPageGridRef} className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredServices.map((svc) => (<ServiceGridCard key={svc._id} svc={svc} imgSrc={imgSrc} navigate={navigate} openBook={openBook} handleContactService={handleContactService}/>))}
            </div>)}
        </div>
      </section>


      {/* ── Why Choose Us + Second Image ─────────────── */}
      <section className="bg-secondary/20 py-20">
        <div className="container mx-auto">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* Second image */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
              <div className="overflow-hidden rounded-3xl shadow-2xl">
                <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80" alt="Our team planning an event" className="h-[460px] w-full object-cover"/>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent"/>
              </div>
              <div className="absolute -bottom-5 -right-5 rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="font-display text-xl sm:text-3xl font-bold text-primary">50K+</div>
                <div className="text-xs text-muted-foreground">Satisfied clients</div>
              </div>
            </motion.div>

            {/* Why us content */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">Why Choose Us</p>
              <h2 className="font-display mt-3 text-4xl font-bold leading-tight">
                Everything you need, <span className="text-primary">all in one place</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                EventFlow brings together the best event professionals under one platform. Whether you need a full wedding package or just a caterer for a corporate lunch, we make the booking process effortless and transparent.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2">
                {WHY_US.map((item) => (<div key={item.title} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary"/>
                    </div>
                    <div className="font-semibold text-sm text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                  </div>))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────── */}
      <section className="container mx-auto py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">How It Works</p>
          <h2 className="font-display mt-3 text-4xl font-bold">Book a service in 4 simple steps</h2>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((item, i) => (<motion.div key={item.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-display text-5xl font-bold text-primary/15">{item.step}</div>
              <h3 className="font-display mt-2 text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="container mx-auto pb-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl bg-gradient-to-br from-primary/20 via-secondary to-background border border-primary/20 p-12 text-center">
          <h2 className="font-display text-xl sm:text-4xl font-bold">Ready to start planning?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Let our team help you find the perfect service package for your next event. Get in touch or explore upcoming events now.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                Get in Touch <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline">Browse Events</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Service Booking Modal ─────────────────────────────── */}
      {showServiceModal && selectedService && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={() => setShowServiceModal(false)}>
              <X className="h-5 w-5"/>
            </button>
            <h3 className="font-display text-xl font-bold">Book — {selectedService.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Starting price: <span className="font-semibold text-foreground">{formatCurrency(selectedService.price)}</span></p>

            <div className="mt-5 grid gap-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Select Date</label>
                  <input type="date" min={new Date().toISOString().split("T")[0]} className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={date} onChange={(e) => setDate(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Select Time</label>
                  <input type="time" className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={time} onChange={(e) => setTime(e.target.value)}/>
                </div>
              </div>

              {/* Add-ons */}
              {selectedService.addOns?.length > 0 && (<div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-2">Optional Add-ons</p>
                  <div className="space-y-2">
                    {selectedService.addOns.map((addon) => (<label key={addon.name} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selectedAddOns.includes(addon.name)
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-secondary"}`}>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedAddOns.includes(addon.name)} onChange={() => setSelectedAddOns(prev => prev.includes(addon.name)
                        ? prev.filter(n => n !== addon.name)
                        : [...prev, addon.name])} className="accent-primary h-4 w-4"/>
                          <span className="text-sm font-medium text-foreground">{addon.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">+{formatCurrency(addon.price)}</span>
                      </label>))}
                  </div>
                  {selectedAddOns.length > 0 && (<p className="mt-2 text-xs text-muted-foreground">
                      Add-ons total: <span className="font-semibold text-foreground">
                        +{formatCurrency((selectedService.addOns || []).filter((a) => selectedAddOns.includes(a.name)).reduce((s, a) => s + Number(a.price), 0))}
                      </span>
                    </p>)}
                </div>)}

              {/* Location Section */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary"/>
                    <h4 className="font-semibold text-sm">Service Location</h4>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10 gap-1.5" onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(async (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setCustomerLocation({ lat, lng });
                        try {
                          const { reverseGeocode } = await import("@/lib/geocoding");
                          const geo = await reverseGeocode(lat, lng);
                          setCustomerAddress(geo?.fullAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                        } catch {
                          setCustomerAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                        }
                        toast.success("Location detected!");
                      }, () => {
                        toast.error("Unable to get your location");
                      });
                    } else {
                      toast.error("Geolocation is not supported by your browser");
                    }
                  }}>
                    <Navigation className="h-3 w-3"/>
                    Use Current Location
                  </Button>
                </div>

                <LocationAutocomplete
                  value={customerAddress}
                  onChange={(val) => setCustomerAddress(val)}
                  onSelect={(payload) => {
                    if (payload) {
                      setCustomerAddress(payload.address);
                      setCustomerLocation({ lat: payload.lat, lng: payload.lng });
                    } else {
                      setCustomerLocation(null);
                    }
                  }}
                  coordinates={customerLocation}
                  showMapButton={true}
                  placeholder="Enter service venue, city, or full address"
                  maxLength={150}
                />
              </div>

              {/* Promo Code */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-amber-600"/>
                  <p className="text-sm font-semibold text-amber-600">Apply Promo Code</p>
                </div>
                {appliedPromo ? (<div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-500/20 p-2 rounded border border-green-500/30">
                      <code className="font-mono font-bold text-green-600 text-sm">{appliedPromo.code}</code>
                      <button onClick={removePromoCode} className="text-green-600 hover:text-green-700">
                        <X className="h-4 w-4"/>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You save: {formatCurrency((selectedService.price + (selectedService.addOns || []).filter((a) => selectedAddOns.includes(a.name)).reduce((s, a) => s + Number(a.price), 0)) - getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })} — Total: <span className="font-semibold text-foreground">{formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </p>
                  </div>) : (<div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Enter promo code" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }} className="text-sm h-9"/>
                      <Button onClick={applyPromoCode} size="sm" variant="outline" className="h-9 px-4">Apply</Button>
                    </div>
                    {promoError && <p className="text-xs text-red-500">{promoError}</p>}
                  </div>)}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                <Button className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={!date || !time || !customerLocation || !customerAddress} onClick={proceedToPayment}>
                  Proceed to Payment — {formatCurrency(getFinalPrice(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowServiceModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ── Payment Modal ─────────────────────────────── */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => {
            setShowPaymentModal(open);
            if (!open) {
                // If payment modal is closed, show service modal again
                setShowServiceModal(true);
            }
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment & Booking Details</DialogTitle>
          </DialogHeader>
          {selectedService && date && time && customerLocation && (<SimplePayment amount={getFinalPrice()} bookingData={{
                serviceName: selectedService.name,
                serviceId: selectedService._id,
                date: date,
                time: time,
                addOns: selectedAddOns.length > 0
                    ? (selectedService.addOns || []).filter((a) => selectedAddOns.includes(a.name)).map((a) => ({ name: a.name, price: Number(a.price) }))
                    : undefined,
                customerLocation: {
                    address: customerAddress,
                    latitude: customerLocation.lat,
                    longitude: customerLocation.lng
                },
                promoCode: appliedPromo,
                originalAmount: selectedService.price,
                discount: (selectedService.price + (selectedService.addOns || []).filter((a) => selectedAddOns.includes(a.name)).reduce((s, a) => s + Number(a.price), 0)) - getFinalPrice()
            }} onSuccess={handlePaymentSuccess} onError={handlePaymentError} onClose={() => {
                setShowPaymentModal(false);
                setShowServiceModal(true);
            }}/>)}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      {selectedImageIndex !== null && selectedService && selectedService.gallery && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setSelectedImageIndex(null)}>
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
            {selectedImageIndex < selectedService.gallery.length - 1 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="h-8 w-8"/>
              </button>)}

            {/* Image */}
            <motion.img key={selectedImageIndex} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} src={imgSrc(selectedService.gallery[selectedImageIndex])} alt={`Gallery ${selectedImageIndex + 1}`} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"/>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm z-[60]">
              {selectedImageIndex + 1} / {selectedService.gallery.length}
            </div>
          </div>
        </motion.div>)}

      {/* View Details Modal */}
      {showDetailsModal && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDetailsModal(null)}>
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10" onClick={() => setShowDetailsModal(null)}>
              <X className="h-6 w-6"/>
            </button>

            {/* Main Image */}
            {imgSrc(showDetailsModal.image) && (<div className="relative h-64 sm:h-80 overflow-hidden rounded-t-2xl">
                <img src={imgSrc(showDetailsModal.image)} alt={showDetailsModal.name} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                <span className="absolute bottom-4 left-4 rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg">
                  From {formatCurrency(showDetailsModal.price)}
                </span>
              </div>)}

            <div className="p-6">
              <h3 className="font-display text-lg sm:text-2xl font-bold text-foreground mb-4">
                {showDetailsModal.name}
              </h3>

              {/* Category & Price */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                {showDetailsModal.category && (<span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {showDetailsModal.category}
                  </span>)}
                <span className="text-2xl font-bold text-primary">{formatCurrency(showDetailsModal.price)}</span>
              </div>

              {/* Description */}
              {showDetailsModal.description && (<div className="mb-6">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    Description
                  </h4>
                  <p className="text-foreground leading-relaxed">
                    {showDetailsModal.description}
                  </p>
                </div>)}

              {/* Highlights */}
              {showDetailsModal.highlights?.length > 0 && (<div className="mb-6">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Highlights
                  </h4>
                  <ul className="space-y-2">
                    {showDetailsModal.highlights.map((h, idx) => (<li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5"/>
                        <span className="text-foreground">{h}</span>
                      </li>))}
                  </ul>
                </div>)}

              {/* Gallery */}
              {showDetailsModal.gallery && showDetailsModal.gallery.length > 0 && (<div className="mb-6">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Gallery
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {showDetailsModal.gallery.map((img, idx) => (<div key={idx} className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group/thumb" onClick={() => {
                        setSelectedService(showDetailsModal);
                        setSelectedImageIndex(idx);
                        setShowDetailsModal(null);
                    }}>
                        <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"/>
                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all"/>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5">
                            <ImageIcon className="h-4 w-4 text-primary"/>
                          </div>
                        </div>
                      </div>))}
                  </div>
                </div>)}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => {
                openBook(showDetailsModal);
                setShowDetailsModal(null);
            }}>
                  Book Now
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowDetailsModal(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </motion.div>)}

      {showCatModal && (<ManageCategoriesModal type="service" onClose={() => setShowCatModal(false)} onCategoriesChanged={loadCategories}/>)}

      {contactService && (<ContactMerchantModal itemTitle={contactService.name} serviceId={contactService._id} merchantId={contactService.createdBy?._id || contactService.createdBy} onClose={() => setContactService(null)}/>)}
    </Layout>);
};
export default Services;
