import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Search, Filter, MapPin, ExternalLink, Store, User, Calendar, CreditCard, X, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocation } from "react-router-dom";

const BOOKING_STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "pending_approval", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
    { value: "assigned", label: "Assigned" },
    { value: "accepted", label: "Accepted" },
    { value: "processing", label: "Processing" },
    { value: "awaiting_payment", label: "Awaiting Payment" },
    { value: "awaiting_final_payment", label: "Awaiting Final Payment" },
    { value: "confirmed", label: "Confirmed" },
    { value: "paid", label: "Paid" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];
const STATUS_COLORS = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    pending_approval: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    approved: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    assigned: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    accepted: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    processing: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    awaiting_final_payment: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    confirmed: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    completed: "bg-green-500/15 text-green-400 border border-green-500/30",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};
const STATUS_LABELS = BOOKING_STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = status.label;
    return acc;
}, {});

const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return d >= startOfWeek && d < endOfWeek;
};

const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const AdminBookings = () => {
    const { token, user } = useAuth();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialDate = queryParams.get("date") || queryParams.get("filter") || "all";
    const initialStatus = queryParams.get("status") || "all";

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [dateFilter, setDateFilter] = useState(initialDate);
    const [bookingView, setBookingView] = useState("all");
    const [merchantFilter, setMerchantFilter] = useState("all");
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const d = params.get("date") || params.get("filter");
        const s = params.get("status");
        if (d) setDateFilter(d);
        if (s) setStatusFilter(s);
    }, [location.search]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiListBookings(undefined, token);
                const sorted = (res.bookings || []).sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
                    const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
                    return dateB - dateA;
                });
                setBookings(sorted);
            }
            catch {
                toast.error("Failed to load bookings");
            }
            finally {
                setLoading(false);
            }
        };
        if (token)
            load();
    }, [token]);

    const merchantOptions = useMemo(() => {
        const map = new Map();
        bookings.forEach((b) => {
            if (b.assignedTo?._id && b.assignedTo?.role === "merchant") {
                map.set(b.assignedTo._id, b.assignedTo.name || b.assignedTo.email);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [bookings]);

    const filtered = bookings.filter((b) => {
        const name = b.service?.name || b.event?.title || b.serviceName || "";
        const customer = b.customer?.name || b.customer?.email || "";
        const merchant = b.assignedTo?.name || b.assignedTo?.email || "";
        const matchSearch = [name, customer, merchant].some(s => s.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = statusFilter === "all" || b.status === statusFilter;
        const isAdminBooking = b.assignedTo?.role === "admin" || b.assignedTo?._id === user?._id || b.assignedTo?.email === user?.email;
        const matchView = bookingView === "all" || isAdminBooking;
        const matchMerchant = merchantFilter === "all" || b.assignedTo?._id === merchantFilter;

        const bookingDate = b.createdAt || b.datetime;
        const matchDate = dateFilter === "all" ||
            (dateFilter === "today" && isToday(bookingDate)) ||
            (dateFilter === "this_week" && isThisWeek(bookingDate)) ||
            (dateFilter === "this_month" && isThisMonth(bookingDate));

        return matchSearch && matchStatus && matchView && matchMerchant && matchDate;
    });

    const adminBookingsCount = bookings.filter((b) => b.assignedTo?.role === "admin" || b.assignedTo?._id === user?._id || b.assignedTo?.email === user?.email).length;
    const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || merchantFilter !== "all" || search.trim() !== "" || bookingView !== "all";

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <BookOpen className="h-5 w-5"/>
            </div>
            <div>
              <h1 className="font-display text-xs sm:text-3xl font-bold truncate">{bookingView === "admin" ? "Admin" : "All"} <span className="text-gradient">Bookings</span></h1>
              <p className="text-muted-foreground text-sm">{bookingView === "admin" ? "Bookings assigned to admin services and events" : "All bookings from all merchants and customers"}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-6 mb-4">
            <div className="flex rounded-lg border border-border bg-card p-1">
              <button type="button" onClick={() => setBookingView("all")} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${bookingView === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                All Bookings
              </button>
              <button type="button" onClick={() => setBookingView("admin")} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${bookingView === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Admin Bookings
              </button>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search by service, customer, merchant..." value={search} maxLength={30} onChange={e => setSearch(e.target.value)} className="pl-9"/>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground"/>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground"/>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                <option value="all">All Statuses</option>
                {BOOKING_STATUS_OPTIONS.map(status => (<option key={status.value} value={status.value}>{status.label}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground"/>
              <select value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground max-w-[200px]">
                <option value="all">All Merchants</option>
                {merchantOptions.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter("all");
                  setStatusFilter("all");
                  setMerchantFilter("all");
                  setSearch("");
                  setBookingView("all");
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline self-center font-medium px-2 py-1.5 rounded-lg border border-primary/20 bg-primary/5"
              >
                <RotateCcw className="h-3 w-3"/> Clear Filters
              </button>
            )}
            <div className="flex items-center text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              {filtered.length} booking{filtered.length !== 1 ? "s" : ""}{bookingView === "all" ? ` (${adminBookingsCount} admin)` : ""}
            </div>
          </div>

          {loading ? (<div className="py-20 text-center text-muted-foreground">Loading bookings...</div>) : filtered.length === 0 ? (<div className="py-20 text-center border border-border rounded-xl bg-card text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30"/>
              <p>No bookings found</p>
            </div>) : (<div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Service / Event</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Merchant</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Price</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b, idx) => (<tr key={b._id} onClick={() => setSelectedBooking(b)} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer">
                        <td className="px-2 py-2.5 text-muted-foreground text-[10px]">{idx + 1}</td>
                        <td className="px-2 py-2.5 font-medium max-w-[150px]">
                          <div className="truncate text-xs">{b.service?.name || b.event?.title || b.serviceName || "—"}</div>
                          <div className="mt-0.5">
                            {b.service
                    ? <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>
                    : b.event
                        ? <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>
                        : null}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="font-medium text-xs">{b.customer?.name || "—"}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{b.customer?.email}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          {b.assignedTo ? (<>
                              <div className="font-medium text-xs">{b.assignedTo.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{b.assignedTo.email}</div>
                            </>) : (<span className="text-[10px] text-muted-foreground italic">Unassigned</span>)}
                        </td>
                        <td className="px-2 py-2.5 max-w-[140px]">
                          {b.customerLocation?.address ? (<div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0"/>
                              <div>
                                <p className="text-[10px] leading-snug line-clamp-2">{b.customerLocation.address}</p>
                                {b.customerLocation.latitude && (<a href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5">
                                    Maps <ExternalLink className="h-2 w-2"/>
                                  </a>)}
                              </div>
                            </div>) : b.event?.location ? (<div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0"/>
                              <p className="text-[10px] leading-snug line-clamp-2">{b.event.location}</p>
                            </div>) : (<span className="text-[10px] text-muted-foreground">—</span>)}
                        </td>
                        <td className="px-2 py-2.5 font-semibold text-primary text-xs">{formatCurrency(b.price)}</td>
                        <td className="px-2 py-2.5 text-muted-foreground text-[10px]">
                          <div>{new Date(b.datetime).toLocaleDateString()}</div>
                          <div>{new Date(b.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[b.status] || "bg-secondary text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${b.paymentStatus === "paid" ? "bg-green-500/15 text-green-400" :
                    b.paymentStatus === "refunded" ? "bg-orange-500/15 text-orange-400" :
                        "bg-secondary text-muted-foreground"}`}>
                            {b.paymentStatus}
                          </span>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
            </div>)}
        </motion.div>

        {/* Booking Detail Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedBooking && (<div className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize mb-2 ${STATUS_COLORS[selectedBooking.status] || "bg-secondary text-muted-foreground"}`}>
                      {STATUS_LABELS[selectedBooking.status] || selectedBooking.status}
                    </span>
                    <h2 className="font-display text-lg font-bold leading-tight">
                      {selectedBooking.service?.name || selectedBooking.event?.title || selectedBooking.serviceName || "Booking"}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-5 w-5"/>
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5"/> Customer
                  </p>
                  <p className="font-semibold">{selectedBooking.customer?.name || "—"}</p>
                  {selectedBooking.customer?.email && <p className="text-xs text-muted-foreground mt-0.5">{selectedBooking.customer.email}</p>}
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5"/> Assigned Merchant
                  </p>
                  {selectedBooking.assignedTo ? (<>
                      <p className="font-semibold">{selectedBooking.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedBooking.assignedTo.email}</p>
                    </>) : <p className="text-xs italic text-muted-foreground">Unassigned</p>}
                </div>

                {(selectedBooking.customerLocation?.address || selectedBooking.event?.location) && (<div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5"/>Location</p>
                    <p className="text-foreground">{selectedBooking.customerLocation?.address || selectedBooking.event?.location}</p>
                    {selectedBooking.customerLocation?.latitude && (<a href={`https://www.google.com/maps?q=${selectedBooking.customerLocation.latitude},${selectedBooking.customerLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                        View on Maps <ExternalLink className="h-3 w-3"/>
                      </a>)}
                  </div>)}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/>Date & Time</p>
                    <p className="text-foreground font-medium">{new Date(selectedBooking.datetime).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5"/>Payment</p>
                    <p className="text-foreground font-medium capitalize">{selectedBooking.paymentStatus}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 w-fit">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Price</p>
                  <p className="text-primary font-bold text-base">{formatCurrency(selectedBooking.price)}</p>
                </div>

                {selectedBooking.rating?.score && (<div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Rating</p>
                    <p className="text-foreground font-medium">{selectedBooking.rating.score}/5{selectedBooking.rating.comment ? ` — "${selectedBooking.rating.comment}"` : ""}</p>
                  </div>)}
              </div>)}
          </DialogContent>
        </Dialog>
      </section>
    </AdminLayout>);
};
export default AdminBookings;
