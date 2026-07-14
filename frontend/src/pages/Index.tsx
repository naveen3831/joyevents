import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, TrendingUp, Users, X, Briefcase, Loader2, Video, ChevronLeft, ChevronRight, Ticket, Copy, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListServices, apiListEvents, apiListCategories, apiGetPromoCodes, apiGetAllPromoCodes, apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";
import EventCard from "@/components/EventCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimplePayment from "@/components/SimplePayment";
import { savePendingServiceBooking, getPendingServiceBooking, clearPendingServiceBooking, savePendingEventBooking } from "@/lib/bookingState";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";

const Index = () => {
  const { isLoggedIn, token } = useAuth() as any;
  const navigate = useNavigate();
  const settings = useHomepageSettings();

  const [services, setServices] = useState<any[]>([]);
  const [svcLoading, setSvcLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedEventForGallery, setSelectedEventForGallery] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [reviews, setReviews] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [showAllPromos, setShowAllPromos] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    apiListCategories("service").then(res => setDbCategories(res.categories || [])).catch(() => { });
  }, []);

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

    // Poll for promo code updates
    const pollInterval = setInterval(loadPromoCodes, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  const categories = ["All", ...Array.from(new Set([
    ...dbCategories.map(c => c.name),
    ...services.map((s: any) => s.category || "General")
  ]))];

  const filteredServices = services.filter((s: any) => activeCategory === "All" || (s.category || "General") === activeCategory);

  useEffect(() => {
    apiListServices()
      .then((res) => setServices((res.services || []).filter((s: any) => s.active !== false)))
      .catch(() => {/* silent */ })
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
        const live = allEvents.filter((e: any) => {
          if (e.live) return true;
          const eventTime = new Date(e.datetime);
          const diff = eventTime.getTime() - now.getTime();
          return diff > -3600000 && diff < 7200000; // 1hr ago to 2hrs from now
        });
        setLiveEvents(live);
      } catch (error) {
        console.error("Failed to load live events:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLiveEvents();
    const pollInterval = setInterval(loadLiveEvents, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  const imgSrc = (image: string) =>
    image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";

  const handleImageClick = (event: any, imageIndex: number) => {
    setSelectedEventForGallery(event);
    setSelectedImageIndex(imageIndex);
  };

  const handleBookEvent = (event: any) => {
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
      toast.error("Please sign in to book this event");
      navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
      return;
    }
    navigate(dashboardUrl);
  };

  const openBook = (svc: any) => {
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
      toast.error("Please sign in to book this service");
      navigate(`/login?redirect=${encodeURIComponent(dashboardUrl)}`);
      return;
    }
    navigate(dashboardUrl);
  };

  const handlePaymentSuccess = (booking: any) => {
    setShowPaymentModal(false);
    toast.success("Payment successful! Your booking is being reviewed.");
    navigate("/customer-dashboard/bookings");
  };

  const handlePaymentError = (error: string) => {
    toast.error(error || "Payment failed. Please try again.");
  };

  const totalPrice = () => {
    if (!selectedService) return 0;
    const addOnTotal = (selectedService.addOns || [])
      .filter((a: any) => false) // Add-ons not used in home page flow anymore
      .reduce((sum: number, a: any) => sum + Number(a.price), 0);
    return selectedService.price + addOnTotal;
  };

  const toggleAddOn = (name: string) => {
    // Not used in home page flow anymore
  };

  const proceedToPayment = () => {
    // Not used in home page flow anymore
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
    setSelectedEventForGallery(null);
  };

  return (
    <Layout>
      {/* Hero — same proportions as Portfolio page (75vh, content overlaid) */}
      <section className="relative isolate overflow-hidden">
        <img src={settings.heroImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80"} alt="Event celebration" className="h-[55vh] min-h-[320px] w-full object-cover sm:h-[60vh] md:h-[65vh] lg:h-[75vh]" loading="eager" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-3 sm:mb-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs sm:text-sm text-primary"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Discover Extraordinary Events</span>
              </motion.div>
              <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                {(() => {
                  const parts = settings.heroTitle.split(" ");
                  if (parts.length >= 2) {
                    const middleIndex = Math.floor(parts.length / 2);
                    const before = parts.slice(0, middleIndex).join(" ");
                    const middle = parts[middleIndex];
                    const after = parts.slice(middleIndex + 1).join(" ");
                    return (
                      <>
                        {before}{" "}
                        <span className="text-gradient">{middle}</span>
                        {after ? ` ${after}` : ""}
                      </>
                    );
                  }
                  return settings.heroTitle;
                })()}
              </h1>
              <p className="mt-3 sm:mt-4 max-w-xl text-sm sm:text-base text-white/80">
                {settings.heroSubtitle}
              </p>
              <div className="mt-5 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                <Link to="/events">
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    Explore Events <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                    Start Hosting
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats — separate bar below hero (Portfolio-style), always fully visible */}
      <section className="border-y border-border bg-secondary/30 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-4 text-center sm:gap-8"
          >
            {[
              { label: "Events", value: settings.eventsCount },
              { label: "Attendees", value: settings.attendeesCount },
              { label: "Merchants", value: settings.merchantsCount },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="font-display text-xl font-bold text-primary sm:text-3xl md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live Events Section */}
      <section className="py-12 sm:py-20 bg-red-500/5">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-3">
              <Video className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 shrink-0" />
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  🔴 <span className="text-gradient">Live</span> Events
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Watch exclusive events happening right now</p>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading live events...
            </div>
          ) : liveEvents.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border border-border rounded-xl bg-card">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No live events at the moment. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveEvents.map((event, idx) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 }}
                >
                  <EventCard
                    event={event}
                    index={idx}
                    onBookNow={handleBookEvent}
                    onViewDetails={(e) => navigate(`/events/${e._id}`)}
                    onImageClick={(imageIdx) => handleImageClick(event, imageIdx)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/events">
              <Button variant="outline" size="lg">
                Browse All Events <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Promo Codes Section */}
      {!promoLoading && promoCodes.length > 0 && (
        <section className="py-20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <Ticket className="h-8 w-8 text-amber-500" />
                <div>
                  <h2 className="font-display text-3xl font-bold md:text-4xl">
                    <span className="text-gradient">Exclusive</span> Promo Codes
                  </h2>
                  <p className="mt-2 text-muted-foreground">Save big with special discounts from our merchants</p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(showAllPromos ? promoCodes : promoCodes.slice(0, 3)).map((promo, idx) => (
                <motion.div
                  key={promo._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 p-5 hover-lift"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <code className="bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">
                        {promo.code}
                      </code>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {promo.description && (
                          <p className="text-xs text-muted-foreground">{promo.description}</p>
                        )}
                        {promo.minBookingAmount > 0 && (
                          <span className="text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5">
                            Min {formatCurrency(promo.minBookingAmount)}
                          </span>
                        )}
                      </div>
                      {promo.minBookingAmount > 0 && (
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300 mt-1">
                          Spend {formatCurrency(promo.minBookingAmount)}+ to get {promo.discountType === "percentage" ? `${promo.discountValue}% off` : `${formatCurrency(promo.discountValue)} off`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(promo.code);
                        toast.success("Code copied!");
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-amber-200/30">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {promo.discountType === "percentage" ? `${promo.discountValue}% OFF` : `${formatCurrency(promo.discountValue)} OFF`}
                    </span>
                    <div className="flex items-center gap-3">
                      {promo.merchant?.name && (
                        <span className="text-[11px] text-muted-foreground">{promo.merchant.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {promo.maxUses ? `${promo.currentUses}/${promo.maxUses} used` : "Unlimited"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {promoCodes.length > 3 && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAllPromos(v => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-6 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
                >
                  {showAllPromos ? (
                    <>Show Less</>
                  ) : (
                    <>View All {promoCodes.length} Offers <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Events */}
      <section className="py-20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              <span className="text-gradient">Featured</span> Events
            </h2>
            <p className="mt-2 text-muted-foreground">Curated experiences you don't want to miss</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 col-span-full">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading featured events...
              </div>
            ) : liveEvents.length > 0 ? (
              liveEvents.slice(0, 4).map((event, idx) => (
                <motion.div
                  key={event._id + "-featured"}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 }}
                >
                  <EventCard
                    event={event}
                    index={idx}
                    onBookNow={handleBookEvent}
                    onViewDetails={(e) => navigate(`/events/${e._id}`)}
                    onImageClick={(imageIdx) => handleImageClick(event, imageIdx)}
                  />
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground col-span-full">
                No featured events at the moment.
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => navigate("/events")}
              variant="outline"
              className="px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold"
            >
              Browse All Events <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Our Services */}
      <section className="py-12 sm:py-20 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-8 sm:mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              End-to-End Event Planning <span className="text-gradient">Services</span>
            </h2>
            <p className="mt-2 text-muted-foreground">Choose a service to explore and send a booking request</p>
          </motion.div>

          {/* Service Cards — consistent style matching /services page */}
          {svcLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Briefcase className="h-4 w-4 opacity-50" /> No services available for this category yet.
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServices.slice(0, 4).map((svc: any, i: number) => (
                  <motion.div
                    key={svc._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
                      {imgSrc(svc.image) ? (
                        <img
                          src={imgSrc(svc.image)}
                          alt={svc.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Briefcase className="h-12 w-12 opacity-30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        From {formatCurrency(svc.price)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-5 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors mb-1.5 sm:mb-2 min-h-[2.5rem]">
                        {svc.name}
                      </h3>

                      {svc.createdBy && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 flex-shrink-0">
                          Provider: <span className="text-primary font-medium">{svc.createdBy.name}</span>
                        </p>
                      )}

                      {/* Highlights */}
                      {svc.highlights?.length > 0 && (
                        <ul className="space-y-1 mb-4 flex-1">
                          {svc.highlights.slice(0, 2).map((h: string, hi: number) => (
                            <li key={hi} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                              <span className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-primary shrink-0" />
                              <span className="line-clamp-1">{h}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Buttons */}
                      <div className="space-y-2 mt-auto">
                        <Button
                          variant="outline"
                          className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold border-border hover:bg-secondary text-foreground"
                          onClick={() => navigate(`/services/${svc._id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90"
                          onClick={() => openBook(svc)}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => navigate("/services")}
                  variant="outline"
                  className="px-6 border-primary/20 hover:border-primary/50 text-foreground gap-2 font-semibold"
                >
                  Browse All Services <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment & Booking Details</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <SimplePayment
              amount={totalPrice()}
              bookingData={{
                serviceName: selectedService.name,
                date: "",
                time: "",
                addOns: undefined,
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onClose={() => {
                setShowPaymentModal(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal for Gallery */}
      {selectedImageIndex !== null && selectedEventForGallery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-7xl max-h-screen p-4 flex items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 z-[60] rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Previous button */}
            {selectedImageIndex > 0 && (
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {/* Next button */}
            {selectedEventForGallery.gallery && selectedImageIndex < selectedEventForGallery.gallery.length - 1 && (
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}

            {/* Main Image */}
            <div className="flex flex-col items-center gap-4 max-w-5xl">
              <img
                src={selectedEventForGallery.gallery[selectedImageIndex]}
                alt={`Gallery image ${selectedImageIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
              <div className="text-white text-sm">
                Image {selectedImageIndex + 1} of {selectedEventForGallery.gallery?.length || 0}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      <section className="py-12 sm:py-20 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
              How <span className="text-gradient">JoyEvents</span> Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Three simple steps to your next great experience</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-3">
            {[
              { icon: <Sparkles className="h-6 w-6" />, title: "Discover", desc: "Browse thousands of events across categories that match your interests." },
              { icon: <Users className="h-6 w-6" />, title: "Book", desc: "Secure your spot with our seamless booking experience and instant confirmations." },
              { icon: <TrendingUp className="h-6 w-6" />, title: "Experience", desc: "Attend amazing events and create memories that last a lifetime." },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="rounded-xl border border-border bg-card p-8 text-center hover-lift"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                  {step.icon}
                </div>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className="py-12 sm:py-20">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="mb-8 sm:mb-12">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-500 mb-3">
                  <Star className="h-3.5 w-3.5 fill-yellow-500" /> Verified Reviews
                </span>
                <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                  What Our <span className="text-gradient">Customers</span> Say
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl">
                  Real experiences from verified bookings — helping you choose with confidence.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, i) => (
                <motion.div key={review._id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                  {/* Stars */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${review.type === "event" ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
                      }`}>
                      {review.type === "event" ? "🎫 Event" : "🛠️ Service"}
                    </span>
                  </div>

                  {/* Comment */}
                  <div className="flex-1 relative">
                    <Quote className="absolute -top-1 -left-1 h-5 w-5 text-primary/15" />
                    <p className="text-sm text-muted-foreground leading-relaxed pl-4 line-clamp-3 italic">
                      {review.comment ? `"${review.comment}"` : "Great experience overall!"}
                    </p>
                  </div>

                  {/* Title */}
                  <p className="text-xs font-semibold text-foreground truncate">{review.title}</p>

                  {/* Footer */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{review.customerName}</p>
                      {review.ratedAt && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(review.ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View All button — only show if more than 6 reviews exist */}
            {reviews.length >= 6 && (
              <div className="mt-8 text-center">
                <Link to="/reviews">
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                    View All Reviews <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl bg-gradient-primary p-12 text-center md:p-20"
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            <h2 className="relative font-display text-3xl font-bold text-primary-foreground md:text-5xl">
              Ready to Host Your Event?
            </h2>
            <p className="relative mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Join hundreds of merchants who trust JoyEvents to manage and promote their events to thousands of attendees.
            </p>
            <Link to="/register" className="relative mt-8 inline-block">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 border-0 font-semibold">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;


