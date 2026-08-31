import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, TrendingUp, Users, X, Briefcase, Loader2, Video, ChevronLeft, ChevronRight, Ticket, Copy, Star, Quote, ShieldCheck, Clock3, Eye, CalendarCheck, Sparkle, CheckCircle2 } from "lucide-react";
import { useGsapStagger, useGsapParallax, useGsapScrollReveal, useGsapCardHover, useGsapTimeline } from "@/lib/gsapAnimations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListServices, apiListEvents, apiListCategories, apiGetAllPromoCodes, apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";
import EventCard from "@/components/EventCard";
import SimplePayment from "@/components/SimplePayment";
import { savePendingServiceBooking, savePendingEventBooking } from "@/lib/bookingState";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
const PROMO_TINTS = [
    { chip: "bg-tint-orange text-tint-orange-fg", accent: "text-tint-orange-fg", border: "border-tint-orange" },
    { chip: "bg-tint-pink text-tint-pink-fg", accent: "text-tint-pink-fg", border: "border-tint-pink" },
    { chip: "bg-tint-violet text-tint-violet-fg", accent: "text-tint-violet-fg", border: "border-tint-violet" },
];

const PromoCard = ({ promo, index, formatCurrency }) => {
    const hoverRef = useGsapCardHover({ lift: -6, scale: 1.02 });
    const [copied, setCopied] = useState(false);
    const tint = PROMO_TINTS[index % PROMO_TINTS.length];
    const handleCopy = () => {
        navigator.clipboard.writeText(promo.code);
        toast.success("Code copied!");
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };
    return (
        <div ref={hoverRef} className={`relative rounded-2xl border-2 ${tint.border} bg-card p-4 sm:p-5 shadow-card will-change-transform overflow-hidden`}>
            {/* Ticket notches */}
            <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background"/>
            <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background"/>

            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`tint-chip h-9 w-9 shrink-0 ${tint.chip}`}><Ticket className="h-4 w-4"/></span>
                    <code className="font-mono font-bold text-sm sm:text-base text-foreground truncate">{promo.code}</code>
                </div>
                <button onClick={handleCopy} className={`shrink-0 rounded-lg p-2 transition-all ${copied ? "bg-success/15 text-success" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} title="Copy code">
                    {copied ? <CheckCircle2 className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}
                </button>
            </div>

            {promo.description && (<p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{promo.description}</p>)}

            {promo.minBookingAmount > 0 && (<span className={`mt-2 inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 ${tint.chip}`}>
                Min spend {formatCurrency(promo.minBookingAmount)}
              </span>)}

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3">
                <span className={`font-display text-lg sm:text-xl font-extrabold ${tint.accent}`}>
                    {promo.discountType === "percentage" ? `${promo.discountValue}% OFF` : `${formatCurrency(promo.discountValue)} OFF`}
                </span>
                <div className="flex flex-col items-end gap-0.5">
                    {promo.merchant?.name && (<span className="text-[10px] text-muted-foreground truncate max-w-[7rem]">{promo.merchant.name}</span>)}
                    <span className="text-[10px] text-muted-foreground">
                        {promo.maxUses ? `${promo.currentUses}/${promo.maxUses} used` : "Unlimited"}
                    </span>
                </div>
            </div>
        </div>
    );
};

const HIGHLIGHT_TINTS = [
    "bg-tint-orange text-tint-orange-fg",
    "bg-tint-pink text-tint-pink-fg",
    "bg-tint-violet text-tint-violet-fg",
    "bg-tint-blue text-tint-blue-fg",
];

const ServiceCard = ({ svc, imgSrc, navigate, openBook }) => {
    const hoverRef = useGsapCardHover({ lift: -8, scale: 1.015 });
    return (
        <div 
            ref={hoverRef} 
            onClick={() => navigate(`/services/${svc._id}`)} 
            className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-card will-change-transform cursor-pointer"
        >
            {/* Image */}
            <div className="relative overflow-hidden bg-secondary flex-shrink-0 h-[175px] w-full">
                {imgSrc(svc.image) ? (<img src={imgSrc(svc.image)} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                    <Briefcase className="h-12 w-12 opacity-30"/>
                  </div>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/>
                <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-glow">
                    From {formatCurrency(svc.price)}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0 justify-between">
                <div>
                    {svc.createdBy && (<div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary"/>
                        {svc.createdBy.name}
                      </div>)}

                    <h3 className="font-display text-sm sm:text-lg font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors min-h-[2.5rem] sm:min-h-[3.25rem]">
                        {svc.name}
                    </h3>

                    {/* Highlights */}
                    {svc.highlights?.length > 0 && (<ul className="mt-3 space-y-1.5 flex-1">
                        {svc.highlights.slice(0, 2).map((h, hi) => (<li key={hi} className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${HIGHLIGHT_TINTS[hi % HIGHLIGHT_TINTS.length]}`}>
                              <Sparkle className="h-3 w-3"/>
                            </span>
                            <span className="line-clamp-1">{h}</span>
                          </li>))}
                      </ul>)}
                </div>

                {/* Buttons */}
                <div className="mt-4">
                    <Button 
                        className="w-full min-h-[40px] sm:min-h-[44px] rounded-xl text-[11px] sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-1.5" 
                        onClick={(e) => {
                            e.stopPropagation();
                            openBook(svc);
                        }}
                    >
                        <CalendarCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4"/> Book Now
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AutomaticReviewCarousel = ({ reviews }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!reviews || reviews.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % reviews.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [reviews, isHovered]);

    if (!reviews || reviews.length === 0) return null;

    const currentReview = reviews[currentIndex];

    return (
        <div 
            className="relative max-w-4xl mx-auto px-4 sm:px-12"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentReview._id || currentIndex}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-card flex flex-col md:flex-row items-center gap-6"
                >
                    <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        {/* Rating + Tag */}
                        <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`h-5 w-5 ${s <= (currentReview.score || 5) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
                                ))}
                            </div>
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${currentReview.type === "event" ? "bg-primary/10 text-primary border border-primary/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"}`}>
                                {currentReview.type === "event" ? "🎫 Event Review" : "🛠️ Service Review"}
                            </span>
                        </div>

                        {/* Comment */}
                        <div className="relative">
                            <Quote className="absolute -top-3 -left-3 h-8 w-8 text-primary/15 hidden md:block" />
                            <p className="text-base sm:text-xl font-medium text-foreground leading-relaxed italic md:pl-6">
                                "{currentReview.comment || "An absolute pleasure! Booking was seamless, and the service exceeded expectations."}"
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-center md:justify-start gap-3 pt-4 border-t border-border/60">
                            <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0">
                                {currentReview.customerName?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="text-left">
                                <h4 className="font-display text-base font-bold text-foreground">{currentReview.customerName || "Verified Guest"}</h4>
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">{currentReview.title || "Verified Booking"}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button 
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg text-foreground hover:bg-secondary transition-all hover:scale-110 z-10"
                aria-label="Previous Review"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
                onClick={() => setCurrentIndex((prev) => (prev + 1) % reviews.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg text-foreground hover:bg-secondary transition-all hover:scale-110 z-10"
                aria-label="Next Review"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            {/* Indicator Dots */}
            <div className="flex justify-center items-center gap-2 mt-6">
                {reviews.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-8 bg-gradient-primary shadow-sm" : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

const Index = () => {
    const { isLoggedIn, token } = useAuth();
    const navigate = useNavigate();
    const settings = useHomepageSettings();
    const heroParallaxRef = useGsapParallax(0.18);
    // Choreographed hero entrance — one GSAP timeline, sequenced with labels/position params
    const heroBadgeRef = useRef(null);
    const heroHeadingRef = useRef(null);
    const heroSubtitleRef = useRef(null);
    const heroChipsRef = useRef(null);
    const heroButtonsRef = useRef(null);
    const heroImageWrapRef = useRef(null);
    const heroRefs = { badge: heroBadgeRef, heading: heroHeadingRef, subtitle: heroSubtitleRef, chips: heroChipsRef, buttons: heroButtonsRef, image: heroImageWrapRef };
    const heroScopeRef = useGsapTimeline((tl, refs) => {
        tl.addLabel("start")
            .from(refs.badge.current, { opacity: 0, scale: 0.9, duration: 0.4 }, "start")
            .from(refs.heading.current, { opacity: 0, y: 28, duration: 0.6 }, "start+=0.1")
            .from(refs.subtitle.current, { opacity: 0, y: 16 }, "-=0.35")
            .from(refs.chips.current?.children || [], { opacity: 0, y: 16, stagger: 0.08 }, "-=0.3")
            .from(refs.buttons.current, { opacity: 0, y: 16 }, "-=0.25")
            .from(refs.image.current, { opacity: 0, scale: 0.95, duration: 0.7 }, "start+=0.15");
    }, heroRefs, []);
    const liveHeaderRef = useGsapScrollReveal({ y: 24 });
    const promoHeaderRef = useGsapScrollReveal({ y: 24 });
    const featuredHeaderRef = useGsapScrollReveal({ y: 24 });
    const servicesHeaderRef = useGsapScrollReveal({ y: 24 });
    const [services, setServices] = useState([]);
    const [svcLoading, setSvcLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [liveEvents, setLiveEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [selectedEventForGallery, setSelectedEventForGallery] = useState(null);
    const [activeCategory, setActiveCategory] = useState("All");
    const [reviews, setReviews] = useState([]);
    const [dbCategories, setDbCategories] = useState([]);
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    const [showAllPromos, setShowAllPromos] = useState(false);
    const [showAllServices, setShowAllServices] = useState(false);
    const [showAllEvents, setShowAllEvents] = useState(false);
    const liveGridRef = useGsapStagger([liveEvents.length], { scrollTrigger: true, y: 24 });
    const featuredGridRef = useGsapStagger([liveEvents.length], { scrollTrigger: true, y: 24 });
    const filteredServicesForGrid = services.filter((s) => activeCategory === "All" || (s.category || "General") === activeCategory);
    const servicesGridRef = useGsapStagger([filteredServicesForGrid.length], { scrollTrigger: true, y: 24 });
    const promoGridRef = useGsapStagger([promoCodes.length, showAllPromos], { scrollTrigger: true, y: 20, stagger: 0.08 });
    useEffect(() => {
        apiListCategories("service").then(res => setDbCategories(res.categories || [])).catch(() => { });
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
        // Poll for promo code updates
        const pollInterval = setInterval(loadPromoCodes, 10000);
        return () => clearInterval(pollInterval);
    }, []);
    const categories = ["All", ...Array.from(new Set([
            ...dbCategories.map(c => c.name),
            ...services.map((s) => s.category || "General")
        ]))];
    const filteredServices = services.filter((s) => activeCategory === "All" || (s.category || "General") === activeCategory);
    useEffect(() => {
        apiListServices()
            .then((res) => setServices((res.services || []).filter((s) => s.active !== false)))
            .catch(() => { })
            .finally(() => setSvcLoading(false));
    }, []);
    useEffect(() => {
        apiGetPublicReviews()
            .then(d => setReviews((d.reviews || []).slice(0, 6)))
            .catch(() => { });
    }, []);
    // Load live events
    useEffect(() => {
        const loadLiveEvents = async () => {
            try {
                const res = await apiListEvents();
                const allEvents = res.events || [];
                // Consider events "live" if they are explicitly marked live OR starting within next 2 hours
                const now = new Date();
                const live = allEvents.filter((e) => {
                    if (e.live)
                        return true;
                    const eventTime = new Date(e.datetime);
                    const diff = eventTime.getTime() - now.getTime();
                    return diff > -3600000 && diff < 7200000; // 1hr ago to 2hrs from now
                });
                setLiveEvents(live);
            }
            catch (error) {
                console.error("Failed to load live events:", error);
            }
            finally {
                setLoading(false);
            }
        };
        loadLiveEvents();
        const pollInterval = setInterval(loadLiveEvents, 10000);
        return () => clearInterval(pollInterval);
    }, []);
    const imgSrc = (image) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";
    const handleImageClick = (event, imageIndex) => {
        setSelectedEventForGallery(event);
        setSelectedImageIndex(imageIndex);
    };
    const handleBookEvent = (event) => {
        const dashboardUrl = `/customer-dashboard/events/${event._id}`;
        if (!isLoggedIn || !token) {
            savePendingEventBooking({
                eventId: event._id,
                eventTitle: event.title,
                selectedTickets: {},
                selectedSession: null,
                fullServiceQty: 1,
                promoCode: "",
                returnTo: dashboardUrl,
            });
            localStorage.setItem("authReturnTo", dashboardUrl);
            sessionStorage.setItem("postLoginRedirect", dashboardUrl);
            toast.error("Please sign in to book this event");
            navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`, {
                state: { from: dashboardUrl }
            });
            return;
        }
        navigate(dashboardUrl);
    };
    const openBook = (svc) => {
        const dashboardUrl = `/customer-dashboard/services/${svc._id}`;
        if (!isLoggedIn || !token) {
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
        navigate(dashboardUrl);
    };
    const handlePaymentSuccess = (booking) => {
        setShowPaymentModal(false);
        toast.success("Payment successful! Your booking is being reviewed.");
        navigate("/customer-dashboard/bookings");
    };
    const handlePaymentError = (error) => {
        toast.error(error || "Payment failed. Please try again.");
    };
    const totalPrice = () => {
        if (!selectedService)
            return 0;
        const addOnTotal = (selectedService.addOns || [])
            .filter((a) => false) // Add-ons not used in home page flow anymore
            .reduce((sum, a) => sum + Number(a.price), 0);
        return selectedService.price + addOnTotal;
    };
    const toggleAddOn = (name) => {
        // Not used in home page flow anymore
    };
    const proceedToPayment = () => {
        // Not used in home page flow anymore
    };
    const closeLightbox = () => {
        setSelectedImageIndex(null);
        setSelectedEventForGallery(null);
    };
    return (<Layout>
      {/* Hero — two-column: copy + feature chips on the left, framed image on the right */}
      <section className="relative isolate -mt-20 flex min-h-screen items-center overflow-hidden bg-gradient-to-b from-secondary/40 to-background pt-20">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"/>
        <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"/>
        <div ref={heroScopeRef} className="container relative mx-auto px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>

              <h1 ref={heroHeadingRef} className="font-display text-3xl font-bold leading-[1.1] text-foreground sm:text-5xl md:text-6xl">
                {(() => {
            const rawTitle = (!settings?.heroTitle || settings.heroTitle === "Create Unforgettable Moments")
              ? "Your Vision, Transformed Into Extraordinary Events"
              : settings.heroTitle;
            const parts = rawTitle.split(" ");
            if (parts.length >= 2) {
                const middleIndex = Math.floor(parts.length / 2);
                const before = parts.slice(0, middleIndex).join(" ");
                const middle = parts[middleIndex];
                const after = parts.slice(middleIndex + 1).join(" ");
                return (<>
                        {before}{" "}
                        <span className="text-gradient">{middle}</span>
                        {after ? ` ${after}` : ""}
                      </>);
            }
            return rawTitle;
        })()}
              </h1>
              <p ref={heroSubtitleRef} className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                {(!settings?.heroSubtitle || settings.heroSubtitle.startsWith("From intimate workshops")) 
                  ? "From intimate private celebrations and corporate summits to grand music festivals — discover curated services, book verified tickets, and effortlessly coordinate end-to-end event planning that brings people together and turns every occasion into an extraordinary experience."
                  : settings.heroSubtitle}
              </p>



              <div ref={heroButtonsRef} className="mt-6 sm:mt-8 flex flex-wrap gap-3">
                <Link to="/events">
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    Explore Events <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                    Start Hosting
                  </Button>
                </Link>
              </div>
            </div>

            <div ref={heroImageWrapRef} className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-primary opacity-20 blur-2xl"/>
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border shadow-elevated aspect-[4/3]">
                <img ref={heroParallaxRef} src={settings.heroImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80"} alt="Event celebration" className="h-[130%] w-full -translate-y-[8%] object-cover" loading="eager"/>
                <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent"/>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce sm:block">
          <div className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-primary/40 p-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary"/>
          </div>
        </div>
      </section>

      {/* Live Events Section */}
      <section className="relative overflow-hidden py-12 sm:py-20 bg-gradient-to-b from-red-500/[0.06] to-transparent">
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-red-500/10 blur-3xl"/>
        <div className="container relative mx-auto px-4 sm:px-6">
          <div ref={liveHeaderRef} className="mb-8 sm:mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <Video className="h-5 w-5 sm:h-7 sm:w-7"/>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"/>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"/>
                </span>
              </span>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"/> Live Now
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  <span className="text-gradient">Live</span> Events
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Watch exclusive events happening right now</p>
              </div>
            </div>
            <Link to="/events" className="hidden sm:block">
              <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 gap-2">
                Browse All Events <ArrowRight className="h-4 w-4"/>
              </Button>
            </Link>
          </div>

          {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading live events...
            </div>) : liveEvents.length === 0 ? (<div className="py-16 sm:py-20 text-center text-muted-foreground border border-border rounded-2xl bg-card">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p>No live events at the moment. Check back later!</p>
            </div>) : (<div ref={liveGridRef} className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveEvents.map((event, idx) => (<div key={event._id}>
                  <EventCard event={event} index={idx} onBookNow={handleBookEvent} onViewDetails={(e) => navigate(`/events/${e._id}`)} onImageClick={(imageIdx) => handleImageClick(event, imageIdx)}/>
                </div>))}
            </div>)}

          <div className="mt-8 text-center sm:hidden">
            <Link to="/events">
              <Button variant="outline" className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 gap-2">
                Browse All Events <ArrowRight className="h-4 w-4"/>
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* Featured Events */}
      <section className="relative overflow-hidden py-12 sm:py-20">
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"/>
        <div className="container relative mx-auto px-4 sm:px-6">
          <div ref={featuredHeaderRef} className="mb-8 sm:mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="tint-chip h-11 w-11 sm:h-14 sm:w-14 bg-tint-violet text-tint-violet-fg shrink-0"><Sparkles className="h-5 w-5 sm:h-7 sm:w-7"/></span>
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  <span className="text-gradient">Featured</span> Events
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Curated experiences you don't want to miss</p>
              </div>
            </div>
            <Button onClick={() => navigate("/events")} variant="outline" className="hidden sm:inline-flex px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold">
              Browse All Events <ArrowRight className="h-4 w-4"/>
            </Button>
          </div>
          <div ref={featuredGridRef} className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2 col-span-full">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading featured events...
              </div>) : liveEvents.length > 0 ? (liveEvents.slice(0, 4).map((event, idx) => (<div key={event._id + "-featured"}>
                  <EventCard event={event} index={idx} onBookNow={handleBookEvent} onViewDetails={(e) => navigate(`/events/${e._id}`)} onImageClick={(imageIdx) => handleImageClick(event, imageIdx)}/>
                </div>))) : (<div className="py-16 text-center text-muted-foreground col-span-full border border-border rounded-2xl bg-card">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                No featured events at the moment.
              </div>)}
          </div>

          <div className="mt-8 flex justify-center sm:hidden">
            <Button onClick={() => navigate("/events")} variant="outline" className="w-full px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold">
              Browse All Events <ArrowRight className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </section>

      {/* Our Services */}
      <section className="py-12 sm:py-20 bg-secondary/30">
        <div className="container mx-auto">
          <div ref={servicesHeaderRef} className="mb-8 sm:mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              End-to-End Event Planning <span className="text-gradient">Services</span>
            </h2>
            <p className="mt-2 text-muted-foreground">Choose a service to explore and send a booking request</p>
          </div>

          {/* Service Cards — consistent style matching /services page */}
          {svcLoading ? (<div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin"/> Loading services…
            </div>) : filteredServices.length === 0 ? (<div className="flex items-center gap-2 text-muted-foreground py-6">
              <Briefcase className="h-4 w-4 opacity-50"/> No services available for this category yet.
            </div>) : (<>
              <div ref={servicesGridRef} className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServices.slice(0, 4).map((svc) => (<ServiceCard key={svc._id} svc={svc} imgSrc={imgSrc} navigate={navigate} openBook={openBook}/>))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button onClick={() => navigate("/services")} variant="outline" className="px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold">
                  Browse All Services <ArrowRight className="h-4 w-4"/>
                </Button>
              </div>
            </>)}
        </div>
      </section>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment & Booking Details</DialogTitle>
          </DialogHeader>
          {selectedService && (<SimplePayment amount={totalPrice()} bookingData={{
                serviceName: selectedService.name,
                date: "",
                time: "",
                addOns: undefined,
            }} onSuccess={handlePaymentSuccess} onError={handlePaymentError} onClose={() => {
                setShowPaymentModal(false);
            }}/>)}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal for Gallery */}
      {selectedImageIndex !== null && selectedEventForGallery && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setSelectedImageIndex(null)}>
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
            {selectedEventForGallery.gallery && selectedImageIndex < selectedEventForGallery.gallery.length - 1 && (<button onClick={() => setSelectedImageIndex(selectedImageIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="h-8 w-8"/>
              </button>)}

            {/* Main Image */}
            <div className="flex flex-col items-center gap-4 max-w-5xl">
              <img src={selectedEventForGallery.gallery[selectedImageIndex]} alt={`Gallery image ${selectedImageIndex + 1}`} className="max-h-[80vh] max-w-full object-contain rounded-lg"/>
              <div className="text-white text-sm">
                Image {selectedImageIndex + 1} of {selectedEventForGallery.gallery?.length || 0}
              </div>
            </div>
          </div>
        </motion.div>)}

      {/* How It Works */}
      <section className="py-12 sm:py-20 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
              How <span className="text-gradient">Eventoza</span> Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Three simple steps to your next great experience</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-3">
            {[
            { icon: <Sparkles className="h-6 w-6"/>, title: "Discover", desc: "Browse thousands of events across categories that match your interests." },
            { icon: <Users className="h-6 w-6"/>, title: "Book", desc: "Secure your spot with our seamless booking experience and instant confirmations." },
            { icon: <TrendingUp className="h-6 w-6"/>, title: "Experience", desc: "Attend amazing events and create memories that last a lifetime." },
        ].map((step, i) => (<motion.div key={step.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="rounded-xl border border-border bg-card p-8 text-center hover-lift">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                  {step.icon}
                </div>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>))}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section with Automatic Carousel */}
      {reviews.length > 0 && (<section className="py-12 sm:py-20 bg-secondary/20">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-8 sm:mb-12 text-center max-w-xl mx-auto">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-1 text-xs font-medium text-yellow-500 mb-3 shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-yellow-500"/> Verified Reviews
                </span>
                <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  What Our <span className="text-gradient">Customers</span> Say
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                  Real experiences from verified bookings — helping you choose with confidence.
                </p>
              </div>
            </motion.div>

            <AutomaticReviewCarousel reviews={reviews} />

            {/* View All button */}
            <div className="mt-10 text-center">
              <Link to="/reviews">
                <Button variant="outline" className="px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold">
                  View All Reviews <ArrowRight className="h-4 w-4"/>
                </Button>
              </Link>
            </div>
          </div>
        </section>)}

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative overflow-hidden rounded-2xl bg-gradient-primary p-12 text-center md:p-20">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}/>
            <h2 className="relative font-display text-3xl font-bold text-primary-foreground md:text-5xl">
              Ready to Host Your Event?
            </h2>
            <p className="relative mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Join hundreds of merchants who trust Eventoza to manage and promote their events to thousands of attendees.
            </p>
            <Link to="/register" className="relative mt-8 inline-block">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 border-0 font-semibold">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>);
};
export default Index;
