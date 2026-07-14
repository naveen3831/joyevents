import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Calendar, DollarSign, Ticket, Clock, CheckCircle2, AlertCircle, Loader2, BarChart3, Video, Search, MapPin, CalendarDays, Briefcase, ArrowRight, Star, FileText, CreditCard } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { apiMyBookings, apiListEvents, apiListServices, apiSubmitRating, apiListCategories, apiRequestCancel, apiAcceptCancellationFee, apiWithdrawWallet, apiVerifyToken } from "@/lib/api";
import { API_URL } from "@/lib/config";
import EventCard from "@/components/EventCard";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SimplePayment from "@/components/SimplePayment";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  confirmed: "bg-green-500/15 text-green-400 border border-green-500/30", // Approved by merchant - ticket generated
  completed: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
  cancellation_requested: "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold animate-pulse",
  cancellation_fee_proposed: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold animate-pulse",
  refund_pending: "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold",
  refunded: "bg-red-500/15 text-red-400 border border-red-500/30 font-bold",
};

const UserDashboard = () => {
  const { token, user, updateUser } = useAuth() as any;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("all");
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Category state
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);  const [paymentBooking, setPaymentBooking] = useState<any>(null);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const openPaymentModal = (b: any) => { setPaymentBooking(b); setShowPaymentModal(true); };

  // Cancellation and Withdrawal states
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const handleRequestCancel = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to request cancellation for this booking?")) return;
    setCancellingId(bookingId);
    try {
      await apiRequestCancel(bookingId, token);
      toast.success("Cancellation request submitted successfully!");
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit cancellation request");
    } finally {
      setCancellingId(null);
    }
  };

  const handleAcceptCancellationFee = async (bookingId: string) => {
    if (!window.confirm("Do you agree to the proposed cancellation fee and want to proceed to refund?")) return;
    setCancellingId(bookingId);
    try {
      await apiAcceptCancellationFee(bookingId, token);
      toast.success("Cancellation fee accepted! Refund processing initiated.");
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to accept cancellation fee");
    } finally {
      setCancellingId(null);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
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
      const res = await apiWithdrawWallet(amountNum, withdrawMethod, details, token);
      
      // Update local user context state
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
    } catch (e: any) {
      toast.error(e?.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const openRatingModal = (b: any) => {
    setSelectedBooking(b);
    setRatingScore(b.rating?.score || 5);
    setRatingComment(b.rating?.comment || "");
    setRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedBooking) return;
    if (ratingComment.length > 500) {
      toast.error("Rating comment cannot exceed 500 characters");
      return;
    }
    setSubmittingRating(true);
    try {
      await apiSubmitRating(selectedBooking._id, ratingScore, ratingComment, token);
      toast.success("Rating submitted!");
      setBookings(bookings.map(b => b._id === selectedBooking._id
        ? { ...b, rating: { score: ratingScore, comment: ratingComment } } : b));
      setRatingModal(false);
      setSelectedBooking(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const downloadInvoice = (b: any) => {
    const invoiceNo = `INV-${b._id?.slice(-8).toUpperCase()}`;
    const serviceName = b.event?.title || b.serviceName || "Service";
    const isEvent = !!b.event;
    const customerName = user?.name || "Customer";
    const customerEmail = user?.email || "";
    const merchantName = b.assignedTo?.name || "JoyEvents Team";
    const merchantEmail = b.assignedTo?.email || "";
    const bookingDate = new Date(b.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const bookingTime = new Date(b.datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const issuedDate = new Date(b.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const paymentMethod = b.paymentMethod === "upi" ? `UPI${b.upiId ? ` (${b.upiId})` : ""}` : `Card${b.cardLast4 ? ` ····${b.cardLast4}` : ""}`;
    const location = b.event?.location || b.customerLocation?.address || "—";
    const discount = b.promoCode?.discountAmount || 0;
    const total = b.price;
    const rating = b.rating?.score ? `${b.rating.score}/5 ⭐${b.rating.comment ? ` — "${b.rating.comment}"` : ""}` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${invoiceNo}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Poppins',sans-serif;background:#f4f6f9;padding:30px;color:#333;}
.page{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12);}
.header{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:36px 40px;display:flex;justify-content:space-between;align-items:flex-start;}
.brand{font-size:28px;font-weight:800;}.brand span{font-size:13px;font-weight:400;opacity:.8;display:block;margin-top:4px;}
.inv-meta{text-align:right;}.inv-meta h2{font-size:22px;font-weight:700;}.inv-meta p{font-size:12px;opacity:.85;margin-top:3px;}
.body{padding:36px 40px;}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #f0f0f0;}
.party h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px;}
.party .name{font-weight:700;font-size:15px;color:#111;margin-bottom:3px;}.party p{font-size:13px;color:#6b7280;}
.info-grid{background:#f9fafb;border-radius:8px;padding:16px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
.info-item label{font-size:10px;color:#9ca3af;display:block;margin-bottom:3px;text-transform:uppercase;}
.info-item span{font-size:13px;font-weight:600;color:#111;}
.totals{margin-left:auto;width:280px;margin-top:16px;}
.totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#374151;border-bottom:1px solid #f5f5f5;}
.totals-row.discount{color:#10b981;}.totals-row.total{border-top:2px solid #7c3aed;border-bottom:none;margin-top:8px;padding-top:12px;font-weight:800;font-size:17px;color:#7c3aed;}
.payment-box{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px 20px;margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.payment-box .label{font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;}.payment-box .value{font-size:13px;font-weight:600;color:#111;}
.rating-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px;color:#92400e;}
.footer{background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;font-size:11px;color:#9ca3af;line-height:1.9;}
</style></head><body><div class="page">
<div class="header"><div class="brand">🎉 JoyEvents<span>Premium Event Services Platform</span></div>
<div class="inv-meta"><h2>INVOICE</h2><p>${invoiceNo}</p><p>Issued: ${issuedDate}</p></div></div>
<div class="body">
<div class="parties">
  <div class="party"><h4>Billed To</h4><div class="name">${customerName}</div>${customerEmail ? `<p>${customerEmail}</p>` : ""}</div>
  <div class="party"><h4>Service Provider</h4><div class="name">${merchantName}</div>${merchantEmail ? `<p>${merchantEmail}</p>` : ""}<p>JoyEvents Platform</p></div>
</div>
<div class="info-grid">
  <div class="info-item"><label>Date</label><span>${bookingDate}</span></div>
  <div class="info-item"><label>Time</label><span>${bookingTime}</span></div>
  <div class="info-item"><label>Type</label><span>${isEvent ? "Event" : "Service"}</span></div>
  <div class="info-item"><label>Location</label><span>${location}</span></div>
  <div class="info-item"><label>Payment</label><span>${paymentMethod}</span></div>
  <div class="info-item"><label>Booking ID</label><span style="font-family:monospace;font-size:11px;">${b._id?.slice(-10).toUpperCase()}</span></div>
</div>
<div class="totals">
  <div class="totals-row"><span>${serviceName}</span><span>${formatCurrency((total + discount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
  ${discount > 0 ? `<div class="totals-row discount"><span>Discount${b.promoCode?.code ? ` (${b.promoCode.code})` : ""}</span><span>−${formatCurrency(discount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
  <div class="totals-row total"><span>Total Paid</span><span>${formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
</div>
<div class="payment-box">
  <div><div class="label">Reference</div><div class="value">${b.paymentId || "—"}</div></div>
  <div><div class="label">Status</div><div class="value" style="color:#10b981;">✓ Paid</div></div>
  <div><div class="label">Amount</div><div class="value" style="color:#7c3aed;font-size:16px;font-weight:800;">${formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
</div>
${rating ? `<div class="rating-box">⭐ Your Rating: ${rating}</div>` : ""}
</div>
<div class="footer">Thank you for choosing JoyEvents! · This is a computer-generated invoice.<br>support@joyevents.com · www.joyevents.com</div>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${invoiceNo}.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Invoice downloaded!");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && !locationQuery.trim()) {
      toast.error("Please enter a search term or location");
      return;
    }
    if (searchQuery.length > 100 || locationQuery.length > 100) {
      toast.error("Search terms cannot exceed 100 characters");
      return;
    }
    
    setShowSearchResults(true);
    setSearchLoading(true);
    
    try {
      // Fetch all events and services
      const [eventsRes, servicesRes] = await Promise.all([
        apiListEvents(),
        apiListServices()
      ]);
      
      let allEvents = eventsRes.events || [];
      let allServices = servicesRes.services || [];
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        allEvents = allEvents.filter((event: any) => 
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query)
        );
        
        allServices = allServices.filter((service: any) => 
          service.name?.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query) ||
          service.category?.toLowerCase().includes(query)
        );
      }
      
      // Filter by location
      if (locationQuery.trim()) {
        const location = locationQuery.toLowerCase();
        allEvents = allEvents.filter((event: any) => 
          event.location?.toLowerCase().includes(location)
        );
        
        allServices = allServices.filter((service: any) => 
          service.location?.toLowerCase().includes(location)
        );
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
      const res = await apiMyBookings(token);
      setBookings(res.bookings || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [token]);

  // Load live events
  useEffect(() => {
    apiListEvents()
      .then((res) => {
        const allEvents = res.events || [];
        const live = allEvents.filter((e: any) => e.live === true);
        setLiveEvents(live);
      })
      .catch(() => {/* silent */ })
      .finally(() => setLiveLoading(false));
  }, [token]);

  // Load real services
  useEffect(() => {
    apiListServices()
      .then((res) => setServices((res.services || []).slice(0, 6)))
      .catch(() => {/* silent */})
      .finally(() => setServicesLoading(false));
  }, []);

  // Load categories — from DB + derive from actual events/services
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [evCats, svCats, eventsRes, servicesRes] = await Promise.all([
          apiListCategories("event").catch(() => ({ categories: [] })),
          apiListCategories("service").catch(() => ({ categories: [] })),
          apiListEvents().catch(() => ({ events: [] })),
          apiListServices().catch(() => ({ services: [] })),
        ]);

        // Merge DB categories + categories from actual events
        const dbEventCats = (evCats.categories || []).map((c: any) => c.name || c);
        const eventCatsFromData = (eventsRes.events || [])
          .map((e: any) => e.category).filter(Boolean);
        const allEventCats = [...new Set([...dbEventCats, ...eventCatsFromData])].sort();

        // Merge DB categories + categories from actual services
        const dbServiceCats = (svCats.categories || []).map((c: any) => c.name || c);
        const serviceCatsFromData = (servicesRes.services || [])
          .map((s: any) => s.category).filter(Boolean);
        const allServiceCats = [...new Set([...dbServiceCats, ...serviceCatsFromData])].sort();

        setEventCategories(allEventCats);
        setServiceCategories(allServiceCats);
      } catch {
        // silent
      }
    };

    loadCategories();
    // Re-fetch every 30s so new categories appear automatically
    const interval = setInterval(loadCategories, 30000);
    return () => clearInterval(interval);
  }, []);

  // Derived stats sorted newest first
  const sortLatestBookingsFirst = (list: any[]) => {
    return [...list].sort((a, b) => new Date(b.createdAt || b.datetime || 0).getTime() - new Date(a.createdAt || a.datetime || 0).getTime());
  };

  const completedBookings = sortLatestBookingsFirst(bookings.filter((b) => b.status === "completed"));
  const upcomingBookings = sortLatestBookingsFirst(bookings.filter((b) => !["completed", "cancelled", "rejected"].includes(b.status)));
  const totalSpent = completedBookings.reduce((s: number, b: any) => s + (b.price || 0), 0);

  const displayBookings = sortLatestBookingsFirst(tab === "all" ? bookings : tab === "upcoming" ? upcomingBookings : completedBookings);


  return (
    <CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-muted-foreground text-lg sm:text-xl">{t("welcome_back")},</span>
                <span className="font-display text-xl sm:text-3xl font-bold text-gradient">
                  {user?.name || 'Customer'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground hidden sm:block">{t("track_bookings")}</p>
            </div>
            
            {/* Search Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 sm:gap-2 md:flex-shrink-0"
            >
              {/* Location Search */}
              <div className="relative hidden sm:block sm:w-[160px]">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("location_placeholder")}
                  value={locationQuery}
                  maxLength={100}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(e); } }}
                  className="border-border bg-secondary pl-10 w-full"
                />
              </div>
              
              {/* Main Search */}
              <form onSubmit={handleSearch} className="relative flex-1 sm:w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("search_events_services")}
                  value={searchQuery}
                  maxLength={100}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border bg-secondary pl-9 w-full pr-16 h-9 text-sm"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                >
                  {t("search")}
                </Button>
              </form>
            </motion.div>
          </motion.div>

          {/* Search Results Section */}
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" /> 
                  {t("search_results")}
                  <span className="text-muted-foreground text-lg font-normal">
                    ({filteredEvents.length} {t("events_count")}, {filteredServices.length} {t("services_count")})
                  </span>
                </h2>
                <Button onClick={clearSearch} variant="outline" size="sm">
                  {t("clear_search")} ✕
                </Button>
              </div>

              {searchLoading ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                  <p>{t("searching")}</p>
                </div>
              ) : filteredEvents.length === 0 && filteredServices.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-semibold">{t("no_results")}</p>
                  <p className="text-sm mt-2">{t("no_results_hint")}</p>
                </div>
              ) : (
                <>
                  {/* Filtered Events */}
                  {filteredEvents.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-primary" /> {t("events_count")} ({filteredEvents.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredEvents.map((event, idx) => (
                          <motion.div
                            key={event._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <EventCard event={event} index={idx} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtered Services */}
                  {filteredServices.length > 0 && (
                    <div>
                      <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" /> {t("services_count")} ({filteredServices.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredServices.map((service, idx) => (
                          <motion.div
                            key={service._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                          >
                            <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
                              {service.image ? (
                                <img
                                  src={service.image.startsWith("http") ? service.image : `${API_URL}${service.image}`}
                                  alt={service.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <Clock className="h-12 w-12 opacity-20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                From {formatCurrency(service.price)}
                              </span>
                            </div>
                            <div className="p-2 sm:p-5 flex flex-col flex-1">
                              <h3 className="font-semibold text-xs sm:text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {service.name}
                              </h3>
                              {/* Rating display */}
                              {service.averageRating && service.averageRating > 0 ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                                  <span className="text-xs font-semibold">
                                    {service.averageRating.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({service.ratingCount || 0})
                                  </span>
                                </div>
                              ) : null}
                              {service.highlights?.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                  {service.highlights.slice(0, 2).map((h: string, hi: number) => (
                                    <li key={hi} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                      {h}
                                    </li>
                                  ))}
                                  {service.highlights.length > 2 && (
                                    <li className="text-xs text-primary font-medium pl-3">+{service.highlights.length - 2} more</li>
                                  )}
                                </ul>
                              )}
                              <div className="flex-1" />
                              <div className="mt-2 sm:mt-5 flex flex-col gap-1.5 sm:gap-2">
                                <Link to={`/customer-dashboard/services/${service._id}`}>
                                  <button className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold border border-primary text-primary hover:bg-primary/10 transition-all">
                                    View Details
                                  </button>
                                </Link>
                                <Link to={`/customer-dashboard/services/${service._id}`}>
                                  <button className="w-full rounded-lg py-2 text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                                    {t("book_now")}
                                  </button>
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Category Sections */}
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
            {/* Event Categories */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Event Categories
                </h3>
                <Link to="/customer-dashboard/browse-events">
                  <Button size="sm" variant="ghost" className="text-sm gap-1 text-primary">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {eventCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No event categories yet.</p>
                ) : (
                  eventCategories.map(cat => (
                    <Link key={cat} to={`/customer-dashboard/browse-events?category=${encodeURIComponent(cat)}`}>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                        🎫 {cat}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>

            {/* Service Categories */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-orange-500" /> Service Categories
                </h3>
                <Link to="/customer-dashboard/browse-services">
                  <Button size="sm" variant="ghost" className="text-sm gap-1 text-orange-500">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {serviceCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No service categories yet.</p>
                ) : (
                  serviceCategories.map(cat => (
                    <Link key={cat} to={`/customer-dashboard/browse-services?category=${encodeURIComponent(cat)}`}>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-500/20 transition-colors cursor-pointer">
                        🛠️ {cat}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Recent Bookings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 sm:mt-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm sm:text-xl font-bold flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-primary" /> {t("recent_bookings")}
              </h2>
              <Link to="/my-requests">
                <Button size="sm" variant="outline" className="h-7 text-xs px-2">{t("view_all")}</Button>
              </Link>
            </div>

            {loading ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
              <p>{t("loading_bookings")}</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{t("no_bookings")}</p>
                <Link to="/customer-dashboard/browse-events" className="mt-3 inline-block">
                  <Button size="sm" variant="outline">{t("browse_events")}</Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-border">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b._id} className="p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{b.event?.title || b.serviceName}</p>
                        {b.event && <span className="text-[10px] text-primary">🎫 Event</span>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(b.datetime).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-bold">{formatCurrency(b.price)}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">{t("service_event")}</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">{t("price")}</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">{t("date")}</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">{t("status")}</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map((b, idx) => (
                      <tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-3 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium max-w-[140px]">
                          <div className="truncate">{b.event?.title || b.serviceName}</div>
                          {b.event && <span className="block text-xs text-primary mt-0.5">🎫 {t("event_label")}</span>}
                        </td>
                        <td className="px-3 py-3 font-semibold whitespace-nowrap">{formatCurrency(b.price)}</td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                          <div className="text-xs">{new Date(b.datetime).toLocaleDateString()}</div>
                          <div className="text-xs">{new Date(b.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize whitespace-nowrap ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            {/* 1. Invoice */}
                            {((b.event && (b.status === "confirmed" || b.status === "paid" || b.status === "completed")) ||
                              (!b.event && b.status === "completed")) && (
                              <Button size="sm" variant="outline"
                                className="gap-1 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                                onClick={() => downloadInvoice(b)}>
                                <FileText className="h-3.5 w-3.5" /> Invoice
                              </Button>
                            )}

                            {/* 2. Ticket — event bookings */}
                            {(b.status === "confirmed" || b.status === "completed") && b.ticketId && b.event && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const eventImage = b.event?.image ?
                                      (b.event.image.startsWith('http') ? b.event.image : `${API_URL}${b.event.image}`) :
                                      '';

                                    const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Poppins', sans-serif; background: #f5f5f5; padding: 20px; }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .ticket-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .ticket-header h1 { font-size: 28px; margin-bottom: 10px; }
    .ticket-header p { font-size: 14px; opacity: 0.9; }
    .event-image {
      width: 100%;
      height: 250px;
      object-fit: cover;
      background: #f0f0f0;
    }
    .ticket-body { padding: 30px; }
    .event-name {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 20px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .detail-label { font-weight: bold; color: #667eea; font-size: 14px; }
    .detail-value { color: #333; font-size: 14px; font-weight: 500; }
    .ticket-footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 2px dashed #ddd;
    }
    .ticket-id {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      color: #764ba2;
      letter-spacing: 2px;
      margin-bottom: 20px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      text-transform: uppercase;
    }
    .qr-section {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .qr-section img {
      width: 160px;
      height: 160px;
      border: 3px solid #667eea;
      border-radius: 12px;
      padding: 6px;
      background: white;
    }
    .qr-label {
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 EVENT TICKET</h1>
      <p>JoyEvents</p>
    </div>
    ${eventImage ? `<img src="${eventImage}" alt="Event" class="event-image" onerror="this.style.display='none'">` : ''}
    <div class="ticket-body">
      <div class="event-name">${b.event?.title || b.serviceName}</div>
      <div class="detail-row">
        <span class="detail-label">📅 Date</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🕐 Time</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      ${b.event?.location ? `
      <div class="detail-row">
        <span class="detail-label">📍 Location</span>
        <span class="detail-value">${b.event.location}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">💰 Price Paid</span>
        <span class="detail-value">${formatCurrency(b.price)}</span>
      </div>
      ${b.assignedTo?.name ? `
      <div class="detail-row">
        <span class="detail-label">👤 Merchant</span>
        <span class="detail-value">${b.assignedTo.name}</span>
      </div>` : ''}
      <div style="text-align: center; margin-top: 20px;">
        <span class="status-badge">✓ ${b.status.toUpperCase()}</span>
      </div>
      ${b.event?.category ? `
      <div style="margin-top: 15px; padding: 10px; background: #eef2ff; border-radius: 8px; text-align: center;">
        <span style="color: #667eea; font-size: 12px; font-weight: bold;">🎭 ${b.event.category}</span>
      </div>` : ''}
    </div>
    <div class="ticket-footer">
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">Ticket ID</div>
      <div class="ticket-id">${b.ticketId}</div>
      <div class="qr-section">
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(b.ticketId + '|' + (b.event?.title || b.serviceName) + '|' + b.price)}"
          alt="QR Code"
          onerror="this.outerHTML='<div style=\'padding:20px;border:2px dashed #667eea;border-radius:8px;color:#999;font-size:12px;\'>QR Code (requires internet)</div>'"
        />
        <div class="qr-label">📱 Scan to verify ticket at entrance</div>
      </div>
      <div style="margin-top: 15px; font-size: 11px; color: #999;">
        This is a digitally generated ticket. No signature required.
      </div>
    </div>
  </div>
</body>
</html>
                                    `;

                                    const blob = new Blob([ticketHTML], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `ticket-${b.ticketId}.html`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success("Ticket downloaded!");
                                  } catch (error) {
                                    toast.error("Failed to generate ticket");
                                  }
                                }}
                              >
                                📥 {t("ticket")}
                              </Button>
                            )}

                            {/* 3. Rate */}
                            {((b.event && (b.status === "confirmed" || b.status === "paid" || b.status === "completed")) ||
                              (!b.event && b.status === "completed")) && (
                              <Button size="sm" variant={b.rating?.score ? "default" : "outline"}
                                className={`gap-1 ${b.rating?.score ? "bg-gradient-primary text-primary-foreground" : ""}`}
                                onClick={() => openRatingModal(b)}>
                                <Star className="h-3.5 w-3.5" />
                                {b.rating?.score ? `${b.rating.score}/5` : "Rate"}
                              </Button>
                            )}

                            {/* 4. Map */}
                            {b.event?.location && (
                              <Button size="sm" variant="ghost"
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`, '_blank')}>
                                📍 {t("map")}
                              </Button>
                            )}

                            {/* 5. Pay Now */}
                            {(b.status === "awaiting_payment" || b.status === "awaiting_final_payment") && !b.event && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold gap-1" onClick={() => openPaymentModal(b)}>
                                <CreditCard className="h-3.5 w-3.5" />
                                {b.status === "awaiting_final_payment" ? `Pay ${formatCurrency(b.remainingAmount)}` : b.paymentType === "advance" ? `Pay ${formatCurrency(b.advanceAmount)}` : "Pay Now"}
                              </Button>
                            )}

                            {/* Cancel Booking option */}
                            {!["completed", "cancelled", "rejected", "refunded", "cancellation_requested", "cancellation_fee_proposed", "refund_pending"].includes(b.status) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                onClick={() => handleRequestCancel(b._id)}
                                disabled={cancellingId === b._id}
                              >
                                {cancellingId === b._id ? "Processing..." : "Cancel"}
                              </Button>
                            )}

                            {/* Accept Proposed Fee */}
                            {b.status === "cancellation_fee_proposed" && (
                              <div className="flex flex-col gap-1 p-1.5 border border-indigo-500/20 bg-indigo-500/5 rounded-lg mt-1 w-full max-w-[150px]">
                                <p className="text-[10px] font-semibold text-indigo-400">
                                  Fee: {formatCurrency(b.cancellationFee || 0)}
                                </p>
                                <Button
                                  size="sm"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-0.5 h-6 text-[10px]"
                                  onClick={() => handleAcceptCancellationFee(b._id)}
                                  disabled={cancellingId === b._id}
                                >
                                  {cancellingId === b._id ? "..." : "Accept Fee"}
                                </Button>
                              </div>
                            )}

                            {/* Cancellation helpers */}
                            {b.status === "cancellation_requested" && (
                              <span className="text-[10px] font-medium text-amber-500 italic block mt-1">
                                Cancel requested...
                              </span>
                            )}
                            {b.status === "refund_pending" && (
                              <span className="text-[10px] font-medium text-purple-400 italic block mt-1">
                                Refund pending...
                              </span>
                            )}
                            {b.status === "refunded" && (
                              <span className="text-[10px] font-medium text-emerald-500 italic block mt-1">
                                Refunded {formatCurrency(b.refundAmount || 0)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>{/* end hidden sm:block */}
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-5">
            <StatCard title={t("total_bookings")} value={loading ? "…" : bookings.length} icon={<Ticket className="h-5 w-5" />} index={0} />
            <StatCard title={t("upcoming")} value={loading ? "…" : upcomingBookings.length} icon={<Calendar className="h-5 w-5" />} index={1} />
            <StatCard title={t("completed")} value={loading ? "…" : completedBookings.length} icon={<CheckCircle2 className="h-5 w-5" />} index={2} />
            <StatCard title={t("total_spent")} value={loading ? "…" : `${formatCurrency(totalSpent)}`} icon={<DollarSign className="h-5 w-5" />} index={3} />
            
            {/* Wallet Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-4 flex flex-col justify-between hover:shadow-lg transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[10px] sm:text-xs">Wallet Balance</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-base sm:text-xl font-bold font-display text-gradient truncate">
                  {loading ? "…" : formatCurrency(user?.walletBalance || 0)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWithdrawModal(true)}
                disabled={loading || !user?.walletBalance || user.walletBalance <= 0}
                className="mt-3 w-full border-primary/40 text-primary hover:bg-primary/10 h-7 text-[10px] sm:text-xs font-bold"
              >
                Withdraw
              </Button>
            </motion.div>
          </div>

          {/* Live Events Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <Video className="h-5 w-5 text-red-500" />
                🔴 {t("live_events")}
              </h2>
              <Link to="/customer-dashboard/browse-events">
                <Button size="sm" variant="outline">{t("view_all_events")}</Button>
              </Link>
            </div>

            {liveLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> {t("searching")}
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{t("no_results")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {liveEvents.map((event, idx) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                  >
                    <EventCard event={event} index={idx} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Booking History with tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 sm:mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> My Bookings
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setTab("all")}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${tab === "all" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  All ({bookings.length})
                </button>
                <button
                  onClick={() => setTab("upcoming")}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${tab === "upcoming" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Upcoming ({upcomingBookings.length})
                </button>
                <button
                  onClick={() => setTab("completed")}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${tab === "completed" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Done ({completedBookings.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : displayBookings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                {tab === "all" ? t("no_bookings") : tab === "upcoming" ? t("no_bookings") : t("no_bookings")}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("service_event")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("price")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("date")} & {t("time")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("location")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("assigned")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayBookings.slice(0, 5).map((b, idx) => (
                      <tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          {b.event?.title || b.serviceName}
                          {b.event && (
                            <span className="block text-xs text-primary mt-1">🎫 {t("event_label")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>
                            <div>{new Date(b.datetime).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(b.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {b.event?.location ? (
                            <div>
                              <div className="font-medium text-foreground text-sm">{b.event.location}</div>
                              <button
                                onClick={() => {
                                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`;
                                  window.open(mapsUrl, '_blank');
                                }}
                                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                              >
                                📍 Get Directions
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Location TBA</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {b.assignedTo ? (
                            <span>
                              <span className="font-medium text-foreground">{b.assignedTo.name}</span>
                              <span className="block text-xs text-muted-foreground">{b.assignedTo.email}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Not assigned yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {/* Download Ticket Button - Only for confirmed/approved bookings for Events */}
                            {(b.status === "confirmed" || b.status === "completed") && b.ticketId && b.event && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    // Generate HTML ticket with event image
                                    const eventImage = b.event?.image ?
                                      (b.event.image.startsWith('http') ? b.event.image : `${API_URL}${b.event.image}`) :
                                      '';

                                    const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Poppins', sans-serif; background: #f5f5f5; padding: 20px; }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .ticket-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .ticket-header h1 { font-size: 28px; margin-bottom: 10px; }
    .ticket-header p { font-size: 14px; opacity: 0.9; }
    .event-image { width: 100%; height: 250px; object-fit: cover; background: #f0f0f0; }
    .ticket-body { padding: 30px; }
    .event-name {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 20px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .detail-label { font-weight: bold; color: #667eea; font-size: 14px; }
    .detail-value { color: #333; font-size: 14px; font-weight: 500; }
    .ticket-footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 2px dashed #ddd;
    }
    .ticket-id {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      color: #764ba2;
      letter-spacing: 2px;
      margin-bottom: 20px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      text-transform: uppercase;
    }
    .qr-section {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .qr-section img {
      width: 160px;
      height: 160px;
      border: 3px solid #667eea;
      border-radius: 12px;
      padding: 6px;
      background: white;
    }
    .qr-label { font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 EVENT TICKET</h1>
      <p>JoyEvents</p>
    </div>
    ${eventImage ? `<img src="${eventImage}" alt="Event" class="event-image" onerror="this.style.display='none'">` : ''}
    <div class="ticket-body">
      <div class="event-name">${b.event?.title || b.serviceName}</div>
      <div class="detail-row">
        <span class="detail-label">📅 Date</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🕐 Time</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      ${b.event?.location ? `
      <div class="detail-row">
        <span class="detail-label">📍 Location</span>
        <span class="detail-value">${b.event.location}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">💰 Price Paid</span>
        <span class="detail-value">${formatCurrency(b.price)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">👤 Merchant</span>
        <span class="detail-value">${b.assignedTo?.name || 'TBA'}</span>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <span class="status-badge">✓ ${b.status.toUpperCase()}</span>
      </div>
      ${b.event?.category ? `
      <div style="margin-top: 15px; padding: 10px; background: #eef2ff; border-radius: 8px; text-align: center;">
        <span style="color: #667eea; font-size: 12px; font-weight: bold;">🎭 ${b.event.category}</span>
      </div>` : ''}
    </div>
    <div class="ticket-footer">
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">Ticket ID</div>
      <div class="ticket-id">${b.ticketId}</div>
      <div class="qr-section">
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(b.ticketId + '|' + (b.event?.title || b.serviceName) + '|' + b.price)}"
          alt="QR Code"
          onerror="this.outerHTML='<div style=\'padding:20px;border:2px dashed #667eea;border-radius:8px;color:#999;font-size:12px;\'>QR Code (requires internet)</div>'"
        />
        <div class="qr-label">📱 Scan to verify ticket at entrance</div>
      </div>
      <div style="margin-top: 15px; font-size: 11px; color: #999;">
        This is a digitally generated ticket. No signature required.
      </div>
    </div>
  </div>
</body>
</html>
                                    `;

                                    // Create blob and download
                                    const blob = new Blob([ticketHTML], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `ticket-${b.ticketId}.html`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success("Ticket downloaded! Open the HTML file to view your beautiful ticket.");
                                  } catch (error) {
                                    toast.error("Failed to generate ticket");
                                  }
                                }}
                              >
                                📥 {t("ticket")}
                              </Button>
                            )}

                            {/* View Location Button - For event bookings */}
                            {b.event?.location && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`;
                                  window.open(mapsUrl, '_blank');
                                }}
                              >
                                📍 {t("map")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
            {displayBookings.length > 5 && (
              <div className="mt-3 text-center">
                <Link to="/my-requests">
                  <Button variant="outline" size="sm" className="gap-2">
                    View All {displayBookings.length} Bookings <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Book a Service */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 sm:mt-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
                <Clock className="h-5 w-5 text-primary" /> Book a Service
              </h2>
              <Link to="/customer-dashboard/browse-services">
                <Button size="sm" variant="outline">View All Services</Button>
              </Link>
            </div>
            {servicesLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No services available at the moment.</p>
                <Link to="/customer-dashboard/browse-services" className="mt-3 inline-block">
                  <Button size="sm" variant="outline">Browse Services</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {services.map((svc, idx) => (
                  <motion.div
                    key={svc._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                  >
                    <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-52">
                      {svc.image ? (
                        <img
                          src={svc.image.startsWith("http") ? svc.image : `${API_URL}${svc.image}`}
                          alt={svc.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Clock className="h-12 w-12 opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        From {formatCurrency(svc.price)}
                      </span>
                    </div>
                    <div className="p-2 sm:p-5 flex flex-col flex-1">
                      <h3 className="font-semibold text-xs sm:text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {svc.name}
                      </h3>
                       {/* Rating display */}
                       {svc.averageRating && svc.averageRating > 0 ? (
                         <div className="flex items-center gap-1 mt-1">
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
                        <ul className="mt-3 space-y-1">
                          {svc.highlights.slice(0, 2).map((h: string, hi: number) => (
                            <li key={hi} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              {h}
                            </li>
                          ))}
                          {svc.highlights.length > 2 && (
                            <li className="text-xs text-primary font-medium pl-3">+{svc.highlights.length - 2} more</li>
                          )}
                        </ul>
                      )}
                      <div className="flex-1" />
                      <div className="mt-2 sm:mt-5 flex flex-col gap-1.5 sm:gap-2">
                        <Link to={`/customer-dashboard/services/${svc._id}`}>
                          <button className="w-full rounded-lg py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold border border-primary text-primary hover:bg-primary/10 transition-all">
                            View Details
                          </button>
                        </Link>
                        <Link to={`/customer-dashboard/services/${svc._id}`}>
                          <button className="w-full rounded-lg py-2 text-sm font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                            Book Now
                          </button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && paymentBooking && (
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            <SimplePayment
              amount={paymentBooking.status === "awaiting_final_payment" ? paymentBooking.remainingAmount : (paymentBooking.paymentType === "advance" ? paymentBooking.advanceAmount : paymentBooking.price)}
              bookingId={paymentBooking._id}
              bookingData={{
                serviceName: paymentBooking.serviceName || paymentBooking.event?.title,
                date: new Date(paymentBooking.datetime).toISOString().split("T")[0],
                time: new Date(paymentBooking.datetime).toTimeString().slice(0, 5),
                paymentType: paymentBooking.status === "awaiting_final_payment" ? "remaining" : paymentBooking.paymentType || "full",
              }}
              onSuccess={() => {
                setShowPaymentModal(false);
                setPaymentBooking(null);
                const loadBookings = async () => {
                  const res = await apiMyBookings(token);
                  setBookings(res.bookings || []);
                };
                loadBookings();
                toast.success("Payment successful!");
              }}
              onError={() => {}}
              onClose={() => setShowPaymentModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Rating Modal */}
      <Dialog open={ratingModal} onOpenChange={setRatingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Rate Your Experience
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{selectedBooking?.event?.title || selectedBooking?.serviceName}</p>
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRatingScore(s)}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= ratingScore ? "opacity-100" : "opacity-30"}`}>
                    ⭐
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground self-center">{ratingScore}/5</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Comment (optional)</p>
                <span className="text-[10px] text-muted-foreground">{(ratingComment || "").length}/500</span>
              </div>
              <Textarea
                placeholder="Share your experience..."
                value={ratingComment}
                maxLength={500}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRatingModal(false)}>Cancel</Button>
              <Button onClick={handleSubmitRating} disabled={submittingRating}
                className="bg-gradient-primary text-primary-foreground">
                {submittingRating ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Balance Modal */}
      <Dialog open={withdrawModal} onOpenChange={setWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Withdraw Wallet Balance
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Available Wallet Balance: <span className="font-bold text-primary">{formatCurrency(user?.walletBalance || 0)}</span>
              </p>
              <label className="text-xs font-semibold block mb-1">Amount to Withdraw</label>
              <Input
                type="number"
                min="1"
                max={user?.walletBalance || 0}
                step="any"
                placeholder="Enter amount..."
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                required
                className="bg-secondary border-border w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5">Withdrawal Method</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="withdrawMethod"
                    checked={withdrawMethod === "upi"}
                    onChange={() => setWithdrawMethod("upi")}
                    className="accent-primary"
                  />
                  UPI Transfer
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="withdrawMethod"
                    checked={withdrawMethod === "bank"}
                    onChange={() => setWithdrawMethod("bank")}
                    className="accent-primary"
                  />
                  Bank Transfer
                </label>
              </div>
            </div>

            {withdrawMethod === "upi" ? (
              <div>
                <label className="text-xs font-semibold block mb-1">UPI ID</label>
                <Input
                  type="text"
                  placeholder="e.g. user@okaxis"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  required
                  className="bg-secondary border-border w-full"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Bank Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    required
                    className="bg-secondary border-border w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Account Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. 50100234567890"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    required
                    className="bg-secondary border-border w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">IFSC Code</label>
                  <Input
                    type="text"
                    placeholder="e.g. HDFC0000060"
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value)}
                    required
                    className="bg-secondary border-border w-full"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setWithdrawModal(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (user?.walletBalance || 0)}
                className="bg-gradient-primary text-primary-foreground font-bold"
              >
                {withdrawing ? "Processing..." : "Process Withdrawal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </CustomerLayout>
  );
};

export default UserDashboard;


