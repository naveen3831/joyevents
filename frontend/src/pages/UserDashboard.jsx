import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, Clock, CheckCircle2, AlertCircle, Loader2, BarChart3, Video, Search, MapPin, CalendarDays, Briefcase, ArrowRight, Star, FileText, CreditCard, Mail, Sparkles, Eye, CalendarCheck, Heart, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { apiMyBookings, apiListEvents, apiListServices, apiSubmitRating, apiListCategories, apiRequestCancel, apiAcceptCancellationFee, apiWithdrawWallet, apiVerifyToken, apiGetMyCustomServiceRequests } from "@/lib/api";
import { API_URL } from "@/lib/config";
import EventCard from "@/components/EventCard";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SimplePayment from "@/components/SimplePayment";
import ContactMerchantModal from "@/components/ContactMerchantModal";
import RequestCustomServiceModal from "@/components/RequestCustomServiceModal";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const STATUS_BADGE = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
  completed: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
  cancellation_requested: "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold animate-pulse",
  cancellation_fee_proposed: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold animate-pulse",
  refund_pending: "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold",
  refunded: "bg-red-500/15 text-red-400 border border-red-500/30 font-bold",
};

const UserDashboard = () => {
  const { token, user, updateUser } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [customRequests, setCustomRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  useEffect(() => {
    if (!bookings.length || isCarouselHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bookings.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [bookings.length, isCarouselHovered]);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Category state
  const [eventCategories, setEventCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedEventCategory, setSelectedEventCategory] = useState(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState(null);
  const [contactService, setContactService] = useState(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Cancellation and Withdrawal states
  const [cancellingId, setCancellingId] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const handleRequestCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to request cancellation for this booking?")) return;
    setCancellingId(bookingId);
    try {
      await apiRequestCancel(bookingId, token);
      toast.success("Cancellation request submitted successfully!");
      loadBookings();
    } catch (e) {
      toast.error(e?.message || "Failed to submit cancellation request");
    } finally {
      setCancellingId(null);
    }
  };

  const handleAcceptCancellationFee = async (bookingId) => {
    if (!window.confirm("Do you agree to the proposed cancellation fee and want to proceed to refund?")) return;
    setCancellingId(bookingId);
    try {
      await apiAcceptCancellationFee(bookingId, token);
      toast.success("Cancellation fee accepted! Refund processing initiated.");
      loadBookings();
    } catch (e) {
      toast.error(e?.message || "Failed to accept cancellation fee");
    } finally {
      setCancellingId(null);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amountNum > (user?.walletBalance || 0)) {
      toast.error("Insufficient balance");
      return;
    }
    if (withdrawMethod === "upi" && !upiId.trim()) {
      toast.error("Please enter a UPI ID");
      return;
    }
    if (withdrawMethod === "bank" && (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim())) {
      toast.error("Please enter complete bank transfer details");
      return;
    }
    setWithdrawing(true);
    try {
      const details = withdrawMethod === "upi" ? { upiId } : { bankName, accountNumber, ifscCode };
      await apiWithdrawWallet(amountNum, withdrawMethod, details, token);
      const verifyRes = await apiVerifyToken(token);
      if (verifyRes.user) {
        updateUser(verifyRes.user);
      }
      toast.success("Withdrawal processed successfully!");
      setWithdrawModal(false);
      setWithdrawAmount("");
      setUpiId("");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
    } catch (e) {
      toast.error(e?.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !locationQuery.trim()) {
      toast.error("Please enter a search term or location");
      return;
    }
    setShowSearchResults(true);
    setSearchLoading(true);
    try {
      const [eventsRes, servicesRes] = await Promise.all([
        apiListEvents(),
        apiListServices()
      ]);
      let allEvents = eventsRes.events || [];
      let allServices = servicesRes.services || [];
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        allEvents = allEvents.filter((event) => event.title?.toLowerCase().includes(query) || event.description?.toLowerCase().includes(query) || event.category?.toLowerCase().includes(query));
        allServices = allServices.filter((service) => service.name?.toLowerCase().includes(query) || service.description?.toLowerCase().includes(query) || service.category?.toLowerCase().includes(query));
      }
      if (locationQuery.trim()) {
        const location = locationQuery.toLowerCase();
        allEvents = allEvents.filter((event) => event.location?.toLowerCase().includes(location));
        allServices = allServices.filter((service) => service.location?.toLowerCase().includes(location));
      }
      setFilteredEvents(allEvents);
      setFilteredServices(allServices);
    } catch (error) {
      toast.error("Failed to search");
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setShowSearchResults(false);
    setSearchQuery("");
    setLocationQuery("");
    setFilteredEvents([]);
    setFilteredServices([]);
  };

  const loadBookings = async () => {
    if (!token) return;
    try {
      const [bRes, cRes, verifyRes] = await Promise.all([
        apiMyBookings(token).catch(() => ({ bookings: [] })),
        apiGetMyCustomServiceRequests(token).catch(() => ({ requests: [] })),
        apiVerifyToken(token).catch(() => null)
      ]);
      setBookings(bRes.bookings || []);
      setCustomRequests(cRes.requests || []);
      if (verifyRes?.user) {
        updateUser(verifyRes.user);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [token]);
  useRealtimeRefresh(["auth", "bookings", "notifications", "wallet"], loadBookings);

  // Load events, services, categories
  useEffect(() => {
    apiListEvents()
      .then((res) => {
        const allEvents = res.events || [];
        const live = allEvents.filter((e) => e.live === true);
        const nonLive = allEvents.filter((e) => e.live !== true);
        setLiveEvents([...live, ...nonLive]);
      })
      .catch(() => {})
      .finally(() => setLiveLoading(false));

    apiListServices()
      .then((res) => setServices(res.services || []))
      .catch(() => {})
      .finally(() => setServicesLoading(false));
  }, [token]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [evCats, svCats, eventsRes, servicesRes] = await Promise.all([
          apiListCategories("event").catch(() => ({ categories: [] })),
          apiListCategories("service").catch(() => ({ categories: [] })),
          apiListEvents().catch(() => ({ events: [] })),
          apiListServices().catch(() => ({ services: [] })),
        ]);
        const dbEventCats = (evCats.categories || []).map((c) => c.name || c);
        const eventCatsFromData = (eventsRes.events || []).map((e) => e.category).filter(Boolean);
        setEventCategories([...new Set([...dbEventCats, ...eventCatsFromData])].sort());

        const dbServiceCats = (svCats.categories || []).map((c) => c.name || c);
        const serviceCatsFromData = (servicesRes.services || []).map((s) => s.category).filter(Boolean);
        setServiceCategories([...new Set([...dbServiceCats, ...serviceCatsFromData])].sort());
      } catch {
        /* silent */
      }
    };
    loadCategories();
  }, []);

  const displayedEvents = selectedEventCategory
    ? liveEvents.filter(e => e.category?.toLowerCase() === selectedEventCategory.toLowerCase())
    : liveEvents;

  const displayedServices = selectedServiceCategory
    ? services.filter(s => s.category?.toLowerCase() === selectedServiceCategory.toLowerCase())
    : services;

  const onlyLiveEvents = liveEvents.filter(e => e.live === true);

  return (
    <CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="w-full">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="flex flex-col gap-5 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-between gap-3 pt-3 sm:pt-2 pb-2 sm:pb-1">
              <div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 sm:gap-4">
                  <span className="text-muted-foreground text-base sm:text-xl font-medium">{t("welcome_back")},</span>
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-gradient">
                    {user?.name || 'Customer'} 👋
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-1.5 font-medium">{t("track_bookings")}</p>
              </div>

              {/* Desktop Only: Header Action Icons */}
              <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                <Link
                  to="/customer-dashboard/favorites"
                  className="w-11 h-11 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-secondary text-foreground flex items-center justify-center transition-all shadow-sm active:scale-95"
                  title="Favorites"
                >
                  <Heart className="h-5 w-5 text-rose-500" />
                </Link>

                <Link
                  to="/customer-dashboard/cart"
                  className="w-11 h-11 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-secondary text-foreground flex items-center justify-center transition-all shadow-sm relative active:scale-95"
                  title="Cart"
                >
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-gradient-primary text-white text-[10px] font-black flex items-center justify-center shadow-glow animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[200px]">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input type="text" placeholder={t("location_placeholder")} value={locationQuery} maxLength={100} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(e); } }} className="border-border bg-secondary pl-10 w-full rounded-2xl h-12 text-sm"/>
              </div>
              
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"/>
                <Input type="text" placeholder={t("search_events_services")} value={searchQuery} maxLength={100} onChange={(e) => setSearchQuery(e.target.value)} className="border-border bg-secondary pl-11 w-full pr-20 h-12 text-sm sm:text-base rounded-2xl shadow-sm focus-visible:ring-primary/50"/>
                <Button type="submit" size="sm" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 h-8.5 px-3.5 text-xs sm:text-sm font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition-all">
                  {t("search")}
                </Button>
              </form>
            </div>
          </motion.div>

          {/* Search Results */}
          {showSearchResults && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mt-8 sm:mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary"/> {t("search_results")}
                </h2>
                <Button onClick={clearSearch} variant="outline" size="sm">
                  {t("clear_search")} ✕
                </Button>
              </div>
              {searchLoading ? (
                <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>
              ) : (
                <div className="space-y-6">
                  {filteredEvents.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-muted-foreground mb-3">Events ({filteredEvents.length})</h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {filteredEvents.map((event, idx) => (
                          <EventCard 
                            key={event._id} 
                            event={event} 
                            index={idx}
                            onViewDetails={(e) => navigate(`/customer-dashboard/events/${e._id}`)}
                            onBookNow={(e) => navigate(`/customer-dashboard/events/${e._id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredServices.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-muted-foreground mb-3">Services ({filteredServices.length})</h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {filteredServices.map((svc, idx) => (
                          <motion.div 
                            key={svc._id} 
                            onClick={() => navigate(`/customer-dashboard/services/${svc._id}`)}
                            className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors cursor-pointer"
                          >
                            <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-44">
                              {svc.image ? (
                                <img src={svc.image.startsWith("http") ? svc.image : `${API_URL}${svc.image}`} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                              ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                                  <Clock className="h-12 w-12 opacity-20"/>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                From {formatCurrency(svc.price)}
                              </span>
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                              <h3 className="font-semibold text-xs sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {svc.name}
                              </h3>
                              <div className="flex-1"/>
                              <div className="mt-3">
                                <button className="w-full rounded-lg py-1.5 text-xs font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                                  View Details & Book
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredEvents.length === 0 && filteredServices.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No matching events or services found.</div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Recent Bookings Hero Carousel */}
          {bookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full my-6 sm:my-8 rounded-3xl overflow-hidden border border-border/80 bg-card shadow-card"
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
            >
              <div className="relative h-72 sm:h-84 lg:h-96 w-full overflow-hidden">
                <AnimatePresence mode="wait">
                  {bookings[currentSlide] && (() => {
                    const b = bookings[currentSlide];
                    const title = b.event?.title || b.serviceName || b.service?.name || "Booking Experience";
                    const img = b.event?.image || b.serviceImage || b.service?.image;
                    const loc = b.event?.location || b.customerLocation?.address || b.location || "On Location";
                    const dateStr = b.datetime ? new Date(b.datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

                    return (
                      <motion.div
                        key={b._id || currentSlide}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 w-full h-full"
                      >
                        {/* Background Image */}
                        {img ? (
                          <img
                            src={img.startsWith("http") ? img : `${API_URL}${img}`}
                            alt={title}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-mesh flex items-center justify-center">
                            <Ticket className="h-20 w-20 text-white/20" />
                          </div>
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

                        {/* Slide Content Overlay */}
                        <div className="absolute inset-0 p-6 sm:p-8 lg:p-10 flex flex-col justify-between z-10 text-white">
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-primary text-white shadow-glow">
                              <Clock className="h-3.5 w-3.5" /> Recent Booking
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border backdrop-blur-md ${STATUS_BADGE[b.status] || "bg-white/20 text-white border-white/20"}`}>
                              {b.status}
                            </span>
                          </div>

                          <div className="space-y-2.5 sm:space-y-3 max-w-2xl">
                            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight drop-shadow-md line-clamp-2">
                              {title}
                            </h2>
                            <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90 flex-wrap font-medium">
                              {dateStr && (
                                <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  {dateStr}
                                </span>
                              )}
                              {loc && (
                                <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                                  <MapPin className="h-4 w-4 text-rose-400" />
                                  {loc}
                                </span>
                              )}
                              {b.price > 0 && (
                                <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm text-emerald-400 font-bold">
                                  {formatCurrency(b.price)}
                                </span>
                              )}
                            </div>

                            <div className="pt-2">
                              <Button
                                onClick={() => navigate(`/my-requests`)}
                                className="bg-gradient-primary text-white font-bold h-11 sm:h-12 px-6 rounded-2xl shadow-glow hover:scale-105 transition-all flex items-center gap-2 text-xs sm:text-sm"
                              >
                                <FileText className="h-4 w-4" /> View My Bookings <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {/* Left & Right Navigation Arrows */}
                {bookings.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev - 1 + bookings.length) % bookings.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-primary backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                      aria-label="Previous booking"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev + 1) % bookings.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-primary backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                      aria-label="Next booking"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Bottom Dot Indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      {bookings.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            currentSlide === idx ? "w-6 bg-gradient-primary" : "w-2 bg-white/40 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Overview Dashboard Stats */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6 sm:mt-8">
            <StatCard
              title="Total Bookings"
              value={bookings.length}
              icon={<Ticket className="h-5 w-5 text-primary" />}
              index={0}
              to="/my-requests"
            />
            <StatCard
              title="Upcoming Experiences"
              value={bookings.filter(b => b.status === "confirmed" || b.status === "paid" || b.status === "pending").length}
              icon={<Calendar className="h-5 w-5 text-indigo-500" />}
              index={1}
              to="/my-requests"
            />
            <StatCard
              title="Custom Enquiries"
              value={customRequests.length}
              icon={<Sparkles className="h-5 w-5 text-purple-500" />}
              index={2}
              to="/my-requests"
            />
            <StatCard
              title="Wallet Balance"
              value={formatCurrency(user?.walletBalance || 0)}
              icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
              index={3}
              to="/customer-dashboard/wallet"
            />
          </motion.div>

          {/* Recent Bookings Overview Summary */}
          {bookings.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.1 }} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-primary" /> Recent Bookings Overview
                </h3>
                <Link to="/my-requests">
                  <Button size="sm" variant="ghost" className="text-xs sm:text-sm text-primary gap-1">
                    View All ({bookings.length}) <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="divide-y divide-border">
                {bookings.slice(0, 3).map((b) => (
                  <div key={b._id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                        🎫
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{b.event?.title || b.serviceName}</p>
                        <p className="text-muted-foreground text-[11px]">📅 {new Date(b.datetime).toLocaleDateString()} | 📍 {b.event?.location || b.customerLocation?.address || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                      <span className="font-bold text-sm text-primary">{formatCurrency(b.price)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Categories & Catalog Preview */}
          <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-10">
            {/* Event Categories & Preview */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary"/> Featured Events
                </h3>
                <Link to="/customer-dashboard/browse-events">
                  <Button size="sm" variant="ghost" className="text-sm gap-1 text-primary">
                    View All Events <ArrowRight className="h-3.5 w-3.5"/>
                  </Button>
                </Link>
              </div>

              {/* 3 Events Grid */}
              <div className="mt-4">
                {liveLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin"/> Loading events...
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                    <p>No events available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {displayedEvents.slice(0, 3).map((event, idx) => (
                      <EventCard 
                        key={event._id}
                        event={event} 
                        index={idx}
                        onViewDetails={(e) => navigate(`/customer-dashboard/events/${e._id}`)}
                        onBookNow={(e) => navigate(`/customer-dashboard/events/${e._id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Service Categories & Preview */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-orange-500"/> Featured Services
                </h3>
                <Link to="/customer-dashboard/browse-services">
                  <Button size="sm" variant="ghost" className="text-sm gap-1 text-orange-500">
                    View All Services <ArrowRight className="h-3.5 w-3.5"/>
                  </Button>
                </Link>
              </div>

              {/* 3 Services Grid */}
              <div className="mt-4">
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin"/> Loading services...
                  </div>
                ) : displayedServices.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                    <p>No services available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {displayedServices.slice(0, 3).map((svc, idx) => (
                      <motion.div 
                        key={svc._id} 
                        initial={{ opacity: 0, y: 20 }} 
                        whileInView={{ opacity: 1, y: 0 }} 
                        viewport={{ once: true, amount: 0.15 }} 
                        transition={{ delay: idx * 0.05 }} 
                        className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors shadow-card"
                      >
                        <div className="relative overflow-hidden bg-secondary shrink-0 w-full h-48 sm:h-52 cursor-pointer" onClick={() => navigate(`/customer-dashboard/services/${svc._id}`)}>
                          {svc.image ? (
                            <img src={svc.image.startsWith("http") ? svc.image : `${API_URL}${svc.image}`} alt={svc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                              <Briefcase className="h-12 w-12 opacity-20"/>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                          <span className="absolute bottom-3 left-3 rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/10">
                            From {formatCurrency(svc.price)}
                          </span>
                        </div>
                        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
                          <div>
                            <h3 onClick={() => navigate(`/customer-dashboard/services/${svc._id}`)} className="font-display text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug cursor-pointer min-h-[2.5rem]">
                              {svc.name}
                            </h3>
                            {svc.averageRating && svc.averageRating > 0 ? (
                              <div className="flex items-center gap-1 mt-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0"/>
                                <span className="text-xs font-semibold text-foreground">{svc.averageRating.toFixed(1)}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => navigate(`/customer-dashboard/services/${svc._id}`)} className="min-h-[40px] rounded-xl text-xs font-semibold border border-border hover:bg-secondary text-foreground transition-all flex items-center justify-center gap-1.5">
                                <Eye className="h-4 w-4"/> Details
                              </button>
                              <button onClick={() => navigate(`/customer-dashboard/services/${svc._id}`)} className="min-h-[40px] rounded-xl text-xs font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow transition-all flex items-center justify-center gap-1.5">
                                <CalendarCheck className="h-4 w-4"/> Book Now
                              </button>
                            </div>
                            <button onClick={() => setContactService(svc)} className="w-full min-h-[34px] rounded-xl text-xs font-medium border border-border/80 hover:bg-secondary transition-all text-muted-foreground flex items-center justify-center gap-1.5">
                              <Mail className="h-3.5 w-3.5"/> Contact Provider
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Custom Service Request Modal */}
        <RequestCustomServiceModal
          open={showCustomServiceModal}
          onOpenChange={setShowCustomServiceModal}
          onSuccess={() => {
            loadBookings();
            navigate("/my-requests");
          }}
        />

        {/* Contact Merchant Modal */}
        {contactService && (
          <ContactMerchantModal
            open={!!contactService}
            onOpenChange={(op) => !op && setContactService(null)}
            service={contactService}
          />
        )}
      </section>
    </CustomerLayout>
  );
};

export default UserDashboard;
