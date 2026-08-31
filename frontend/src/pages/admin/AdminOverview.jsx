import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { 
  Clock, CheckCircle2, IndianRupee, AlertCircle, Loader2, MapPin, Video, 
  CalendarCheck, FileText, AlertTriangle, TrendingUp, Users, Calendar, 
  Sparkles, ArrowRight, ShieldCheck, Tag, Star, Activity, LayoutDashboard, Ticket, Store, ExternalLink
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  apiListBookings, apiListUsers, apiListEvents, apiGetNotifications, 
  apiGetTickets, apiSendMerchantQuotation, apiActivateMerchant, 
  apiSendTicketQuotation, apiApproveTicket 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EventCard from "@/components/EventCard";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";

// Color-coded KPI tile accents — calibrated palette
const TILE_ACCENTS = {
    indigo: { 
        bg: "bg-indigo-500/5 dark:bg-indigo-500/10", 
        border: "border-indigo-500/20 hover:border-indigo-500/40", 
        icon: "bg-indigo-600 text-white shadow-indigo-500/20", 
        text: "text-indigo-600 dark:text-indigo-400",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20"
    },
    amber: { 
        bg: "bg-amber-500/5 dark:bg-amber-500/10", 
        border: "border-amber-500/20 hover:border-amber-500/40", 
        icon: "bg-amber-600 text-white shadow-amber-500/20", 
        text: "text-amber-600 dark:text-amber-400",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20"
    },
    rose: { 
        bg: "bg-rose-500/5 dark:bg-rose-500/10", 
        border: "border-rose-500/20 hover:border-rose-500/40", 
        icon: "bg-rose-600 text-white shadow-rose-500/20", 
        text: "text-rose-600 dark:text-rose-400",
        badge: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20"
    },
    violet: { 
        bg: "bg-violet-500/5 dark:bg-violet-500/10", 
        border: "border-violet-500/20 hover:border-violet-500/40", 
        icon: "bg-violet-600 text-white shadow-violet-500/20", 
        text: "text-violet-600 dark:text-violet-400",
        badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20"
    },
};

const KpiTile = ({ title, value, subtitle, icon, accent = "indigo", index = 0, to }) => {
    const a = TILE_ACCENTS[accent] || TILE_ACCENTS.indigo;
    const navigate = useNavigate();
    return (
      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.15 }} 
        transition={{ delay: index * 0.05, duration: 0.35 }} 
        onClick={to ? () => navigate(to) : undefined} 
        role={to ? "button" : undefined} 
        tabIndex={to ? 0 : undefined} 
        onKeyDown={to ? (e) => { if (e.key === "Enter" || e.key === " ") navigate(to); } : undefined} 
        className={`group relative rounded-2xl border ${a.border} ${a.bg} p-4 sm:p-5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 ${to ? "cursor-pointer hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
            <p className={`mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight ${a.text}`}>{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">{subtitle}</p>}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.icon} shadow-md group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
          <span className="font-medium">View details</span>
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"/>
        </div>
      </motion.div>
    );
};

const AdminOverview = () => {
    const { token, user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [tickets, setTickets] = useState([]);
    const [requestTab, setRequestTab] = useState("registrations");

    // Onboarding action states
    const [selectedMerchantDetails, setSelectedMerchantDetails] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedMerchantForQuote, setSelectedMerchantForQuote] = useState(null);
    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [sendingQuote, setSendingQuote] = useState(false);
    const [selectedMerchantForActivation, setSelectedMerchantForActivation] = useState(null);
    const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
    const [maxEvents, setMaxEvents] = useState("5");
    const [maxServices, setMaxServices] = useState("5");
    const [activatingMerchant, setActivatingMerchant] = useState(false);

    // Tickets action states
    const [selectedTicketForQuote, setSelectedTicketForQuote] = useState(null);
    const [isTicketQuoteDialogOpen, setIsTicketQuoteDialogOpen] = useState(false);
    const [ticketQuoteAmount, setTicketQuoteAmount] = useState("");
    const [sendingTicketQuote, setSendingTicketQuote] = useState(false);

    const loadData = async () => {
        if (!token)
            return;
        try {
            const [bookingRes, usersRes, eventsRes, notificationsRes, ticketsRes] = await Promise.all([
                apiListBookings(undefined, token),
                apiListUsers(token),
                apiListEvents(token),
                apiGetNotifications(token, { limit: 10 }),
                apiGetTickets(token).catch(() => ({ tickets: [] }))
            ]);

            const allBookingsList = (bookingRes.bookings || []).sort((a, b) => {
                const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
                const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
                return dateB - dateA;
            });
            setBookings(allBookingsList);
            setAllBookings(allBookingsList);
            const users = usersRes.users || [];
            setAllUsers(users);
            setMerchants(users
                .filter((u) => u.role === "merchant")
                .map((u) => ({ id: u._id, name: u.name, email: u.email })));
            
            setNotifications(notificationsRes.notifications || []);
            setUnreadCount(notificationsRes.unreadCount || 0);
            setEvents(eventsRes.events || []);
            setTickets(ticketsRes.tickets || []);
            
            const allEvents = eventsRes.events || [];
            const live = allEvents.filter((e) => e.live === true);
            setLiveEvents(live);
        }
        catch (e) {
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [token]);
    useRealtimeRefresh([
        "analytics",
        "auth",
        "bookings",
        "categories",
        "earnings",
        "events",
        "marketing",
        "merchant",
        "notifications",
        "referrals",
        "services",
        "settings"
    ], loadData);

    // Real-time polling - refresh data every 5 seconds
    useEffect(() => {
        if (!token)
            return;
        const pollInterval = setInterval(() => {
            loadData();
        }, 5000);
        return () => clearInterval(pollInterval);
    }, [token]);

    const handleSendQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedMerchantForQuote)
            return;
        const amt = Number(quoteAmount);
        if (isNaN(amt) || amt < 1 || amt > 1000000) {
            toast.error("Quotation amount must be a number between 1 and 1,000,000.");
            return;
        }
        setSendingQuote(true);
        try {
            await apiSendMerchantQuotation(selectedMerchantForQuote._id, amt, token);
            toast.success("Onboarding quotation sent to merchant!");
            setIsQuoteDialogOpen(false);
            setSelectedMerchantForQuote(null);
            setQuoteAmount("");
            loadData();
        }
        catch (err) {
            toast.error(err?.message || "Failed to send quotation");
        }
        finally {
            setSendingQuote(false);
        }
    };

    const handleActivateMerchantSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedMerchantForActivation)
            return;
        const maxEv = Number(maxEvents);
        const maxSe = Number(maxServices);
        if (isNaN(maxEv) || maxEv < 1 || maxEv > 1000 || isNaN(maxSe) || maxSe < 1 || maxSe > 1000) {
            toast.error("Limits must be numbers between 1 and 1000.");
            return;
        }
        setActivatingMerchant(true);
        try {
            await apiActivateMerchant(selectedMerchantForActivation._id, {
                maxEvents: maxEv,
                maxServices: maxSe
            }, token);
            toast.success("Merchant activated and slot limits set successfully!");
            setIsActivationDialogOpen(false);
            setSelectedMerchantForActivation(null);
            loadData();
        }
        catch (err) {
            toast.error(err?.message || "Failed to activate merchant");
        }
        finally {
            setActivatingMerchant(false);
        }
    };

    const handleSendTicketQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedTicketForQuote)
            return;
        const amt = Number(ticketQuoteAmount);
        if (isNaN(amt) || amt < 1 || amt > 1000000) {
            toast.error("Quotation amount must be a number between 1 and 1,000,000.");
            return;
        }
        setSendingTicketQuote(true);
        try {
            await apiSendTicketQuotation(selectedTicketForQuote._id, amt, token);
            toast.success("Limit upgrade quotation sent to merchant!");
            setIsTicketQuoteDialogOpen(false);
            setSelectedTicketForQuote(null);
            setTicketQuoteAmount("");
            loadData();
        }
        catch (err) {
            toast.error(err?.message || "Failed to send ticket quotation");
        }
        finally {
            setSendingTicketQuote(false);
        }
    };

    const handleApproveTicketClick = async (ticketId) => {
        if (!token)
            return;
        if (!window.confirm("Are you sure you want to approve this ticket and upgrade slot limits?"))
            return;
        try {
            await apiApproveTicket(ticketId, token);
            toast.success("Ticket approved and slot limits upgraded successfully!");
            loadData();
        }
        catch (err) {
            toast.error(err?.message || "Failed to approve ticket");
        }
    };

    const registrationRequests = allUsers.filter((u) => u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid"));
    const upgradeRequests = tickets.filter((t) => t.status === "pending" || t.status === "paid");
    
    const isToday = (dateStr) => {
        if (!dateStr)
            return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    };
    const todaysBookings = allBookings.filter((b) => isToday(b.createdAt || b.datetime));

    // Summary Calculations
    const activeMerchantsCount = allUsers.filter(u => u.role === "merchant" && u.merchantStatus === "active").length;
    const todaysRevenue = todaysBookings
        .filter(b => b.paymentStatus === "paid" || b.status === "completed")
        .reduce((sum, b) => sum + (b.price || 0), 0);

    const currentDateFormatted = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    return (
      <AdminLayout>
        <div className="w-full min-w-0 space-y-6 font-sans">
          
          {/* Header Banner - Clean White Hero Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }} 
            className="relative overflow-hidden rounded-3xl bg-card border border-border p-6 sm:p-8 text-foreground shadow-sm"
          >
            {/* Background Ambient Glow Gradients */}
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Operational
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {currentDateFormatted}
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Welcome back, <span className="text-gradient">{user?.name || "Admin"}</span>
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-xl">
                  Real-time platform dashboard. Manage bookings, monitor live streams, and review active merchants.
                </p>
              </div>

              {/* Header Quick Actions */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <Link to="/admin-dashboard/users">
                  <Button size="sm" variant="outline" className="bg-card hover:bg-secondary text-foreground border-border text-xs font-semibold shadow-xs">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" /> Merchants
                  </Button>
                </Link>
                <Link to="/admin-dashboard/events">
                  <Button size="sm" variant="outline" className="bg-card hover:bg-secondary text-foreground border-border text-xs font-semibold shadow-xs">
                    <Video className="h-3.5 w-3.5 mr-1.5 text-rose-600 dark:text-rose-400" /> Events
                  </Button>
                </Link>
                <Link to="/admin-dashboard/bookings">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90 border-0 text-xs font-bold shadow-sm">
                    <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Bookings Log
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Platform Health Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Revenue</p>
                <p className="text-lg sm:text-xl font-bold font-display text-foreground truncate">{loading ? "…" : formatCurrency(todaysRevenue)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Merchants</p>
                <p className="text-lg sm:text-xl font-bold font-display text-foreground">{loading ? "…" : activeMerchantsCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Bookings</p>
                <p className="text-lg sm:text-xl font-bold font-display text-foreground">{loading ? "…" : allBookings.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Events</p>
                <p className="text-lg sm:text-xl font-bold font-display text-foreground">{loading ? "…" : events.length}</p>
              </div>
            </div>
          </div>

          {/* Today at a Glance Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" /> Today's Highlights & Pending Actions
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile 
                title="Today's Bookings" 
                value={loading ? "…" : todaysBookings.length} 
                subtitle="Bookings created today"
                icon={<CalendarCheck className="h-5 w-5" />} 
                accent="indigo" 
                index={0} 
                to="/admin-dashboard/bookings?date=today"
              />
              <KpiTile 
                title="Pending Bookings" 
                value={loading ? "…" : bookings.filter((b) => b.status === "pending").length} 
                subtitle="Awaiting merchant approval"
                icon={<Clock className="h-5 w-5" />} 
                accent="amber" 
                index={1} 
                to="/admin-dashboard/bookings?status=pending"
              />
              <KpiTile 
                title="Active Live Events" 
                value={loading ? "…" : liveEvents.length} 
                subtitle="Currently streaming live"
                icon={<Video className="h-5 w-5" />} 
                accent="rose" 
                index={2} 
                to="/admin-dashboard/events?filter=live"
              />
              <KpiTile 
                title="Pending Reviews" 
                value={loading ? "…" : registrationRequests.length + upgradeRequests.length} 
                subtitle="Onboarding & upgrade tickets"
                icon={<AlertTriangle className="h-5 w-5" />} 
                accent="violet" 
                index={3} 
                to="/admin-dashboard/users?tab=registrations"
              />
            </div>
          </div>

          {/* Live Events Showcase Section */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.15 }} 
            transition={{ delay: 0.2 }} 
            className="space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  Live Streamed Events
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                    {liveEvents.length} Active
                  </span>
                </h2>
              </div>
              <Link to="/admin-dashboard/events">
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                  Manage All Events <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 border border-border rounded-2xl bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading live events…
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-30 text-rose-500" />
                <p className="font-medium text-sm">No events are currently broadcasting live.</p>
                <p className="text-xs mt-1">Merchants can mark their ongoing events as live from their dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
                {liveEvents.map((event, idx) => (
                  <motion.div 
                    key={event._id} 
                    initial={{ opacity: 0, y: 16 }} 
                    whileInView={{ opacity: 1, y: 0 }} 
                    viewport={{ once: true, amount: 0.15 }} 
                    transition={{ delay: idx * 0.08 }}
                  >
                    <EventCard event={event} index={idx} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Platform Bookings Log */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.15 }} 
            transition={{ delay: 0.3 }} 
            className="space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Recent Platform Bookings
                </h2>
                <p className="text-xs text-muted-foreground">Latest transactions across all merchants and services</p>
              </div>
              <Link to="/admin-dashboard/bookings">
                <Button size="sm" variant="outline" className="text-xs font-semibold">
                  View Full Bookings Log
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs w-full">
              <DataTable minWidth="100%">
                <TableHeader>
                  <TableHeaderCell className="w-[28%]">Service / Event</TableHeaderCell>
                  <TableHeaderCell className="w-[22%]">Customer</TableHeaderCell>
                  <TableHeaderCell className="w-[20%]">Merchant</TableHeaderCell>
                  <TableHeaderCell className="w-[12%] whitespace-nowrap">Amount</TableHeaderCell>
                  <TableHeaderCell className="w-[10%] whitespace-nowrap">Date</TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[8%]">Status</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {allBookings.slice(0, 5).map((b) => (
                    <TableRow key={b._id}>
                      <TableCell>
                        <div className="truncate max-w-[200px] text-foreground font-semibold text-xs" title={b.service?.name || b.event?.title || b.serviceName || "Booking"}>
                          {b.service?.name || b.event?.title || b.serviceName || "Booking"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{b.customer?.name || "—"}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{b.customer?.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{b.assignedTo?.name || "Unassigned"}</div>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-foreground whitespace-nowrap">
                        {formatCurrency(b.price || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(b.datetime || b.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {allBookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No recent bookings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </DataTable>
            </div>
          </motion.div>

          {/* Dialogs preserved for merchant onboarding, quotes & limits */}
          <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-display">
                  <FileText className="h-5 w-5 text-[#A68C73]"/> Merchant Onboarding Details
                </DialogTitle>
                <DialogDescription>
                  Review details submitted by the merchant for profile approval.
                </DialogDescription>
              </DialogHeader>
              {selectedMerchantDetails && (
                <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Business Name</span>
                      <p className="font-semibold text-base mt-0.5">{selectedMerchantDetails.merchantDetails?.businessName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Experience</span>
                      <p className="font-semibold text-base mt-0.5">{selectedMerchantDetails.merchantDetails?.experienceYears} years</p>
                    </div>
                  </div>

                  <div className="border-b border-border pb-4">
                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3"/> Business Address
                    </span>
                    <p className="mt-0.5">{selectedMerchantDetails.merchantDetails?.address}</p>
                  </div>

                  <div className="border-b border-border pb-4">
                    <span className="text-xs text-muted-foreground font-semibold">Business Description</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                      {selectedMerchantDetails.merchantDetails?.businessDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">Event Categories</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedMerchantDetails.merchantDetails?.eventTypes?.map((t) => (
                          <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-secondary border border-border">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">Service Categories</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedMerchantDetails.merchantDetails?.serviceTypes?.map((t) => (
                          <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-secondary border border-border">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={() => setIsDetailsModalOpen(false)}>Close Details</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Merchant Onboarding Quotation Dialog */}
          <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-display">
                  <IndianRupee className="h-5 w-5 text-[#A68C73]"/> Send Onboarding Quotation
                </DialogTitle>
                <DialogDescription>
                  Set the setup fee amount for this merchant.
                </DialogDescription>
              </DialogHeader>
              {selectedMerchantForQuote && (
                <form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
                  <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                    <p><strong>Merchant:</strong> {selectedMerchantForQuote.name}</p>
                    <p><strong>Email:</strong> {selectedMerchantForQuote.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qAmount">Quotation Amount *</Label>
                    <Input id="qAmount" type="text" required placeholder="e.g. 250" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} className="bg-secondary border-border"/>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={sendingQuote} className="bg-[#A68C73] text-white">
                      {sendingQuote ? "Sending..." : "Send Quote"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Activation / Limits Dialog */}
          <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-display">
                  <CheckCircle2 className="h-5 w-5 text-green-500"/> Configure Merchant Limits
                </DialogTitle>
              </DialogHeader>
              {selectedMerchantForActivation && (
                <form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxEv">Events Limit</Label>
                      <Input id="maxEv" type="text" required value={maxEvents} onChange={(e) => setMaxEvents(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxSe">Services Limit</Label>
                      <Input id="maxSe" type="text" required value={maxServices} onChange={(e) => setMaxServices(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}/>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={activatingMerchant} className="bg-[#A68C73] text-white">
                      {activatingMerchant ? "Activating..." : "Save Limits"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </AdminLayout>
    );
};

export default AdminOverview;
