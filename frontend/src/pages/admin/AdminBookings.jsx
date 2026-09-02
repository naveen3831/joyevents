import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Search, Filter, Store, Calendar, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

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

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const isThisWeek = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
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

// Clean 8-column layout definition with Location embedded in Booking metadata
const GRID_TEMPLATE_COLUMNS = "38px minmax(200px, 2fr) minmax(140px, 1.2fr) minmax(140px, 1.2fr) 85px 120px 130px 78px";

const AdminBookings = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialDate = queryParams.get("date") || queryParams.get("filter") || "all";
  const initialStatus = queryParams.get("status") || "all";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [merchantFilter, setMerchantFilter] = useState("all");

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
        setLoading(true);
        const res = await apiListBookings(undefined, token);
        const sorted = (res.bookings || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
          const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
          return dateB - dateA;
        });
        setBookings(sorted);
      } catch {
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const merchantOptions = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      if (b.assignedTo?._id) {
        map.set(b.assignedTo._id, b.assignedTo.name || b.assignedTo.email);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const filtered = bookings.filter((b) => {
    const name = b.eventName || b.event?.title || b.serviceName || b.service?.name || "";
    const customer = b.customer?.name || b.customer?.email || "";
    const merchant = b.assignedTo?.name || b.assignedTo?.email || "";
    const location = b.customerLocation?.address || b.event?.location || "";

    const matchSearch = [name, customer, merchant, location].some((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchMerchant = merchantFilter === "all" || b.assignedTo?._id === merchantFilter;

    const bookingDate = b.createdAt || b.datetime;
    const matchDate =
      dateFilter === "all" ||
      (dateFilter === "today" && isToday(bookingDate)) ||
      (dateFilter === "this_week" && isThisWeek(bookingDate)) ||
      (dateFilter === "this_month" && isThisMonth(bookingDate));

    return matchSearch && matchStatus && matchMerchant && matchDate;
  });

  const hasActiveFilters =
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    merchantFilter !== "all" ||
    search.trim() !== "";

  return (
    <AdminLayout>
      <div className="w-full max-w-full min-w-0 space-y-5 font-sans box-border">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-full min-w-0 box-border"
        >
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                All Bookings
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Track and manage all customer bookings across merchants
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3 min-h-[52px] w-full max-w-full box-border min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search */}
              <div className="relative min-w-[180px] max-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search booking, customer..."
                  value={search}
                  maxLength={30}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-xs rounded-lg border-border/80"
                />
              </div>

              {/* Merchant Filter */}
              <div className="flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={merchantFilter}
                  onChange={(e) => setMerchantFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-xs text-foreground font-medium max-w-[160px]"
                >
                  <option value="all">All Merchants</option>
                  {merchantOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-xs text-foreground font-medium"
                >
                  <option value="all">All Statuses</option>
                  {BOOKING_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-xs text-foreground font-medium"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today Only</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter("all");
                    setStatusFilter("all");
                    setMerchantFilter("all");
                    setSearch("");
                  }}
                  className="h-8 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Clear Filters
                </button>
              )}
            </div>

            {/* Counter */}
            <div className="text-xs font-medium text-muted-foreground shrink-0">
              <strong className="text-foreground font-semibold font-mono">{filtered.length}</strong> booking{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Grid Table Container */}
          {loading ? (
            <TableSkeleton columns={8} rows={6} minWidth="100%" />
          ) : filtered.length === 0 ? (
            <TableEmptyState
              title="No bookings found"
              description="No bookings match your current search and filters."
              colSpan={8}
            />
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs w-full max-w-full box-border min-w-0">
              {/* Grid Header */}
              <div
                className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-border/70 h-[44px] px-3.5 items-center w-full min-w-0 box-border"
                style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
              >
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left min-w-0">
                  #
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left min-w-0 pr-2">
                  BOOKING
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left min-w-0 pr-2">
                  CUSTOMER
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left min-w-0 pr-2">
                  MERCHANT
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right min-w-0 pr-2">
                  AMOUNT
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-0">
                  DATE & TIME
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-0">
                  STATUS
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-0">
                  PAYMENT
                </div>
              </div>

              {/* Grid Rows */}
              <div className="divide-y divide-border/60 w-full min-w-0 box-border">
                {filtered.map((b, idx) => {
                  const isEvent = Boolean(b.event || b.eventId || b.eventName);
                  const bookingTitle = isEvent
                    ? (b.eventName || b.event?.title || b.serviceName || b.service?.name || "—")
                    : (b.serviceName || b.service?.name || b.eventName || b.event?.title || "—");

                  const locationText = b.customerLocation?.address || b.event?.location || "";
                  const typeLabel = isEvent ? "Event" : "Service";
                  const metadataLine = locationText ? `${typeLabel} • ${locationText}` : typeLabel;

                  return (
                    <div
                      key={b._id}
                      onClick={() => navigate(`/admin-dashboard/bookings/${b._id}`)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer h-[64px] px-3.5 items-center w-full min-w-0 box-border transition-colors"
                      style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
                    >
                      {/* 1. # */}
                      <div className="text-muted-foreground text-xs font-mono min-w-0">
                        {idx + 1}
                      </div>

                      {/* 2. BOOKING (Title + Type • Location) */}
                      <div className="min-w-0 pr-3">
                        <div
                          className="font-semibold text-xs sm:text-[13.5px] text-foreground truncate block min-w-0"
                          title={bookingTitle}
                        >
                          {bookingTitle}
                        </div>
                        <div
                          className="text-[11.5px] text-muted-foreground mt-0.5 font-medium truncate block min-w-0"
                          title={metadataLine}
                        >
                          {metadataLine}
                        </div>
                      </div>

                      {/* 3. CUSTOMER */}
                      <div className="min-w-0 pr-2">
                        <p
                          className="font-semibold text-xs sm:text-[13.5px] text-foreground truncate block min-w-0"
                          title={b.customer?.name}
                        >
                          {b.customer?.name || "—"}
                        </p>
                        <p
                          className="text-[11px] text-muted-foreground truncate block min-w-0 font-mono"
                          title={b.customer?.email}
                        >
                          {b.customer?.email || "—"}
                        </p>
                      </div>

                      {/* 4. MERCHANT */}
                      <div className="min-w-0 pr-2">
                        {b.assignedTo ? (
                          <>
                            <p
                              className="font-semibold text-xs sm:text-[13.5px] text-foreground truncate block min-w-0"
                              title={b.assignedTo.name}
                            >
                              {b.assignedTo.name || (b.assignedTo.role === "admin" ? "Admin" : "Merchant")}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground truncate block min-w-0 font-mono"
                              title={b.assignedTo.email}
                            >
                              {b.assignedTo.email || "—"}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono min-w-0">Unassigned</span>
                        )}
                      </div>

                      {/* 5. AMOUNT */}
                      <div className="text-right min-w-0 pr-2">
                        <span className="font-semibold text-xs sm:text-[14px] text-foreground font-mono tabular-nums whitespace-nowrap">
                          {formatCurrency(b.price)}
                        </span>
                      </div>

                      {/* 6. DATE & TIME */}
                      <div className="text-center min-w-0 text-xs whitespace-nowrap">
                        <p className="font-medium text-xs sm:text-[13px] text-foreground">
                          {b.datetime
                            ? new Date(b.datetime).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {b.datetime
                            ? new Date(b.datetime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>

                      {/* 7. BOOKING STATUS */}
                      <div className="flex justify-center min-w-0">
                        <StatusBadge
                          status={b.status}
                          className="w-[124px] max-w-[128px] h-[28px] px-2 inline-flex items-center justify-center text-center font-semibold text-[10.5px] sm:text-[11px] rounded-full border shadow-none truncate"
                        />
                      </div>

                      {/* 8. PAYMENT */}
                      <div className="flex justify-center min-w-0">
                        <StatusBadge
                          status={b.paymentStatus || "pending"}
                          className="w-[74px] max-w-[74px] h-[28px] px-1 inline-flex items-center justify-center text-center font-semibold text-[10.5px] sm:text-[11px] rounded-full border shadow-none truncate"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminBookings;
