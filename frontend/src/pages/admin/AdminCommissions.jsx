import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  IndianRupee,
  TrendingUp,
  Percent,
  Wallet,
  ArrowRight,
  Info,
  Eye,
  Search,
  X,
  RotateCcw,
  Download,
  AlertCircle,
  Settings,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCommissionRate, apiListBookings, apiSaveCommissionRate } from "@/lib/api";
import { toast } from "sonner";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
import { useNavigate } from "react-router-dom";

// ── Existing data logic unchanged ──────────────────────────────────────────
const getCommissionDetails = (booking) => {
  const isAdminBooking = booking.assignedTo?.role === "admin" || booking.commissionSummary?.adminDirect;
  if (booking.commissionSummary) {
    const revenue = booking.commissionSummary.grossAmount || booking.price || 0;
    if (isAdminBooking) {
      return {
        revenue,
        commission: 0,
        payout: 0,
        adminEarning: revenue,
        rateLabel: "N/A",
        isSaved: true,
        isAdminBooking,
      };
    }
    return {
      revenue,
      commission: booking.commissionSummary.commissionAmount || 0,
      payout: booking.commissionSummary.merchantPayout || 0,
      adminEarning: booking.commissionSummary.commissionAmount || 0,
      rateLabel:
        booking.commissionSummary.commissionRate !== null
          ? `${booking.commissionSummary.commissionRate}%`
          : booking.commissionSummary.commissionRates?.length
          ? "Mixed"
          : "Saved",
      isSaved: true,
      isAdminBooking,
    };
  }
  const revenue = booking.price || 0;
  if (isAdminBooking) {
    return {
      revenue,
      commission: 0,
      payout: 0,
      adminEarning: revenue,
      rateLabel: "N/A",
      isSaved: false,
      isAdminBooking,
    };
  }
  return {
    revenue,
    commission: 0,
    payout: 0,
    adminEarning: 0,
    rateLabel: "N/A",
    isSaved: false,
    isAdminBooking,
  };
};

const AdminCommissions = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputRate, setInputRate] = useState("10");
  const [currentRate, setCurrentRate] = useState(10);
  const [savingRate, setSavingRate] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRateSettings, setShowRateSettings] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!token) return;
    loadCommissionRate();
    loadBookings();
  }, [token]);

  const loadCommissionRate = async () => {
    try {
      const data = await apiGetCommissionRate();
      setCurrentRate(data.commissionRate);
      setInputRate(data.commissionRate.toString());
    } catch {
      toast.error("Failed to load commission rate");
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await apiListBookings(undefined, token);
      const paid = (data.bookings || []).filter(
        (b) => b.paymentStatus === "paid" || b.status === "completed"
      );
      setBookings(paid);
    } catch {
      toast.error("Failed to load commission data");
    } finally {
      setLoading(false);
    }
  };

  const validateAndConfirm = () => {
    const rate = Number(inputRate);
    if (Number.isNaN(rate) || rate < 1 || rate > 100) {
      toast.error("Commission rate must be between 1 and 100");
      return;
    }
    if (rate === currentRate) {
      toast.info("Rate is already set to " + rate + "%");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    const rate = Number(inputRate);
    try {
      setSavingRate(true);
      await apiSaveCommissionRate(rate, token);
      setCurrentRate(rate);
      toast.success(`Commission rate updated to ${rate}%. All new bookings will use this rate.`);
    } catch (error) {
      toast.error(error.message || "Failed to save commission rate");
    } finally {
      setSavingRate(false);
      setShowConfirm(false);
    }
  };

  const commissionRows = bookings.map((booking) => ({
    booking,
    ...getCommissionDetails(booking),
  }));

  // Summary Metrics calculations
  const totalRevenue = commissionRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalAdminEarnings = commissionRows.reduce((sum, row) => sum + row.adminEarning, 0);
  const totalMerchantPayout = commissionRows.reduce((sum, row) => sum + row.payout, 0);
  const unassignedCount = commissionRows.filter((r) => !r.booking.assignedTo).length;

  // Filtered rows
  const filteredRows = commissionRows.filter((row) => {
    const b = row.booking;
    const itemName = b.service?.name || b.serviceName || b.event?.title || b.eventName || "";
    const merchantName = b.assignedTo?.name || "";

    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchName = itemName.toLowerCase().includes(term);
      const matchMerchant = merchantName.toLowerCase().includes(term);
      const matchCustomer = (b.customer?.name || "").toLowerCase().includes(term);
      if (!matchName && !matchMerchant && !matchCustomer) return false;
    }

    // Type Filter
    if (typeFilter !== "all") {
      const isEvent = !!(b.event || b.eventName);
      if (typeFilter === "event" && !isEvent) return false;
      if (typeFilter === "service" && isEvent) return false;
    }

    // Merchant Filter
    if (merchantFilter !== "all") {
      if (merchantFilter === "assigned" && !b.assignedTo) return false;
      if (merchantFilter === "unassigned" && b.assignedTo) return false;
    }

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "set" && !row.isSaved) return false;
      if (statusFilter === "not_set" && row.isSaved) return false;
    }

    return true;
  });

  // Reset page to 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, merchantFilter, statusFilter]);

  // Paginated rows
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div className="w-full max-w-[1440px] mx-auto space-y-5">
        {/* ── 1. PAGE HEADER ───────────────────────────────────────── */}
        <PageHeader
          title="Commissions"
          subtitle="Track platform commission and merchant earnings for every booking."
          breadcrumbs={[{ label: "Admin Portal" }, { label: "Payments" }, { label: "Commissions" }]}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRateSettings(!showRateSettings)}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  showRateSettings
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/80 bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Default Rate ({currentRate}%)</span>
              </button>
              <button
                onClick={() => toast.info("Exporting commission report...")}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border border-border/80 bg-card text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Export
              </button>
            </div>
          }
        />

        {/* ── Collapsible Commission Settings Drawer/Card ───────────── */}
        {showRateSettings && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Platform Commission Rate Settings
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Active Rate: <strong className="text-foreground">{currentRate}%</strong>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="commission-rate" className="text-xs font-medium text-muted-foreground shrink-0">
                  New Rate (%):
                </Label>
                <Input
                  id="commission-rate"
                  type="number"
                  value={inputRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setInputRate(val);
                      return;
                    }
                    const rate = Math.trunc(Number(val));
                    if (Number.isNaN(rate)) return;
                    setInputRate(Math.min(100, Math.max(1, rate)).toString());
                  }}
                  className="w-24 h-9 text-xs font-semibold rounded-lg"
                  min="1"
                  max="100"
                  step="1"
                />
              </div>

              <Button
                onClick={validateAndConfirm}
                disabled={savingRate}
                className="h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5"
              >
                {savingRate ? "Updating..." : "Update Rate"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-600 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                Updating the rate affects <strong>new future bookings</strong> only. Existing saved payment records remain unaffected.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── 2. SUMMARY CARDS (82-88px height, 16px padding) ─────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="TOTAL REVENUE"
            value={formatCurrency(totalRevenue)}
            icon={<IndianRupee className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
            tone="bg-sky-500/10"
          />
          <SummaryCard
            title="ADMIN EARNINGS"
            value={formatCurrency(totalAdminEarnings)}
            icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            tone="bg-emerald-500/10"
          />
          <SummaryCard
            title="MERCHANT PAYOUTS"
            value={formatCurrency(totalMerchantPayout)}
            icon={<Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            tone="bg-indigo-500/10"
          />
          <SummaryCard
            title="UNASSIGNED BOOKINGS"
            value={unassignedCount}
            icon={<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            tone="bg-amber-500/10"
          />
        </div>

        {/* ── 3. COMMISSION TABLE CARD (Toolbar + Table + Pagination) ── */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          {/* ── 4. TOOLBAR (Height 56px, 8px radius controls) ───────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 h-[56px] border-b border-border/60 bg-card">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search Field */}
              <div className="relative w-full sm:w-[340px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search service, event or merchant..."
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
                <option value="all">Type</option>
                <option value="service">Service</option>
                <option value="event">Event</option>
              </select>

              {/* Merchant Filter Dropdown */}
              <select
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground cursor-pointer"
              >
                <option value="all">Merchant</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>

              {/* Commission Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-secondary/40 border border-border/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground cursor-pointer"
              >
                <option value="all">Commission</option>
                <option value="set">Set</option>
                <option value="not_set">Not Set</option>
              </select>

              {/* Reset Filters */}
              {(search || typeFilter !== "all" || merchantFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setMerchantFilter("all");
                    setStatusFilter("all");
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
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {filteredRows.length} booking{filteredRows.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── 5. TABLE ───────────────────────────────────────────── */}
          {loading ? (
            <TableSkeleton columns={7} rows={8} minWidth="100%" />
          ) : filteredRows.length === 0 ? (
            <div className="py-16">
              <TableEmptyState
                title="No paid bookings found"
                description="There are no commission records matching your filter criteria."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <DataTable minWidth="760px">
                <TableHeader className="bg-[#FAFBFC] dark:bg-slate-900/90 sticky top-0 z-10 border-b border-border/70 h-[44px]">
                  <TableHeaderCell className="w-[24%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    SERVICE / EVENT
                  </TableHeaderCell>
                  <TableHeaderCell className="w-[16%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    MERCHANT
                  </TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[15%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 text-right">
                    BOOKING
                  </TableHeaderCell>
                  <TableHeaderCell align="center" className="w-[13%] text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    COMMISSION
                  </TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[14%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 text-right">
                    ADMIN EARNINGS
                  </TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[14%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 text-right">
                    PAYOUT
                  </TableHeaderCell>
                  <TableHeaderCell align="center" className="w-[4%] text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                    ACTION
                  </TableHeaderCell>
                </TableHeader>

                <TableBody>
                  {paginatedRows.map(({ booking, adminEarning, payout, rateLabel, isSaved, isAdminBooking }) => {
                    const itemName =
                      booking.service?.name ||
                      booking.serviceName ||
                      booking.event?.title ||
                      booking.eventName ||
                      "Booking";
                    const isEvent = !!(booking.event || booking.eventName);
                    const typeText = isEvent ? "Event" : "Service";
                    const showDash = !isSaved && !isAdminBooking;

                    const hasRateChip = (isSaved || isAdminBooking) && rateLabel !== "N/A" && rateLabel !== "No commission";

                    return (
                      <TableRow
                        key={booking._id}
                        className="group hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors h-[58px]"
                      >
                        {/* SERVICE / EVENT */}
                        <TableCell className="w-[24%] py-2.5">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[14px] text-foreground truncate max-w-[220px]" title={itemName}>
                              {itemName}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  isEvent ? "bg-blue-500" : "bg-emerald-500"
                                }`}
                              />
                              <span>{typeText}</span>
                            </p>
                          </div>
                        </TableCell>

                        {/* MERCHANT */}
                        <TableCell className="w-[16%] py-2.5">
                          {booking.assignedTo ? (
                            <p className="font-medium text-[13px] text-foreground truncate max-w-[140px]" title={booking.assignedTo.name}>
                              {booking.assignedTo.name}
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              Unassigned
                            </span>
                          )}
                        </TableCell>

                        {/* BOOKING AMOUNT */}
                        <TableCell align="right" className="w-[15%] py-2.5 text-right">
                          <span className="font-semibold text-[14px] text-foreground whitespace-nowrap font-mono tabular-nums">
                            {formatCurrency(booking.price)}
                          </span>
                        </TableCell>

                        {/* COMMISSION RATE */}
                        <TableCell align="center" className="w-[13%] py-2.5 text-center">
                          {hasRateChip ? (
                            <span className="h-[24px] min-w-[42px] px-2 text-[11px] font-semibold font-mono rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center justify-center mx-auto whitespace-nowrap">
                              {rateLabel}
                            </span>
                          ) : (
                            <span className="h-[24px] min-w-[42px] px-2 text-[11px] font-medium font-mono rounded-md bg-secondary text-muted-foreground border border-border/60 inline-flex items-center justify-center mx-auto whitespace-nowrap">
                              N/A
                            </span>
                          )}
                        </TableCell>

                        {/* ADMIN EARNINGS */}
                        <TableCell align="right" className="w-[14%] py-2.5 text-right">
                          {showDash ? (
                            <span className="text-muted-foreground font-normal">—</span>
                          ) : (
                            <span className="font-semibold text-[14px] text-foreground whitespace-nowrap font-mono tabular-nums">
                              {formatCurrency(adminEarning)}
                            </span>
                          )}
                        </TableCell>

                        {/* MERCHANT PAYOUT */}
                        <TableCell align="right" className="w-[14%] py-2.5 text-right">
                          {showDash ? (
                            <span className="text-muted-foreground font-normal">—</span>
                          ) : (
                            <span className="font-semibold text-[14px] text-foreground whitespace-nowrap font-mono tabular-nums">
                              {formatCurrency(payout)}
                            </span>
                          )}
                        </TableCell>

                        {/* ACTION */}
                        <TableCell align="center" className="w-[4%] py-2.5 text-center">
                          <button
                            onClick={() => navigate(`/admin-dashboard/payments/${booking._id}`)}
                            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mx-auto focus:outline-none focus:ring-2 focus:ring-primary/20"
                            title="View Commission Details"
                            aria-label="View commission details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTable>
            </motion.div>
          )}

          {/* ── 6. PAGINATION ───────────────────────────────────────── */}
          {!loading && filteredRows.length > 0 && (
            <div className="px-4 py-3 border-t border-border/60 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>–
                <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</span> of{" "}
                <span className="font-semibold text-foreground">{filteredRows.length}</span> bookings
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

      {/* ── Confirmation Dialog for Rate Change ── */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Commission Rate?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are changing the default commission rate from <strong>{currentRate}%</strong> to <strong>{inputRate}%</strong>.
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                ⚠ This will NOT affect any previous payments or saved earnings. All existing transaction records remain unchanged.
              </p>
              <p>
                Only new bookings created after this update will use the new <strong>{inputRate}%</strong> rate.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate} disabled={savingRate}>
              {savingRate ? "Updating..." : "Yes, Update Rate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

/* ─── SUMMARY CARD (Height 84px, Top Label + Bottom Value) ─────────────── */
const SummaryCard = ({ title, value, icon, tone }) => (
  <div className="h-[84px] rounded-xl border border-border/70 bg-card p-4 shadow-xs flex flex-col justify-between">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] truncate">
        {title}
      </p>
      <div className={`h-8 w-8 rounded-lg ${tone} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
    <p className="text-[20px] sm:text-[22px] font-bold tracking-tight text-foreground truncate font-mono leading-none">
      {value}
    </p>
  </div>
);

export default AdminCommissions;
