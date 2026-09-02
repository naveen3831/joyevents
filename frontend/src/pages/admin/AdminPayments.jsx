import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import {
  Clock,
  CreditCard,
  IndianRupee,
  Eye,
  ReceiptText,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Wallet,
  Search,
  X,
  Download,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import ConfirmModal from "@/components/common/ConfirmModal";
import ActionMenu from "@/components/common/ActionMenu";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCommissionRate, apiListBookings, apiRefundPayment } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
import { useNavigate } from "react-router-dom";

const AdminPayments = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [selectedBookingForRefund, setSelectedBookingForRefund] = useState(null);
  const [commissionRate, setCommissionRate] = useState(0.05);

  // Filters State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── All existing data-fetching logic unchanged ──
  const loadPayments = async () => {
    if (!token) return;
    try {
      const res = await apiListBookings(undefined, token);
      setBookings(res.bookings || []);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const loadCommissionRate = async () => {
      try {
        const res = await apiGetCommissionRate();
        const rate =
          res.commissionRate > 1
            ? res.commissionRate / 100
            : res.commissionRate || 0.05;
        setCommissionRate(rate);
      } catch {
        setCommissionRate(0.05);
      }
    };
    loadCommissionRate();
  }, [token]);

  const handleRefundConfirm = async () => {
    if (!selectedBookingForRefund) return;
    setRefunding(true);
    try {
      await apiRefundPayment(selectedBookingForRefund._id, "Admin refund", token);
      toast.success("Refund processed successfully");
      setSelectedBookingForRefund(null);
      loadPayments();
    } catch (error) {
      toast.error(error.message || "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  // ── All existing data calculations unchanged ──
  const payableBookings = bookings.filter((b) =>
    ["paid", "partially_paid", "pending", "failed", "refunded"].includes(b.paymentStatus)
  );

  const filteredBookings = payableBookings.filter((b) => {
    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      const name = (b.serviceName || b.eventName || b.event?.title || b.service?.name || "").toLowerCase();
      const customer = (b.customer?.name || b.customer?.email || "").toLowerCase();
      const merchant = (b.assignedTo?.name || b.assignedTo?.email || "").toLowerCase();
      const paymentId = (b.paymentId || "").toLowerCase();
      if (!name.includes(term) && !customer.includes(term) && !merchant.includes(term) && !paymentId.includes(term)) {
        return false;
      }
    }

    // Type Filter
    if (typeFilter !== "all") {
      const isEvent = !!(b.event || b.eventName);
      if (typeFilter === "event" && !isEvent) return false;
      if (typeFilter === "service" && isEvent) return false;
    }

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "paid" && !["paid", "partially_paid"].includes(b.paymentStatus)) return false;
      if (statusFilter === "pending" && b.paymentStatus !== "pending") return false;
      if (statusFilter === "refunded" && b.paymentStatus !== "refunded") return false;
      if (statusFilter === "failed" && b.paymentStatus !== "failed") return false;
    }

    // Date Filter
    if (dateFilter !== "all" && b.createdAt) {
      const bDate = new Date(b.createdAt);
      const now = new Date();
      if (dateFilter === "today") {
        if (bDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === "this_month") {
        if (bDate.getMonth() !== now.getMonth() || bDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, dateFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPaidAmount = (b) => {
    if (["refunded", "failed", "pending"].includes(b.paymentStatus)) return 0;
    if (b.paymentStatus === "partially_paid" && b.isAdvancePaid)
      return b.advanceAmount || 0;
    return b.price || 0;
  };

  const totalCollected = bookings.reduce((sum, b) => sum + getPaidAmount(b), 0);
  const successfulCount = payableBookings.filter((b) =>
    ["paid", "partially_paid"].includes(b.paymentStatus)
  ).length;
  const pendingCount = payableBookings.filter((b) => b.paymentStatus === "pending").length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getSecondaryMetadata = (b) => {
    const isEvent = !!(b.event || b.eventName);
    const typeStr = isEvent ? "Event" : "Service";
    const methodStr = b.paymentMethod ? b.paymentMethod.toUpperCase() : "UPI";
    return `${typeStr} • ${methodStr}`;
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[1440px] mx-auto space-y-5">
        {/* ── 1. PAGE HEADER ───────────────────────────────────────── */}
        <PageHeader
          title="Transactions"
          subtitle="Monitor and manage all payment activity"
          breadcrumbs={[{ label: "Admin Portal" }, { label: "Payments" }, { label: "Transactions" }]}
          actions={
            <button
              onClick={() => toast.info("Exporting transactions log...")}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border border-border/80 bg-card text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Export
            </button>
          }
        />

        {/* ── 2. SUMMARY CARDS (One Compact Row 76-84px) ─────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="TOTAL TRANSACTIONS"
            value={payableBookings.length}
            icon={<ReceiptText className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
            tone="bg-sky-500/10"
          />
          <SummaryCard
            title="TOTAL REVENUE"
            value={formatCurrency(totalCollected)}
            icon={<IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            tone="bg-emerald-500/10"
          />
          <SummaryCard
            title="PAID"
            value={successfulCount}
            icon={<CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            tone="bg-indigo-500/10"
          />
          <SummaryCard
            title="PENDING"
            value={pendingCount}
            icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            tone="bg-amber-500/10"
          />
        </div>

        {/* ── 3. TABLE CONTAINER (Card holding Toolbar, Table, Pagination) ── */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          {/* ── 4. TOOLBAR ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-card">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search Field */}
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full h-9 pl-9 pr-8 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground text-foreground transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground cursor-pointer"
              >
                <option value="all">Type: All</option>
                <option value="service">Service</option>
                <option value="event">Event</option>
              </select>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground cursor-pointer"
              >
                <option value="all">Date: All Time</option>
                <option value="today">Today</option>
                <option value="this_month">This Month</option>
              </select>

              {/* Reset Filters */}
              {(search || typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setDateFilter("all");
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {filteredBookings.length} transaction{filteredBookings.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── 5. TABLE ───────────────────────────────────────────── */}
          {loading ? (
            <TableSkeleton columns={6} rows={8} minWidth="100%" />
          ) : filteredBookings.length === 0 ? (
            <div className="py-16">
              <TableEmptyState
                title="No transactions found"
                description="There are no payment records matching your filter criteria."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <DataTable minWidth="760px">
                <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-border/70">
                  <TableHeaderCell className="w-[25%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    PAYER
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[30%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    TRANSACTION
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[15%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    DATE
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[13%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    AMOUNT
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[12%] text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    STATUS
                  </TableHeaderCell>
                  <TableHeaderCell align="center" className="w-[5%] text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    &nbsp;
                  </TableHeaderCell>
                </TableHeader>

                <TableBody>
                  {paginatedBookings.map((booking) => {
                    const paidAmount = getPaidAmount(booking);
                    const bookingName =
                      booking.serviceName ||
                      booking.eventName ||
                      booking.event?.title ||
                      booking.service?.name ||
                      "Booking";
                    const formattedDate = formatDate(booking.createdAt);
                    const initials = (booking.customer?.name || "?").slice(0, 2).toUpperCase();

                    return (
                      <TableRow
                        key={booking._id}
                        className="group hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors h-[62px]"
                      >
                        {/* PAYER */}
                        <TableCell className="w-[25%] py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[13px] text-foreground truncate max-w-[150px]" title={booking.customer?.name}>
                                {booking.customer?.name || "Customer"}
                              </p>
                              {booking.customer?.email && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[150px] font-mono" title={booking.customer.email}>
                                  {booking.customer.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* TRANSACTION */}
                        <TableCell className="w-[30%] py-2.5">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[13px] text-foreground truncate max-w-[240px]" title={bookingName}>
                              {bookingName}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              {getSecondaryMetadata(booking)}
                            </p>
                          </div>
                        </TableCell>

                        {/* DATE */}
                        <TableCell className="w-[15%] py-2.5 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {formattedDate}
                        </TableCell>

                        {/* AMOUNT */}
                        <TableCell className="w-[13%] py-2.5">
                          <p className="font-semibold text-[14px] text-foreground whitespace-nowrap font-mono tabular-nums">
                            {formatCurrency(booking.price || 0)}
                          </p>
                          {paidAmount > 0 && paidAmount !== (booking.price || 0) && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                              Paid: {formatCurrency(paidAmount)}
                            </p>
                          )}
                        </TableCell>

                        {/* STATUS */}
                        <TableCell className="w-[12%] py-2.5 text-center">
                          <StatusBadge
                            status={booking.paymentStatus}
                            className="inline-flex items-center justify-center min-w-[82px] h-[26px] px-2 text-[11px] font-semibold rounded-full whitespace-nowrap mx-auto"
                          />
                        </TableCell>

                        {/* ACTION */}
                        <TableCell align="center" className="w-[5%] py-2.5 text-center">
                          <ActionMenu
                            items={[
                              {
                                label: "View Details",
                                icon: Eye,
                                onClick: () => navigate(`/admin-dashboard/payments/${booking._id}`),
                              },
                              ...(booking.paymentStatus === "paid"
                                ? [
                                    {
                                      label: "Process Refund",
                                      icon: RefreshCw,
                                      destructive: true,
                                      onClick: () => setSelectedBookingForRefund(booking),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTable>
            </motion.div>
          )}

          {/* ── 6. PAGINATION ───────────────────────────────────────── */}
          {!loading && filteredBookings.length > 0 && (
            <div className="px-4 py-3 border-t border-border/60 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>–
                <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredBookings.length)}</span> of{" "}
                <span className="font-semibold text-foreground">{filteredBookings.length}</span> transactions
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-border/70 bg-card text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded-lg font-semibold text-xs flex items-center justify-center transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "border border-border/70 bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 rounded-lg border border-border/70 bg-card text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal for Refund ── */}
      <ConfirmModal
        isOpen={!!selectedBookingForRefund}
        onClose={() => setSelectedBookingForRefund(null)}
        onConfirm={handleRefundConfirm}
        loading={refunding}
        title="Process Payment Refund?"
        description={`Are you sure you want to refund ${formatCurrency(
          selectedBookingForRefund?.price || 0
        )} for "${
          selectedBookingForRefund?.serviceName || selectedBookingForRefund?.eventName || "this booking"
        }"? This will cancel the booking and mark the payment as refunded.`}
        confirmText="Confirm Refund"
        variant="destructive"
      />
    </AdminLayout>
  );
};

/* ─── SUMMARY CARD ─────────────────────────────────────────────────────── */
const SummaryCard = ({ title, value, icon, tone }) => (
  <div className="h-[80px] rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-xs flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
        {title}
      </p>
      <p className="text-xl font-bold tracking-tight text-foreground truncate mt-0.5 font-mono">
        {value}
      </p>
    </div>
    <div className={`h-8 w-8 rounded-lg ${tone} flex items-center justify-center shrink-0`}>
      {icon}
    </div>
  </div>
);

export default AdminPayments;
