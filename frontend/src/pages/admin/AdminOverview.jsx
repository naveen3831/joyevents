import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Users, Calendar, Briefcase, History, Clock, CheckCircle, CheckCircle2, DollarSign, X, AlertCircle, Loader2, MapPin, ExternalLink, Video, Bell, Star, ChevronLeft, ChevronRight, FileText, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiListUsers, apiListEvents, apiGetNotifications, apiGetTickets, apiSendMerchantQuotation, apiActivateMerchant, apiSendTicketQuotation, apiApproveTicket } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EventCard from "@/components/EventCard";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const STATUS_BADGE = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    completed: "bg-green-500/15 text-green-400 border border-green-500/30",
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
    const [historyTab, setHistoryTab] = useState("all");
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
    const [bookingsPage, setBookingsPage] = useState(1);
    const [bookingsViewAll, setBookingsViewAll] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyViewAll, setHistoryViewAll] = useState(false);
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
            // Show all bookings using the main bookings endpoint so totals stay aligned with payment statistics.
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
            // Load notifications
            setNotifications(notificationsRes.notifications || []);
            setUnreadCount(notificationsRes.unreadCount || 0);
            setEvents(eventsRes.events || []);
            setTickets(ticketsRes.tickets || []);
            // Filter live events
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
    // Derived stats
    const totalUsers = allUsers.filter((u) => u.role === "user").length;
    const totalMerchants = merchants.length;
    const getPaidAmount = (b) => (b.paymentStatus === "partially_paid" && b.isAdvancePaid) ? (b.advanceAmount || 0) : (b.price || 0);
    const isPaidBooking = (b) => b.paymentStatus === "paid" || b.paymentStatus === "partially_paid";
    // Pending action items and requests
    const registrationRequests = allUsers.filter((u) => u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid"));
    const upgradeRequests = tickets.filter((t) => t.status === "pending" || t.status === "paid");
    const refundRequests = allBookings.filter((b) => b.paymentStatus === "refunded" || b.status === "cancelled" || b.refundReason);
    const totalRevenue = allBookings
        .filter(isPaidBooking)
        .reduce((s, b) => s + getPaidAmount(b), 0);
    const filteredHistory = historyTab === "all"
        ? allBookings
        : allBookings.filter((b) => b.status === historyTab);
    const totalBookingsPages = Math.ceil(bookings.length / 10);
    const currentBookingsPage = Math.max(1, Math.min(bookingsPage, totalBookingsPages || 1));
    const displayedBookings = bookingsViewAll
        ? bookings
        : bookings.slice((currentBookingsPage - 1) * 10, currentBookingsPage * 10);
    const totalHistoryPages = Math.ceil(filteredHistory.length / 10);
    const currentHistoryPage = Math.max(1, Math.min(historyPage, totalHistoryPages || 1));
    const displayedHistory = historyViewAll
        ? filteredHistory
        : filteredHistory.slice((currentHistoryPage - 1) * 10, currentHistoryPage * 10);
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2">
            <span className="text-muted-foreground text-lg">Welcome back,</span>
            <span className="font-display text-xs sm:text-2xl font-bold text-gradient ml-2">
              {user?.name || 'Admin'}
            </span>
          </div>
          <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
            Platform <span className="text-gradient">Overview</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening on your platform.</p>
        </motion.div>

        {/* Stats — Row 1: 4 cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={loading ? "…" : totalUsers.toLocaleString()} icon={<Users className="h-5 w-5"/>} index={0}/>
          <StatCard title="Total Merchants" value={loading ? "…" : totalMerchants} icon={<Briefcase className="h-5 w-5"/>} index={1}/>
          <StatCard title="Total Revenue" value={loading ? "…" : `${formatCurrency(totalRevenue)}`} icon={<DollarSign className="h-5 w-5"/>} index={2}/>
          <StatCard title="Total Events" value={loading ? "…" : events.length} icon={<Calendar className="h-5 w-5"/>} index={3}/>
        </div>

        {/* Stats — Row 2: 4 cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Pending Bookings" value={loading ? "…" : bookings.filter((b) => b.status === "pending").length} icon={<Clock className="h-5 w-5"/>} index={4}/>
          <StatCard title="Assigned Bookings" value={loading ? "…" : allBookings.filter((b) => b.status === "assigned").length} icon={<Briefcase className="h-5 w-5"/>} index={5}/>
          <StatCard title="Completed Bookings" value={loading ? "…" : allBookings.filter((b) => b.status === "completed" || (b.status === "confirmed" && b.paymentStatus === "paid") || b.status === "paid").length} icon={<CheckCircle className="h-5 w-5"/>} index={6}/>
          <StatCard title="Cancelled Bookings" value={loading ? "…" : allBookings.filter((b) => b.status === "cancelled").length} icon={<X className="h-5 w-5"/>} index={7}/>
        </div>

        {/* Stats — Row 3: 3 cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Bookings" value={loading ? "…" : allBookings.length} icon={<CheckCircle className="h-5 w-5"/>} index={8}/>
          <StatCard title="Active Live Events" value={loading ? "…" : liveEvents.length} icon={<Video className="h-5 w-5"/>} index={9}/>
          <StatCard title="Platform Notifications" value={loading ? "…" : unreadCount} icon={<Bell className="h-5 w-5"/>} index={10}/>
        </div>

        {/* Pending Action Items / Requests Area */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-10 animate-in fade-in-50">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500"/> Pending Action Requests
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review and approve registration forms, upgrade tickets, or process refunds.
              </p>
            </div>
            {/* Tabs */}
            <div className="flex bg-secondary/50 p-1 rounded-lg border border-border">
              <button onClick={() => setRequestTab("registrations")} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${requestTab === "registrations"
            ? "bg-[#A68C73] text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"}`}>
                Registrations ({registrationRequests.length})
              </button>
              <button onClick={() => setRequestTab("upgrades")} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${requestTab === "upgrades"
            ? "bg-[#A68C73] text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"}`}>
                Upgrades ({upgradeRequests.length})
              </button>
              <button onClick={() => setRequestTab("refunds")} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${requestTab === "refunds"
            ? "bg-[#A68C73] text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"}`}>
                Refunds ({refundRequests.length})
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {requestTab === "registrations" && (<div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted At</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrationRequests.map((m) => (<tr key={m._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{m.name}</span>
                            <span className="text-xs text-muted-foreground">{m.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{m.merchantDetails?.businessName || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${m.merchantStatus === "paid" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}`}>
                            {m.merchantStatus === "paid" ? "Paid (Awaiting Activation)" : "Review Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {m.merchantDetails?.businessName && (<Button size="sm" variant="outline" className="text-xs h-7 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/5 font-semibold" onClick={() => {
                        setSelectedMerchantDetails(m);
                        setIsDetailsModalOpen(true);
                    }}>
                                <FileText className="h-3.5 w-3.5 mr-1"/> Details
                              </Button>)}
                            
                            {m.merchantStatus === "details_submitted" && (<Button size="sm" variant="outline" className="text-xs h-7 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/5 font-semibold" onClick={() => {
                        setSelectedMerchantForQuote(m);
                        setQuoteAmount("");
                        setIsQuoteDialogOpen(true);
                    }}>
                                <DollarSign className="h-3 w-3 mr-1"/> Send Quote
                              </Button>)}

                            {m.merchantStatus === "paid" && (<Button size="sm" variant="outline" className="text-xs h-7 border-green-500/30 text-green-600 hover:bg-green-500/5 font-semibold" onClick={() => {
                        setSelectedMerchantForActivation(m);
                        setMaxEvents(m.maxEvents?.toString() || "5");
                        setMaxServices(m.maxServices?.toString() || "5");
                        setIsActivationDialogOpen(true);
                    }}>
                                <CheckCircle2 className="h-3 w-3 mr-1"/> Activate
                              </Button>)}
                          </div>
                        </td>
                      </tr>))}
                    {registrationRequests.length === 0 && (<tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No pending registration reviews.
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>)}

            {requestTab === "upgrades" && (<div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested Slots</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested At</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeRequests.map((t) => (<tr key={t._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{t.merchant?.name || "Merchant"}</span>
                            <span className="text-xs text-muted-foreground">{t.merchant?.email || ""}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs font-semibold text-[#A68C73]">
                            <span>+{t.requestedEvents} Events</span>
                            <span>+{t.requestedServices} Services</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${t.status === "paid" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>
                            {t.status === "paid" ? "Paid (Awaiting Approval)" : "Pending Review"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {t.status === "pending" && (<Button size="sm" variant="outline" className="text-xs h-7 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/5 font-semibold" onClick={() => {
                        setSelectedTicketForQuote(t);
                        setTicketQuoteAmount("");
                        setIsTicketQuoteDialogOpen(true);
                    }}>
                                <DollarSign className="h-3 w-3 mr-1"/> Send Quote
                              </Button>)}
                            
                            {t.status === "paid" && (<Button size="sm" variant="outline" className="text-xs h-7 border-green-500/30 text-green-600 hover:bg-green-500/5 font-semibold" onClick={() => handleApproveTicketClick(t._id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1"/> Approve & Upgrade
                              </Button>)}
                          </div>
                        </td>
                      </tr>))}
                    {upgradeRequests.length === 0 && (<tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No pending limit upgrade tickets.
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>)}

            {requestTab === "refunds" && (<div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service/Event</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundRequests.map((b) => (<tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{b.serviceName || b.event}</span>
                            <span className="text-xs text-muted-foreground">Customer: {b.customer?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(b.price)}</td>
                        <td className="px-4 py-3 text-xs italic text-muted-foreground max-w-xs truncate" title={b.refundReason}>
                          {b.refundReason || "Cancelled Booking"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${b.paymentStatus === "refunded" ? "bg-gray-500/10 text-gray-500 border-gray-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                            {b.paymentStatus === "refunded" ? "Refunded" : "Refund Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/admin-dashboard/refunds`}>
                            <Button size="sm" variant="outline" className="text-xs h-7 border-[#A68C73]/40 text-[#A68C73] hover:bg-[#A68C73]/5">
                              Process Refund
                            </Button>
                          </Link>
                        </td>
                      </tr>))}
                    {refundRequests.length === 0 && (<tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No pending refunds.
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>)}
          </div>
        </motion.div>

        {/* All Bookings Table - Admin View Only */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-xl font-bold">All Bookings — Status Overview</h2>
            {bookings.length > 10 && (<Button size="sm" variant="outline" className="text-xs h-7 px-3 rounded-full" onClick={() => setBookingsViewAll(!bookingsViewAll)}>
                {bookingsViewAll ? "View Paginated" : "View All"}
              </Button>)}
          </div>

          {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading…
            </div>) : bookings.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 opacity-40"/>
              No bookings at the moment.
            </div>) : (<>
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service/Event</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned Merchant</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date / Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Review</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedBookings.map((b) => (<tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{b.serviceName || b.event}</td>
                      <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                      <td className="px-4 py-3">
                        {b.customer?.name || "—"}
                        {b.customer?.email && <span className="block text-xs text-muted-foreground">{b.customer.email}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {b.assignedTo ? (<div>
                            <p className="font-medium text-sm">{b.assignedTo.name}</p>
                            <p className="text-xs text-muted-foreground">{b.assignedTo.email}</p>
                          </div>) : (<span className="text-xs text-muted-foreground">Not assigned</span>)}
                      </td>
                      <td className="px-4 py-3 max-w-[250px]">
                        {b.customerLocation ? (<div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium leading-relaxed">{b.customerLocation.address}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <p className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                    Lat: {b.customerLocation.latitude?.toFixed(4)}, Lng: {b.customerLocation.longitude?.toFixed(4)}
                                  </p>
                                  <a href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                                    View on Maps <ExternalLink className="h-2.5 w-2.5"/>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>) : (<span className="text-xs text-muted-foreground">No location</span>)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(b.datetime).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {b.rating?.score ? (<div className="flex items-center gap-2">
                            <div className="flex gap-0.5 text-sm leading-none">
                              {[1, 2, 3, 4, 5].map((star) => (<span key={star} className={star <= Number(b.rating.score) ? "text-yellow-500 font-bold" : "text-muted-foreground"}>
                                  {star <= Number(b.rating.score) ? "★" : "☆"}
                                </span>))}
                            </div>
                            <span className="text-xs font-semibold">{b.rating.score}/5</span>
                          </div>) : (<span className="text-xs text-muted-foreground">No rating</span>)}
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        {b.rating?.comment ? (<p className="text-xs text-muted-foreground line-clamp-2 italic">"{b.rating.comment}"</p>) : (<span className="text-xs text-muted-foreground">No review</span>)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>))}
                  {bookings.length === 0 && (<tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for All Bookings */}
            {!bookingsViewAll && bookings.length > 10 && (<div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                  Showing page <span className="font-semibold text-foreground">{currentBookingsPage}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalBookingsPages}</span> ({bookings.length} items)
                </p>
                <div className="flex items-center gap-1">
                  <Button onClick={() => setBookingsPage(p => Math.max(1, p - 1))} disabled={currentBookingsPage === 1} variant="outline" size="sm" className="h-8 px-2">
                    <ChevronLeft className="h-4 w-4"/>
                  </Button>
                  {(() => {
                    const pages = Array.from({ length: totalBookingsPages }, (_, i) => i + 1);
                    const visiblePages = pages.filter(p => p === 1 || p === totalBookingsPages || Math.abs(p - currentBookingsPage) <= 1);
                    const elements = [];
                    visiblePages.forEach((p, idx) => {
                        const prevPage = visiblePages[idx - 1];
                        if (prevPage && p - prevPage > 1) {
                            elements.push(<span key={`ellipsis-${p}`} className="px-1 text-muted-foreground text-xs select-none">
                            ...
                          </span>);
                        }
                        elements.push(<Button key={p} onClick={() => setBookingsPage(p)} variant={currentBookingsPage === p ? "default" : "outline"} className={`h-8 w-8 p-0 ${currentBookingsPage === p
                                ? "bg-gradient-primary text-primary-foreground border-none"
                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                          {p}
                        </Button>);
                    });
                    return elements;
                })()}
                  <Button onClick={() => setBookingsPage(p => Math.min(totalBookingsPages, p + 1))} disabled={currentBookingsPage === totalBookingsPages} variant="outline" size="sm" className="h-8 px-2">
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </div>
              </div>)}
            </>)}
        </motion.div>

        {/* Live Events Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xs sm:text-2xl font-bold flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500"/>
              🔴 Live <span className="text-gradient">Events</span> <span className="text-sm font-normal text-muted-foreground">({liveEvents.length})</span>
            </h2>
            <Link to="/admin-dashboard/events">
              <Button size="sm" variant="outline">Manage All Events</Button>
            </Link>
          </div>

          {loading ? (<div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading…
            </div>) : liveEvents.length === 0 ? (<div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p>No live events currently. Merchants can mark events as live from their dashboard.</p>
            </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {liveEvents.map((event, idx) => (<motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  <EventCard event={event} index={idx}/>
                </motion.div>))}
            </div>)}
        </motion.div>

        {/* Full Booking History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary"/> Full Booking History
            </h2>
            <div className="flex gap-2 flex-wrap items-center">
              {["all", "pending", "assigned", "completed"].map((s) => (<button key={s} onClick={() => { setHistoryTab(s); setHistoryPage(1); }} className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${historyTab === s ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? `All (${allBookings.length})` : `${s} (${allBookings.filter(b => b.status === s).length})`}
                </button>))}
              {filteredHistory.length > 10 && (<Button size="sm" variant="outline" className="text-xs h-7 px-3 rounded-full" onClick={() => setHistoryViewAll(!historyViewAll)}>
                  {historyViewAll ? "View Paginated" : "View All"}
                </Button>)}
            </div>
          </div>

          {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading…
            </div>) : filteredHistory.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
              No bookings found.
            </div>) : (<>
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Booked On</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned To</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned On</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed On</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHistory.map((b, idx) => (<tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {historyViewAll ? idx + 1 : (currentHistoryPage - 1) * 10 + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">{b.serviceName}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{b.customer?.name || "—"}</span>
                        {b.customer?.email && <span className="block text-xs text-muted-foreground">{b.customer.email}</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {b.customerLocation ? (<div className="space-y-1">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0"/>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{b.customerLocation.address}</p>
                                <a href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                                  View on Maps <ExternalLink className="h-2.5 w-2.5"/>
                                </a>
                              </div>
                            </div>
                          </div>) : (<span className="text-xs text-muted-foreground">No location</span>)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(b.datetime).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {b.assignedTo ? (<span>
                            <span className="font-medium">{b.assignedTo.name}</span>
                            <span className="block text-xs text-muted-foreground">{b.assignedTo.email}</span>
                          </span>) : <span className="text-xs italic text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.assignedAt ? new Date(b.assignedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.completedAt ? new Date(b.completedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for Full Booking History */}
            {!historyViewAll && filteredHistory.length > 10 && (<div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                  Showing page <span className="font-semibold text-foreground">{currentHistoryPage}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalHistoryPages}</span> ({filteredHistory.length} items)
                </p>
                <div className="flex items-center gap-1">
                  <Button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={currentHistoryPage === 1} variant="outline" size="sm" className="h-8 px-2">
                    <ChevronLeft className="h-4 w-4"/>
                  </Button>
                  {(() => {
                    const pages = Array.from({ length: totalHistoryPages }, (_, i) => i + 1);
                    const visiblePages = pages.filter(p => p === 1 || p === totalHistoryPages || Math.abs(p - currentHistoryPage) <= 1);
                    const elements = [];
                    visiblePages.forEach((p, idx) => {
                        const prevPage = visiblePages[idx - 1];
                        if (prevPage && p - prevPage > 1) {
                            elements.push(<span key={`ellipsis-${p}`} className="px-1 text-muted-foreground text-xs select-none">
                            ...
                          </span>);
                        }
                        elements.push(<Button key={p} onClick={() => setHistoryPage(p)} variant={currentHistoryPage === p ? "default" : "outline"} className={`h-8 w-8 p-0 ${currentHistoryPage === p
                                ? "bg-gradient-primary text-primary-foreground border-none"
                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                          {p}
                        </Button>);
                    });
                    return elements;
                })()}
                  <Button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={currentHistoryPage === totalHistoryPages} variant="outline" size="sm" className="h-8 px-2">
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </div>
              </div>)}
            </>)}
        </motion.div>

        {/* Quick summary cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover-lift flex flex-col justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Registered Users</p>
              <p className="font-display text-base sm:text-2xl font-bold mt-1 truncate">{loading ? "…" : allUsers.filter(u => u.role === "user").length}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Customer accounts</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover-lift flex flex-col justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Merchants</p>
              <p className="font-display text-base sm:text-2xl font-bold mt-1 truncate">{loading ? "…" : totalMerchants}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Available for assignment</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover-lift flex flex-col justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Events Listed</p>
              <p className="font-display text-base sm:text-2xl font-bold mt-1 truncate">{loading ? "…" : events.length}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Across all categories</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 hover-lift flex flex-col justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="font-display text-base sm:text-2xl font-bold mt-1 truncate text-primary" title={loading ? "…" : `${formatCurrency(totalRevenue)}`}>{loading ? "…" : `${formatCurrency(totalRevenue)}`}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">From confirmed & completed bookings</p>
          </div>
        </motion.div>

        {/* Promo Codes Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xs sm:text-2xl font-bold flex items-center gap-2">
              <span className="text-amber-500">🎟️</span> Platform Promo Codes
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Merchants can create and manage promo codes to boost event bookings. Monitor all active promo codes across the platform.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-muted-foreground">Active Promo Codes</p>
                <p className="font-display text-xs sm:text-2xl font-bold mt-2">—</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground">Total Discounts Given</p>
                <p className="font-display text-xs sm:text-2xl font-bold mt-2">—</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">Promo Code Usage</p>
                <p className="font-display text-xs sm:text-2xl font-bold mt-2">—</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Customer Reviews & Ratings Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xs sm:text-2xl font-bold flex items-center gap-2">
              ⭐ Customer Reviews & Ratings
            </h2>
            <Link to="/admin-dashboard/payments">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </div>

          {loading ? (<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading reviews…
            </div>) : allBookings.filter(b => b.rating?.score).length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
              <p className="font-medium mb-2">No reviews yet</p>
              <p className="text-sm">Customer reviews will appear here once they rate completed bookings</p>
            </div>) : (<div className="space-y-6">
              {/* Reviews Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allBookings
                .filter(b => b.rating?.score)
                .sort((a, b) => new Date(b.rating?.ratedAt || 0).getTime() - new Date(a.rating?.ratedAt || 0).getTime())
                .slice(0, 6)
                .map((booking) => (<motion.div key={booking._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{booking.customer?.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{booking.service?.name || booking.event?.title || booking.serviceName}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`h-4 w-4 ${star <= (booking.rating?.score || 0)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/30 fill-none"}`}/>))}
                        </div>
                      </div>

                      {booking.rating?.comment && (<p className="text-sm text-muted-foreground mb-3 italic line-clamp-2">"{booking.rating.comment}"</p>)}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                        <span className="font-medium">{booking.rating?.score}/5</span>
                        <span>Merchant: {booking.assignedTo?.name || "Unassigned"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(booking.rating?.ratedAt || 0).toLocaleDateString()}
                      </div>
                    </motion.div>))}
              </div>

              {/* Rating Statistics */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-3 sm:p-6">
                <h3 className="font-display font-semibold mb-6">Platform Rating Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {(() => {
                const ratings = allBookings.filter(b => b.rating?.score);
                const avgRating = (ratings.reduce((sum, b) => sum + (b.rating?.score || 0), 0) / ratings.length).toFixed(1);
                const totalRatings = ratings.length;
                const fiveStarCount = ratings.filter(b => b.rating?.score === 5).length;
                const fourStarCount = ratings.filter(b => b.rating?.score === 4).length;
                const threeStarCount = ratings.filter(b => b.rating?.score === 3).length;
                return (<>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                          <p className="text-base sm:text-2xl font-bold text-yellow-500 truncate">{avgRating}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">Avg Rating</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <p className="text-base sm:text-2xl font-bold text-primary truncate">{totalRatings}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">Total Reviews</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                          <p className="text-base sm:text-2xl font-bold text-green-500 truncate">{fiveStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">5 Star</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                          <p className="text-base sm:text-2xl font-bold text-blue-500 truncate">{fourStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">4 Star</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                          <p className="text-base sm:text-2xl font-bold text-orange-500 truncate">{threeStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">3 Star</p>
                        </div>
                      </>);
            })()}
                </div>

                {/* Additional Stats */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-semibold text-sm mb-4">Rating Distribution</h4>
                  <div className="space-y-3">
                    {(() => {
                const ratings = allBookings.filter(b => b.rating?.score);
                const total = ratings.length;
                const distribution = [
                    { stars: 5, count: ratings.filter(b => b.rating?.score === 5).length, color: "bg-green-500" },
                    { stars: 4, count: ratings.filter(b => b.rating?.score === 4).length, color: "bg-blue-500" },
                    { stars: 3, count: ratings.filter(b => b.rating?.score === 3).length, color: "bg-orange-500" },
                    { stars: 2, count: ratings.filter(b => b.rating?.score === 2).length, color: "bg-red-500" },
                    { stars: 1, count: ratings.filter(b => b.rating?.score === 1).length, color: "bg-red-600" },
                ];
                return distribution.map(({ stars, count, color }) => (<div key={stars} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-12">{stars}⭐</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full ${color} transition-all`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}/>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground w-12 text-right">{count}</span>
                        </div>));
            })()}
                  </div>
                </div>
              </motion.div>
            </div>)}
          {/* Onboarding Details Dialog */}
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
            {selectedMerchantDetails && (<div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
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
                      {selectedMerchantDetails.merchantDetails?.eventTypes?.map((t) => (<span key={t} className="px-2 py-0.5 text-xs rounded-full bg-secondary border border-border">
                          {t}
                        </span>))}
                      {(!selectedMerchantDetails.merchantDetails?.eventTypes || selectedMerchantDetails.merchantDetails.eventTypes.length === 0) && (<span className="text-xs text-muted-foreground">None specified</span>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Service Categories</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.serviceTypes?.map((t) => (<span key={t} className="px-2 py-0.5 text-xs rounded-full bg-secondary border border-border">
                          {t}
                        </span>))}
                      {(!selectedMerchantDetails.merchantDetails?.serviceTypes || selectedMerchantDetails.merchantDetails.serviceTypes.length === 0) && (<span className="text-xs text-muted-foreground">None specified</span>)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={() => setIsDetailsModalOpen(false)}>Close Details</Button>
                </div>
              </div>)}
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Send Quotation Dialog */}
        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary font-display">
                <DollarSign className="h-5 w-5 text-[#A68C73]"/> Send Onboarding Quotation
              </DialogTitle>
              <DialogDescription>
                Set the setup fee amount for this merchant. The merchant will pay this amount before activation.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantForQuote && (<form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForQuote.name}</p>
                  <p><strong>Email:</strong> {selectedMerchantForQuote.email}</p>
                  <p><strong>Business:</strong> {selectedMerchantForQuote.merchantDetails?.businessName}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qAmount">Quotation Amount (in USD/Credits) *</Label>
                  <Input id="qAmount" type="text" required placeholder="e.g. 250" value={quoteAmount} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setQuoteAmount(val.slice(0, 7));
            }} className="bg-secondary border-border"/>
                  <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingQuote} className="bg-[#A68C73] text-white hover:bg-[#A68C73]/90">
                    {sendingQuote ? "Sending Quote..." : "Send Quote"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Activation / Limits Dialog */}
        <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary font-display">
                <CheckCircle2 className="h-5 w-5 text-green-500"/>
                {selectedMerchantForActivation?.merchantStatus === "active" ? "Configure Merchant Limits" : "Activate Merchant & Configure Limits"}
              </DialogTitle>
              <DialogDescription>
                Set the maximum number of events and services this merchant is allowed to create on the platform.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantForActivation && (<form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForActivation.name}</p>
                  <p><strong>Business:</strong> {selectedMerchantForActivation.merchantDetails?.businessName}</p>
                  <p><strong>Quotation Paid:</strong> {formatCurrency(selectedMerchantForActivation.quotationAmount || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxEv">Maximum Events Limit</Label>
                    <Input id="maxEv" type="text" required value={maxEvents} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setMaxEvents(val.slice(0, 4));
            }} className="bg-secondary border-border"/>
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSe">Maximum Services Limit</Label>
                    <Input id="maxSe" type="text" required value={maxServices} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setMaxServices(val.slice(0, 4));
            }} className="bg-secondary border-border"/>
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={activatingMerchant} className="bg-[#A68C73] text-white hover:bg-[#A68C73]/90 font-semibold">
                    {activatingMerchant ? "Activating..." : selectedMerchantForActivation.merchantStatus === "active" ? "Update Limits" : "Activate Merchant"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>

        {/* Ticket Send Quotation Dialog */}
        <Dialog open={isTicketQuoteDialogOpen} onOpenChange={setIsTicketQuoteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary font-display">
                <DollarSign className="h-5 w-5 text-indigo-500"/> Send Limit Upgrade Quotation
              </DialogTitle>
              <DialogDescription>
                Set the quotation fee for this limit upgrade request.
              </DialogDescription>
            </DialogHeader>
            {selectedTicketForQuote && (<form onSubmit={handleSendTicketQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedTicketForQuote.merchant?.name}</p>
                  <p><strong>Requested slots increase:</strong> +{selectedTicketForQuote.requestedEvents} Events, +{selectedTicketForQuote.requestedServices} Services</p>
                  {selectedTicketForQuote.message && <p><strong>Message:</strong> "{selectedTicketForQuote.message}"</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tqAmount">Quotation Amount (in USD/Credits) *</Label>
                  <Input id="tqAmount" type="text" required placeholder="e.g. 100" value={ticketQuoteAmount} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setTicketQuoteAmount(val.slice(0, 7));
            }} className="bg-secondary border-border"/>
                  <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTicketQuoteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingTicketQuote} className="bg-[#A68C73] text-white hover:bg-[#A68C73]/90">
                    {sendingTicketQuote ? "Sending Quote..." : "Send Quote"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>
      </motion.div>
      </section>
    </AdminLayout>);
};
export default AdminOverview;
