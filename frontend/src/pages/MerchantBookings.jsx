import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import {
  ExternalLink,
  Check,
  X,
  CreditCard,
  Search,
  Eye
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiAssignedBookings,
  apiUpdateBookingStatus,
  apiRejectBooking,
  apiApproveCancel,
  apiRejectCancel,
  apiProcessRefund
} from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  pending_approval: { label: "Pending Approval", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  approved: { label: "Approved", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  accepted: { label: "Accepted", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20" },
  processing: { label: "Processing", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  awaiting_final_payment: { label: "Awaiting Final", className: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20" },
  cancellation_requested: { label: "Cancel Requested", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  cancellation_fee_proposed: { label: "Fee Proposed", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  refund_pending: { label: "Refund Pending", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  refunded: { label: "Refunded", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "rejected", label: "Rejected" },
];

const formatBookingDate = (dateStr) => {
  if (!dateStr) return { date: "—", time: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: "—", time: "" };
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    return { date, time };
  } catch {
    return { date: "—", time: "" };
  }
};

const getLocationInfo = (b) => {
  if (b.customerLocation && b.customerLocation.address) {
    const address = b.customerLocation.address;
    const lat = b.customerLocation.latitude;
    const lng = b.customerLocation.longitude;
    const mapUrl = lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    return { text: address, mapUrl };
  }
  if (b.event?.location) {
    const address = b.event.location;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    return { text: address, mapUrl };
  }
  return { text: "—", mapUrl: null };
};

const MerchantBookings = ({ layout = "merchant" } = {}) => {
  const PageLayout = layout === "admin" ? AdminLayout : MerchantLayout;
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [approving, setApproving] = useState(null);
  const [approvalOptions, setApprovalOptions] = useState({ id: "", show: false });
  const [customAdvance, setCustomAdvance] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [cancellationModal, setCancellationModal] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [cancelFeeOption, setCancelFeeOption] = useState("preset");
  const [customCancelFee, setCustomCancelFee] = useState("");
  const [submittingCancelAction, setSubmittingCancelAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rowsRef = useGsapStagger([items, tab, searchTerm, statusFilter], { y: 6, stagger: 0.02 });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiAssignedBookings(token);
      setItems(res.bookings || []);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useRealtimeEvent("realtime:booking-update", () => {
    load();
  });

  const sortLatestBookingsFirst = (list) => {
    return [...list].sort(
      (a, b) => new Date(b.createdAt || b.datetime || 0).getTime() - new Date(a.createdAt || a.datetime || 0).getTime()
    );
  };

  const isHistoryStatus = (s) => ["completed", "cancelled", "rejected", "refunded"].includes(s);
  const activeItems = sortLatestBookingsFirst(items.filter((b) => !isHistoryStatus(b.status)));
  const historyItems = sortLatestBookingsFirst(items.filter((b) => isHistoryStatus(b.status)));
  const displayItems = tab === "active" ? activeItems : historyItems;

  const filteredDisplayItems = displayItems.filter((b) => {
    const matchesSearch =
      !searchTerm ||
      (b.service?.name || b.event?.title || b.serviceName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customer?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customerLocation?.address || b.event?.location || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (id, paymentType = "full", customAdvanceAmount) => {
    setApproving(id);
    try {
      const body = { paymentType };
      if (paymentType === "advance" && customAdvanceAmount) {
        body.customAdvanceAmount = customAdvanceAmount;
      }
      const res = await fetch(`${API_URL}/api/bookings/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Failed to approve booking");
      toast.success(
        paymentType === "advance"
          ? `Booking approved with advance payment of ${formatCurrency(customAdvanceAmount || "30%")}!`
          : "Booking approved with full payment requirement!"
      );
      setApprovalOptions({ id: "", show: false });
      setCustomAdvance("");
      setShowCustomInput(false);
      load();
    } catch (e) {
      toast.error(e.message || "Failed to approve booking");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRejectBooking(id, token);
      toast.success("Booking rejected");
      load();
    } catch (e) {
      toast.error(e.message || "Failed to reject booking");
    }
  };

  const handleApproveCancel = async (feeOption) => {
    if (!selectedCancelBooking) return;
    let fee = 0;
    if (feeOption === "custom") {
      fee = parseFloat(customCancelFee);
      if (isNaN(fee) || fee < 0) {
        toast.error("Please enter a valid cancellation fee amount");
        return;
      }
      if (fee > selectedCancelBooking.price) {
        toast.error("Cancellation fee cannot exceed total booking price");
        return;
      }
    } else if (feeOption === "preset") {
      fee = selectedCancelBooking.price * 0.3;
    }
    setSubmittingCancelAction(true);
    try {
      await apiApproveCancel(selectedCancelBooking._id, fee, token);
      toast.success("Cancellation approved and fee proposed successfully!");
      setCancellationModal(false);
      setSelectedCancelBooking(null);
      setCustomCancelFee("");
      setCancelFeeOption("preset");
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to approve cancellation");
    } finally {
      setSubmittingCancelAction(false);
    }
  };

  const handleRejectCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to reject this cancellation request? The booking status will be restored."))
      return;
    setSubmittingCancelAction(true);
    try {
      await apiRejectCancel(bookingId, token);
      toast.success("Cancellation request rejected successfully!");
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to reject cancellation request");
    } finally {
      setSubmittingCancelAction(false);
    }
  };

  const handleProcessRefund = async (bookingId) => {
    if (!window.confirm("Are you sure you want to process the refund? This will deposit the remaining amount into the user's wallet."))
      return;
    setSubmittingCancelAction(true);
    try {
      await apiProcessRefund(bookingId, token);
      toast.success("Refund processed successfully!");
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to process refund");
    } finally {
      setSubmittingCancelAction(false);
    }
  };

  return (
    <PageLayout>
      <div className="w-full max-w-full px-6 py-5 space-y-4 font-sans">
        {/* Compact Integrated Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-h-[44px]">
          {/* Left: Active & History Tabs */}
          <div className="inline-flex items-center p-1 bg-secondary/60 rounded-xl border border-border/60 w-fit">
            <button
              onClick={() => setTab("active")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === "active"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({activeItems.length})
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === "history"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History ({historyItems.length})
            </button>
          </div>

          {/* Right: Search & Filter */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8.5 pr-7 h-9 text-xs bg-card border-border/70 rounded-xl focus-visible:ring-1 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-card border border-border/70 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 shrink-0 font-medium cursor-pointer shadow-2xs"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {loading ? (
            <TableSkeleton columns={6} rows={6} minWidth="100%" />
          ) : filteredDisplayItems.length === 0 ? (
            <TableEmptyState
              title={`No ${tab} bookings found`}
              description={
                searchTerm
                  ? "No bookings match your current search and filter criteria."
                  : `Your ${tab} bookings will appear here.`
              }
              colSpan={6}
            />
          ) : (
            <>
              {/* Premium SaaS Table Container */}
              <div className="hidden md:block rounded-[14px] border border-border/60 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] w-full">
                <DataTable minWidth="100%">
                  <TableHeader className="bg-muted/25 border-b border-border/50">
                    <TableHeaderCell className="w-[23%] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Booking
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[18%] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Customer
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[19%] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Location
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[15%] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Date & Time
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[15%] min-w-[140px] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Status
                    </TableHeaderCell>
                    <TableHeaderCell align="right" className="w-[10%] py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Action
                    </TableHeaderCell>
                  </TableHeader>
                  <TableBody ref={rowsRef}>
                    {filteredDisplayItems.map((b) => {
                      const detailUrl = `${layout === "admin" ? "/admin-dashboard/bookings/" : "/merchant-dashboard/bookings/"}${b._id}`;
                      const title = b.service?.name || b.event?.title || b.serviceName || "Booking";
                      const category = b.service?.category || b.event?.category;
                      const dateFormatted = formatBookingDate(b.datetime);
                      const locationInfo = getLocationInfo(b);
                      const statusConfig = STATUS_CONFIG[b.status] || {
                        label: (b.status || "Unknown").replace(/_/g, " "),
                        className: "bg-muted text-muted-foreground border-border/60"
                      };

                      return (
                        <TableRow
                          key={b._id}
                          className="hover:bg-muted/25 transition-colors cursor-pointer group border-b border-border/40 last:border-b-0"
                          onClick={() => navigate(detailUrl)}
                        >
                          {/* Booking Column */}
                          <TableCell className="py-2.5 align-middle">
                            <div className="min-w-0 pr-2">
                              <span
                                className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors block truncate"
                                title={title}
                              >
                                {title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {b.service ? (
                                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    Service
                                  </span>
                                ) : b.event ? (
                                  <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                                    Event
                                  </span>
                                ) : null}
                                {category && (
                                  <span className="text-[11px] text-muted-foreground truncate" title={category}>
                                    {b.service || b.event ? `• ${category}` : category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Customer Column */}
                          <TableCell className="py-2.5 align-middle">
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-[13px] text-foreground truncate" title={b.customer?.name}>
                                {b.customer?.name || "—"}
                              </div>
                              {b.customer?.email && (
                                <div className="text-[11px] text-muted-foreground truncate mt-[2px]" title={b.customer.email}>
                                  {b.customer.email}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Location Column */}
                          <TableCell className="py-2.5 align-middle">
                            <div className="min-w-0 pr-2">
                              <div className="text-[12.5px] text-foreground/90 truncate" title={locationInfo.text}>
                                {locationInfo.text}
                              </div>
                              {locationInfo.mapUrl && (
                                <a
                                  href={locationInfo.mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] text-muted-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-0.5 mt-[2px]"
                                >
                                  View map <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Date & Time Column */}
                          <TableCell className="py-2.5 align-middle whitespace-nowrap">
                            <div className="text-[12.5px] font-medium text-foreground">{dateFormatted.date}</div>
                            {dateFormatted.time && (
                              <div className="text-[11px] text-muted-foreground mt-[2px]">{dateFormatted.time}</div>
                            )}
                          </TableCell>

                          {/* Status Column */}
                          <TableCell className="py-2.5 align-middle whitespace-nowrap min-w-[140px]">
                            <span className={`inline-flex items-center justify-center h-[26px] min-h-[26px] px-2.5 rounded-full text-[12px] font-medium border whitespace-nowrap leading-none w-auto ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </TableCell>

                          {/* Action Column */}
                          <TableCell align="right" className="py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => navigate(detailUrl)}
                                title="View Details"
                                className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </DataTable>
              </div>

              {/* Mobile Booking Card List Transformation */}
              <div className="md:hidden space-y-3">
                {filteredDisplayItems.map((b) => {
                  const detailUrl = `${layout === "admin" ? "/admin-dashboard/bookings/" : "/merchant-dashboard/bookings/"}${b._id}`;
                  const title = b.service?.name || b.event?.title || b.serviceName || "Booking";
                  const category = b.service?.category || b.event?.category;
                  const dateFormatted = formatBookingDate(b.datetime);
                  const locationInfo = getLocationInfo(b);
                  const statusConfig = STATUS_CONFIG[b.status] || {
                    label: (b.status || "Unknown").replace(/_/g, " "),
                    className: "bg-muted text-muted-foreground border-border/60"
                  };

                  return (
                    <div
                      key={b._id}
                      onClick={() => navigate(detailUrl)}
                      className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-foreground truncate" title={title}>
                            {title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            {b.service ? (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                Service
                              </span>
                            ) : b.event ? (
                              <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                                Event
                              </span>
                            ) : null}
                            {category && <span className="text-[11px] text-muted-foreground truncate">• {category}</span>}
                          </div>
                        </div>
                        <span className={`inline-flex items-center justify-center h-[26px] min-h-[26px] px-2.5 rounded-full text-[11.5px] font-medium border whitespace-nowrap leading-none w-auto shrink-0 ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Customer</span>
                          <span className="font-medium text-foreground truncate block">{b.customer?.name || "—"}</span>
                          <span className="text-[10px] text-muted-foreground truncate block">{b.customer?.email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Date & Time</span>
                          <span className="font-medium text-foreground block">{dateFormatted.date}</span>
                          <span className="text-[10px] text-muted-foreground block">{dateFormatted.time}</span>
                        </div>
                      </div>

                      {locationInfo.text !== "—" && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                          <div className="text-muted-foreground truncate flex-1 min-w-0 pr-2">
                            <span className="truncate">{locationInfo.text}</span>
                          </div>
                          {locationInfo.mapUrl && (
                            <a
                              href={locationInfo.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5 shrink-0"
                            >
                              Map <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-semibold px-3 rounded-xl"
                          onClick={() => navigate(detailUrl)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

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
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 group cursor-pointer"
                  onClick={() => {
                    setShowCustomInput(false);
                    handleApprove(approvalOptions.id, "advance");
                  }}
                  disabled={approving === approvalOptions.id}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                    <CreditCard className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-orange-400 text-sm">Require 30% Advance</p>
                    <p className="text-xs text-orange-400/70">Customer pays 30% now to confirm, remaining 70% after service.</p>
                  </div>
                </button>

                {/* Custom Advance Amount */}
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-4 p-4 hover:bg-yellow-500/20 transition-all duration-200 group cursor-pointer"
                    onClick={() => {
                      setShowCustomInput(!showCustomInput);
                      setCustomAdvance("");
                    }}
                    disabled={approving === approvalOptions.id}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                      <CreditCard className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-yellow-400 text-sm">Custom Advance Amount</p>
                      <p className="text-xs text-yellow-400/70">Set a specific advance amount for the customer to pay.</p>
                    </div>
                    <span className="text-yellow-400 text-sm">{showCustomInput ? "▲" : "▼"}</span>
                  </button>
                  {showCustomInput && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-bold text-base">₹</span>
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
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold cursor-pointer"
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
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all duration-200 group cursor-pointer"
                  onClick={() => {
                    setShowCustomInput(false);
                    handleApprove(approvalOptions.id, "full");
                  }}
                  disabled={approving === approvalOptions.id}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-green-400 text-sm">Require Full Payment</p>
                    <p className="text-xs text-green-400/70">Customer pays 100% now to confirm the booking.</p>
                  </div>
                </button>
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    setApprovalOptions({ id: "", show: false });
                    setShowCustomInput(false);
                    setCustomAdvance("");
                  }}
                  disabled={approving === approvalOptions.id}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Cancellation Modal */}
        {cancellationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
              <h3 className="font-display text-xl font-bold mb-2 text-center text-amber-500">Approve Cancellation</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Specify a cancellation fee for this booking. The remaining amount will be refunded to the customer once they accept.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApproveCancel(cancelFeeOption);
                }}
                className="space-y-4"
              >
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Booking Price: <span className="font-bold text-foreground">{formatCurrency(selectedCancelBooking?.price || 0)}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold block">Cancellation Fee Policy</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="cancelFeeOption"
                        checked={cancelFeeOption === "preset"}
                        onChange={() => setCancelFeeOption("preset")}
                        className="accent-primary"
                      />
                      Standard 30% Fee ({formatCurrency(Math.round((selectedCancelBooking?.price || 0) * 0.3))})
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="cancelFeeOption"
                        checked={cancelFeeOption === "custom"}
                        onChange={() => setCancelFeeOption("custom")}
                        className="accent-primary"
                      />
                      Custom Cancellation Fee
                    </label>
                  </div>
                </div>

                {cancelFeeOption === "custom" && (
                  <div>
                    <label className="text-xs font-semibold block mb-1">Custom Fee Amount</label>
                    <input
                      type="number"
                      min="0"
                      max={selectedCancelBooking?.price || 0}
                      step="any"
                      placeholder="Enter fee amount..."
                      value={customCancelFee}
                      onChange={(e) => setCustomCancelFee(e.target.value)}
                      required
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Cannot exceed the booking price.</p>
                  </div>
                )}

                <div className="p-3 bg-secondary rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Original Price:</span>
                    <span>{formatCurrency(selectedCancelBooking?.price || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-rose-500">
                    <span>Cancellation Fee:</span>
                    <span>
                      {formatCurrency(
                        cancelFeeOption === "preset"
                          ? Math.round((selectedCancelBooking?.price || 0) * 0.3)
                          : Number(customCancelFee) || 0
                      )}
                    </span>
                  </div>
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between font-bold text-emerald-500">
                    <span>Estimated Customer Refund:</span>
                    <span>
                      {formatCurrency(
                        Math.max(
                          0,
                          (selectedCancelBooking?.price || 0) -
                            (cancelFeeOption === "preset"
                              ? Math.round((selectedCancelBooking?.price || 0) * 0.3)
                              : Number(customCancelFee) || 0)
                        )
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <Button type="button" variant="outline" onClick={() => setCancellationModal(false)} className="cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingCancelAction} className="bg-gradient-primary text-white cursor-pointer">
                    {submittingCancelAction ? "Approving..." : "Approve Cancellation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default MerchantBookings;
