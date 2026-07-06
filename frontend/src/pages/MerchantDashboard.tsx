import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Calendar, DollarSign, Users, TrendingUp, Plus, BarChart3, CheckCircle2, Clock, AlertCircle, Loader2, History, MapPin, ExternalLink, Store, Briefcase, Settings, Video, Star, Bell, CreditCard, ArrowRight } from"lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiAssignedBookings, apiCompleteBooking, apiApproveBooking, apiRejectBooking, apiListMyEvents, apiListMyServices, apiAssignLegacyEvents, apiAssignLegacyServices, apiUpdateBookingStatus, apiGetNotifications, apiFixServiceBookings, apiGetEarningsDashboard } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  pending_approval: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  approved: "bg-green-500/15 text-green-400 border border-green-500/30",
  awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold",
  processing: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
  accepted: "bg-green-500/15 text-green-400 border border-green-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const MerchantDashboard = () => {
  const { token, user } = useAuth() as any;
  const [bookings, setBookings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [approvalOptions, setApprovalOptions] = useState<{ id: string; show: boolean }>({ id: "", show: false });
  const [customAdvance, setCustomAdvance] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [rejecting, setRejecting] = useState<{ id: string; show: boolean }>({ id: "", show: false });
  const [rejectionReason, setRejectionReason] = useState("");
  const [tab, setTab] = useState<"active" | "completed" | "cancelled">("active");
  const [migrating, setMigrating] = useState(false);
  const [fixingBookings, setFixingBookings] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ id: string; show: boolean; currentStatus: string }>({ id: "", show: false, currentStatus: "" });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [showAllPayouts, setShowAllPayouts] = useState(false);

  const loadBookings = async () => {
    if (!token) return;
    try {
      const [bookingsRes, eventsRes, servicesRes, notificationsRes, earningsRes] = await Promise.all([
        apiAssignedBookings(token),
        apiListMyEvents(token),
        apiListMyServices(token),
        apiGetNotifications(token, { limit: 10 }),
        apiGetEarningsDashboard(token)
      ]);
      
      setBookings(bookingsRes.bookings || []);
      setEvents(eventsRes.events || []);
      setServices(servicesRes.services || []);
      setNotifications(notificationsRes.notifications || []);
      setUnreadCount(notificationsRes.unreadCount || 0);
      setEarningsSummary(earningsRes);
    } catch (e) {
      // silently ignore polling errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [token]);

  // Smooth real-time updates without blinking
  useEffect(() => {
    if (!token) return;
    
    const pollInterval = setInterval(async () => {
      if (fixingBookings) return;
      try {
        const [bookingsRes, eventsRes, servicesRes, earningsRes] = await Promise.all([
          apiAssignedBookings(token),
          apiListMyEvents(token),
          apiListMyServices(token),
          apiGetEarningsDashboard(token)
        ]);
        
        // Only update if values changed
        setBookings(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(bookingsRes.bookings)) {
            return bookingsRes.bookings || [];
          }
          return prev;
        });
        
        setEvents(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(eventsRes.events)) {
            return eventsRes.events || [];
          }
          return prev;
        });
        
        setServices(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(servicesRes.services)) {
            return servicesRes.services || [];
          }
          return prev;
        });

        setEarningsSummary(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(earningsRes)) {
            return earningsRes;
          }
          return prev;
        });
      } catch (error) {
        // silently ignore polling errors
      }
    }, 2000); // Poll every 2 seconds for real-time dashboard flow

    // Listen for payout processed events
    const handlePayoutProcessed = () => {
      loadBookings();
    };

    window.addEventListener("payoutProcessed", handlePayoutProcessed);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("payoutProcessed", handlePayoutProcessed);
    };
  }, [token]);

  // Derived stats
  const activeBookings = bookings.filter((b) => ["assigned", "pending", "pending_approval", "approved", "awaiting_payment", "paid", "processing", "confirmed", "accepted"].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => ["cancelled", "rejected"].includes(b.status));
  // Revenue: include paid + confirmed + completed bookings (any booking where payment was received)
  const revenueBookings = bookings.filter((b) =>
    b.status === "completed" ||
    (b.paymentStatus === "paid" && ["paid", "confirmed", "accepted", "processing"].includes(b.status)) ||
    (b.paymentStatus === "partially_paid" && ["paid", "confirmed", "accepted", "processing"].includes(b.status))
  );
  const totalRevenue = revenueBookings.reduce((s: number, b: any) => {
    // For advance payments, count only what's been paid so far
    if (b.paymentStatus === "partially_paid" && b.isAdvancePaid) {
      return s + (b.advanceAmount || 0);
    }
    return s + (b.price || 0);
  }, 0);
  const totalEarnings = typeof earningsSummary?.totalEarnings === "number"
    ? earningsSummary.totalEarnings
    : totalRevenue;
  const uniqueCustomers = new Set(bookings.map((b) => b.customer?._id)).size;

  const displayBookings = tab === "active" ? activeBookings : tab === "completed" ? completedBookings : cancelledBookings;

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      await apiCompleteBooking(id, token);
      toast.success("Booking marked as completed!");
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to complete booking");
    } finally {
      setCompleting(null);
    }
  };

  const handleApprove = async (id: string, paymentType: "full" | "advance" = "full", customAdvanceAmount?: number) => {
    setApproving(id);
    try {
      const body: any = { paymentType };
      if (paymentType === "advance" && customAdvanceAmount) {
        body.customAdvanceAmount = customAdvanceAmount;
      }
      const res = await fetch(`${API_URL}/api/bookings/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to approve booking");
      }
      
      toast.success(paymentType === "advance" 
        ? `Booking approved with advance payment of ${formatCurrency(customAdvanceAmount || "30%")}!` 
        : "Booking approved with full payment requirement!");
      
      setApprovalOptions({ id: "", show: false });
      setCustomAdvance("");
      setShowCustomInput(false);
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve booking");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    try {
      await apiRejectBooking(id, rejectionReason, token);
      toast.success("Booking rejected. Refund initiated.");
      setRejecting({ id: "", show: false });
      setRejectionReason("");
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject booking");
    }
  };

  const handleMigrateLegacyEvents = async () => {
    setMigrating(true);
    try {
      const [eventsResult, servicesResult] = await Promise.all([
        apiAssignLegacyEvents(token),
        apiAssignLegacyServices(token)
      ]);
      
      const totalUpdated = eventsResult.updatedCount + servicesResult.updatedCount;
      if (totalUpdated > 0) {
        toast.success(`Assigned ${eventsResult.updatedCount} events and ${servicesResult.updatedCount} services to your account`);
      } else {
        toast.info("No legacy content found to assign");
      }
      
      // Reload data after migration
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to migrate content");
    } finally {
      setMigrating(false);
    }
  };

  const handleFixServiceBookings = async () => {
    setFixingBookings(true);
    try {
      const result = await apiFixServiceBookings(token);
      if (result.fixed > 0) {
        toast.success(`Fixed ${result.fixed} service booking(s) — they now appear in your dashboard`);
      } else {
        toast.info("No orphaned service bookings found");
      }
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to fix service bookings");
    } finally {
      setFixingBookings(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(bookingId);
    try {
      await apiUpdateBookingStatus(bookingId, newStatus, token);
      toast.success(`Booking status updated to ${newStatus}`);
      setStatusUpdate({ id: "", show: false, currentStatus: "" });
      loadBookings();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 sm:mb-2">
                <span className="text-muted-foreground text-sm sm:text-lg">Welcome back,</span>
                <span className="font-display text-lg sm:text-2xl font-bold text-gradient ml-2">
                  {user?.name || 'Merchant'}
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-3xl font-bold">
                Merchant <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="mt-1 text-muted-foreground">Manage your assigned bookings and track performance</p>
            </div>
          </motion.div>

          {/* Stats — Row 1 */}
          <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard title="Total Bookings"  value={loading ? "…" : bookings.length}                                        icon={<Calendar className="h-5 w-5" />}     index={0} />
            <StatCard title="Active Bookings" value={loading ? "…" : activeBookings.length}                                  icon={<TrendingUp className="h-5 w-5" />}    index={1} />
            <StatCard title="Completed"       value={loading ? "…" : completedBookings.length}                               icon={<CheckCircle2 className="h-5 w-5" />}  index={2} />
          </div>

          {/* Stats — Row 2 */}
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard title="My Events"       value={loading ? "…" : events.length}                                          icon={<Calendar className="h-5 w-5" />}      index={3} />
            <StatCard title="My Services"     value={loading ? "…" : services.length}                                        icon={<Briefcase className="h-5 w-5" />}     index={4} />
            <StatCard title="Revenue Earned"  value={loading ? "…" : `${formatCurrency(totalEarnings)}`}                   icon={<DollarSign className="h-5 w-5" />}    index={5} />
          </div>

          {/* Bookings Table with tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-display text-sm sm:text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Bookings
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setTab("active")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === "active" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Active ({activeBookings.length})
                </button>
                <button
                  onClick={() => setTab("completed")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === "completed" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Completed ({completedBookings.length})
                </button>
                <button
                  onClick={() => setTab("cancelled")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === "cancelled" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  Cancelled ({cancelledBookings.length})
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFixServiceBookings}
                  disabled={fixingBookings}
                  className="text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                >
                  {fixingBookings ? "Syncing..." : "Sync Service Bookings"}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : displayBookings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                {tab === "active" ? (
                  <div>
                    <p className="font-medium mb-2">No active bookings right now.</p>
                    <p className="text-sm mb-4">Bookings will appear here when customers book your events or services.</p>
                    <div className="mt-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                        Have existing service bookings that aren't showing? Click below to sync them.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFixServiceBookings}
                        disabled={fixingBookings}
                        className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                      >
                        {fixingBookings ? "Syncing..." : "Sync Service Bookings"}
                      </Button>
                    </div>
                  </div>
                ) : tab === "completed" ? (
                  <div>
                    <p className="font-medium mb-2">No completed bookings yet.</p>
                    <p className="text-sm">Completed bookings will appear here after you mark active bookings as complete.</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium mb-2">No cancelled bookings.</p>
                    <p className="text-sm">Rejected or cancelled bookings will appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned On</th>
                      {(tab === "completed" || tab === "cancelled") && <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        {tab === "completed" ? "Completed On" : "Cancelled On"}
                      </th>}
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                      {tab === "active" && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayBookings.slice(0, 5).map((b, idx) => (
                      <tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{b.service?.name || b.event?.title || b.serviceName}</div>
                            <div className="mt-0.5">
                              {b.service ? (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>
                              ) : b.event ? (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {b.customer?.name || "—"}
                          {b.customer?.email && <span className="block text-xs opacity-60">{b.customer.email}</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[300px]">
                          {b.customerLocation && b.customerLocation.address ? (
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium leading-relaxed">{b.customerLocation.address}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                      Lat: {b.customerLocation.latitude?.toFixed(4)}, Lng: {b.customerLocation.longitude?.toFixed(4)}
                                    </p>
                                    <a
                                      href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                                    >
                                      View on Maps <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : b.event?.location ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium leading-relaxed">{b.event.location}</p>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap mt-1"
                                >
                                  View on Maps <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No location provided</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(b.datetime).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {b.assignedAt ? new Date(b.assignedAt).toLocaleString() : new Date(b.updatedAt).toLocaleString()}
                        </td>
                        {(tab === "completed" || tab === "cancelled") && (
                          <td className="px-4 py-3 text-muted-foreground">
                            {tab === "completed" && b.completedAt ? new Date(b.completedAt).toLocaleString() : 
                             tab === "cancelled" && b.rejectedAt ? new Date(b.rejectedAt).toLocaleString() : "—"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                              {b.status}
                            </span>
                            {b.status === "pending" && b.approvedAt && (
                              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                Previously Approved
                              </span>
                            )}
                            {b.status === "cancelled" && b.rejectionReason && (
                              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                Reason: {b.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {b.rating?.score ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= b.rating.score
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground/30 fill-none"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-semibold">{b.rating.score}/5</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No rating</span>
                          )}
                          {b.rating?.comment && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{b.rating.comment}"</p>
                          )}
                        </td>
                        {tab === "active" && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {/* Initial approval/rejection for NEW pending bookings (never approved before) - ONLY for Services */}
                              {b.service && (b.status === "pending" || b.status === "pending_approval") && !b.approvedAt && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 text-white hover:bg-green-700"
                                    disabled={approving === b._id}
                                    onClick={() => setApprovalOptions({ id: b._id, show: true })}
                                  >
                                    {approving === b._id ? "…" : "✓ Approve"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejecting({ id: b._id, show: true })}
                                  >
                                    ✕ Reject
                                  </Button>
                                </>
                              )}
                              
                              {/* Status management for approved bookings OR pending bookings that were approved before - ONLY for Services */}
                              {b.service && (b.status === "paid" || b.status === "confirmed" || b.status === "awaiting_payment" || b.status === "approved" || b.status === "assigned" || b.status === "accepted" || b.status === "processing" || ((b.status === "pending" || b.status === "pending_approval") && b.approvedAt)) && (
                                <>
                                  {b.status !== "completed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setStatusUpdate({ id: b._id, show: true, currentStatus: b.status })}
                                      className="text-xs"
                                    >
                                      Update Status
                                    </Button>
                                  )}
                                  {b.status !== "completed" && (
                                    <Button
                                      size="sm"
                                      className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                                      disabled={completing === b._id}
                                      onClick={() => handleComplete(b._id)}
                                    >
                                      {completing === b._id ? "…" : "Mark Complete"}
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Fallback for non-service bookings (Events) */}
                              {!b.service && (
                                <span className="text-xs text-muted-foreground italic capitalize">{b.status}</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* View All button — show when more than 5 bookings */}
              {displayBookings.length > 5 && (
                <div className="mt-3 text-center">
                  <Link to="/merchant-dashboard/bookings">
                    <Button variant="outline" size="sm" className="gap-1">
                      View All {displayBookings.length} Bookings <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
              </>
            )}
          </motion.div>

          {/* Live Events Section */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm sm:text-2xl font-bold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" /> Your Live Events
              </h2>
              <Link to="/merchant-dashboard/live-events">
                <Button size="sm" variant="outline">Manage All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : events.filter(e => e.live).length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <div>
                  <p className="font-medium mb-2">No live events yet.</p>
                  <p className="text-sm mb-4">Mark an event as live to display it here.</p>
                  {events.length === 0 && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                        No events found? If you created events or services before, click below to assign them to your account.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleMigrateLegacyEvents}
                        disabled={migrating}
                        className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
                      >
                        {migrating ? "Assigning..." : "Assign My Legacy Content"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.filter(e => e.live).map((event) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover-lift"
                  >
                    <div className="relative h-40 overflow-hidden bg-secondary">
                      {event.image ? (
                        <img src={event.image.startsWith("http") ? event.image : `${API_URL}${event.image}`} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Video className="h-8 w-8 opacity-30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <Video className="h-3 w-3" /> LIVE
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-1 flex-1">
                      <h3 className="font-display font-semibold text-base line-clamp-1">{event.title}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(event.datetime).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(event.price)}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                          event.status === "upcoming" ? "bg-blue-500/15 text-blue-400" :
                          event.status === "ongoing" ? "bg-green-500/15 text-green-400" :
                          "bg-gray-500/15 text-gray-400"
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Rejection Modal */}
          {rejecting.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <h3 className="font-display text-xl font-bold mb-4">Reject Booking</h3>
                <p className="text-sm text-muted-foreground mb-4">Please provide a reason for rejection:</p>
                <textarea
                  className="w-full min-h-[120px] rounded-lg border border-border bg-secondary p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="E.g., Event is fully booked, date not available, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3 mt-6">
                  <Button
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleReject(rejecting.id)}
                    disabled={!rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setRejecting({ id: "", show: false });
                      setRejectionReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Approval Options Modal */}
          {approvalOptions.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <h3 className="font-display text-xl font-bold mb-4 text-center">Approve Service</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Choose the payment requirement for this service booking:
                </p>
                
                <div className="space-y-3">
                  {/* 30% Advance */}
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 group"
                    onClick={() => { setShowCustomInput(false); handleApprove(approvalOptions.id, "advance"); }}
                    disabled={approving === approvalOptions.id}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                      <CreditCard className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-orange-400">Require 30% Advance</p>
                      <p className="text-xs text-orange-400/70">Customer pays 30% now to confirm, remaining 70% after service.</p>
                    </div>
                  </button>

                  {/* Custom Advance Amount */}
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-4 p-4 hover:bg-yellow-500/20 transition-all duration-200 group"
                      onClick={() => { setShowCustomInput(!showCustomInput); setCustomAdvance(""); }}
                      disabled={approving === approvalOptions.id}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                        <CreditCard className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-yellow-400">Custom Advance Amount</p>
                        <p className="text-xs text-yellow-400/70">Set a specific advance amount for the customer to pay.</p>
                      </div>
                      <span className="text-yellow-400 text-lg">{showCustomInput ? "▲" : "▼"}</span>
                    </button>
                    {showCustomInput && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold text-lg">₹</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter advance amount"
                            value={customAdvance}
                            onChange={(e) => setCustomAdvance(e.target.value)}
                            className="flex-1 bg-background border border-yellow-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                          />
                        </div>
                        <Button
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                          disabled={!customAdvance || Number(customAdvance) <= 0 || approving === approvalOptions.id}
                          onClick={() => handleApprove(approvalOptions.id, "advance", Number(customAdvance))}
                        >
                          Confirm {formatCurrency(customAdvance || "0")} Advance
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Full Payment */}
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all duration-200 group"
                    onClick={() => { setShowCustomInput(false); handleApprove(approvalOptions.id, "full"); }}
                    disabled={approving === approvalOptions.id}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-green-400">Require Full Payment</p>
                      <p className="text-xs text-green-400/70">Customer pays 100% now to confirm the booking.</p>
                    </div>
                  </button>
                </div>
                
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setApprovalOptions({ id: "", show: false }); setShowCustomInput(false); setCustomAdvance(""); }}
                    disabled={approving === approvalOptions.id}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Status Update Modal */}
          {statusUpdate.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <h3 className="font-display text-xl font-bold mb-2 text-center">Action</h3>
                <div className="w-full h-px bg-border mb-6"></div>
                
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-full max-w-xs mx-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <span className="font-display text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Update Status
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Current: <span className="font-medium capitalize text-foreground">{statusUpdate.currentStatus}</span>
                </p>
                
                <div className="space-y-3">
                  {/* Statuses BEFORE payment - only show if not paid */}
                  {statusUpdate.currentStatus !== "paid" && statusUpdate.currentStatus !== "processing" && statusUpdate.currentStatus !== "completed" && (
                    <>
                      <button
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                        onClick={() => handleStatusUpdate(statusUpdate.id, "pending_approval")}
                        disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "pending_approval"}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                          <Clock className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-lg font-medium text-orange-400 group-hover:text-orange-300">
                          Pending Approval
                        </span>
                      </button>

                      <button
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                        onClick={() => handleStatusUpdate(statusUpdate.id, "approved")}
                        disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "approved"}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                          <CheckCircle2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-lg font-medium text-blue-400 group-hover:text-blue-300">
                          Approved
                        </span>
                      </button>

                      <button
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                        onClick={() => handleStatusUpdate(statusUpdate.id, "awaiting_payment")}
                        disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "awaiting_payment"}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                          <CreditCard className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-lg font-medium text-indigo-400 group-hover:text-indigo-300">
                          Awaiting Payment
                        </span>
                      </button>
                    </>
                  )}

                  {/* Statuses AFTER or AT payment - always show if not already completed */}
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    onClick={() => handleStatusUpdate(statusUpdate.id, "paid")}
                    disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "paid"}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-lg font-medium text-emerald-400 group-hover:text-emerald-300">
                      Paid
                    </span>
                  </button>

                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    onClick={() => handleStatusUpdate(statusUpdate.id, "pending")}
                    disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "pending"}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-lg font-medium text-yellow-400 group-hover:text-yellow-300">
                      Pending
                    </span>
                  </button>
                  
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    onClick={() => handleStatusUpdate(statusUpdate.id, "processing")}
                    disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "processing"}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                    </div>
                    <span className="text-lg font-medium text-orange-400 group-hover:text-orange-300">
                      Processing
                    </span>
                  </button>
                  
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    onClick={() => handleStatusUpdate(statusUpdate.id, "completed")}
                    disabled={updatingStatus === statusUpdate.id || statusUpdate.currentStatus === "completed"}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-lg font-medium text-green-400 group-hover:text-green-300">
                      Completed
                    </span>
                  </button>
                </div>
                
                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStatusUpdate({ id: "", show: false, currentStatus: "" })}
                    disabled={updatingStatus === statusUpdate.id}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-6 flex items-center gap-2 sm:gap-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Action</p>
                <p className="font-display text-sm sm:text-2xl font-bold">{activeBookings.length}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-6 flex items-center gap-2 sm:gap-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Customers</p>
                <p className="font-display text-sm sm:text-2xl font-bold">{uniqueCustomers}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-6 flex items-center gap-2 sm:gap-4">
              <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="font-display text-sm sm:text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </motion.div>

          {/* Promo Codes Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-sm sm:text-2xl font-bold flex items-center gap-2">
                <span className="text-amber-500">🎟️</span> Active Promo Codes
              </h2>
              <Link to="/merchant-dashboard/marketing">
                <Button size="sm" variant="outline">Manage All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading promo codes…
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Create and manage promo codes to boost your event bookings. Visit Marketing Tools to create new codes.
                </p>
                <Link to="/merchant-dashboard/marketing?createPromo=true">
                  <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Promo Code
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Customer Reviews Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-sm sm:text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> Customer Reviews
              </h2>
              <Link to="/merchant-dashboard/bookings">
                <Button size="sm" variant="outline">View All</Button>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading reviews…
              </div>
            ) : bookings.filter(b => b.rating?.score).length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <p className="font-medium mb-2">No reviews yet</p>
                <p className="text-sm">Customer reviews will appear here once they rate your completed bookings</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings
                  .filter(b => b.rating?.score)
                  .sort((a, b) => new Date(b.rating?.ratedAt || 0).getTime() - new Date(a.rating?.ratedAt || 0).getTime())
                  .slice(0, 6)
                  .map((booking) => (
                    <motion.div
                      key={booking._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{booking.customer?.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{booking.event?.title || booking.serviceName}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (booking.rating?.score || 0)
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground/30 fill-none"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {booking.rating?.comment && (
                        <p className="text-sm text-muted-foreground mb-3 italic line-clamp-2">"{booking.rating.comment}"</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                        <span className="font-medium">{booking.rating?.score}/5</span>
                        <span>{new Date(booking.rating?.ratedAt || 0).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}

            {/* Rating Stats */}
            {bookings.filter(b => b.rating?.score).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-6 rounded-xl border border-border bg-card p-6">
                <h3 className="font-display font-semibold mb-4">Rating Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                  {(() => {
                    const ratings = bookings.filter(b => b.rating?.score);
                    const avgRating = (ratings.reduce((sum, b) => sum + (b.rating?.score || 0), 0) / ratings.length).toFixed(1);
                    const totalRatings = ratings.length;
                    const fiveStarCount = ratings.filter(b => b.rating?.score === 5).length;
                    const fourStarCount = ratings.filter(b => b.rating?.score === 4).length;
                    const threeStarCount = ratings.filter(b => b.rating?.score === 3).length;

                    return (
                      <>
                        <div className="text-center">
                          <p className="text-xs sm:text-3xl font-bold text-yellow-500">{avgRating}</p>
                          <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-3xl font-bold text-primary">{totalRatings}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-3xl font-bold text-green-500">{fiveStarCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">5 Star</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-3xl font-bold text-blue-500">{fourStarCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">4 Star</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-3xl font-bold text-orange-500">{threeStarCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">3 Star</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </motion.div>
          {/* Payout Status Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-sm sm:text-2xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" /> Payout Status
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading payout info…
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
                  <div className="p-2 sm:p-2 sm:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-muted-foreground mb-2">Paid Bookings</p>
                    <p className="text-xs sm:text-3xl font-bold text-blue-600">{revenueBookings.length}</p>
                  </div>
                  <div className="p-2 sm:p-2 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-2">Total Revenue (95%)</p>
                    <p className="text-xs sm:text-3xl font-bold text-green-600">{formatCurrency(Math.round(totalRevenue * 0.95))}</p>
                  </div>
                  <div className="p-2 sm:p-2 sm:p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground mb-2">Pending Payout</p>
                    <p className="text-xs sm:text-3xl font-bold text-purple-600">
                      {formatCurrency(
                        revenueBookings.filter(b => !b.payoutProcessed).length > 0
                          ? Math.round(revenueBookings.filter(b => !b.payoutProcessed).reduce((sum, b) => {
                              const amt = (b.paymentStatus === "partially_paid" && b.isAdvancePaid) ? (b.advanceAmount || 0) : (b.price || 0);
                              return sum + (amt * 0.95);
                            }, 0))
                          : 0
                      )}
                    </p>
                  </div>
                </div>

                {revenueBookings.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="font-semibold mb-4">Payout Breakdown</h3>
                    <div className="space-y-3">
                      {(showAllPayouts ? revenueBookings : revenueBookings.slice(0, 10)).map((booking) => {
                        const paidAmt = (booking.paymentStatus === "partially_paid" && booking.isAdvancePaid) ? (booking.advanceAmount || 0) : (booking.price || 0);
                        return (
                        <div key={booking._id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{booking.serviceName || booking.event?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(paidAmt)} paid → 95% = {formatCurrency(Math.round(paidAmt * 0.95))}
                              {booking.paymentStatus === "partially_paid" && <span className="ml-1 text-orange-400">(advance)</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.payoutProcessed ? (
                              <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                Processed
                              </div>
                            ) : (
                              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded">Pending</span>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {revenueBookings.length > 10 && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllPayouts(!showAllPayouts)}
                        >
                          {showAllPayouts ? "Show Less" : `View All (${revenueBookings.length}) Payouts`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {revenueBookings.length === 0 && (
                  <div className="mt-6 text-center py-8 text-muted-foreground">
                    <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium mb-2">No paid bookings yet</p>
                    <p className="text-sm">Revenue will appear here once customers make payments</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </MerchantLayout>
  );
}

export default MerchantDashboard;



