import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Send,
  MessageSquare,
  XCircle,
  FileText,
  MoreVertical,
  Play,
  X,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  apiGetBooking,
  apiUpdateBookingStatus,
  apiCompleteBooking,
  apiRejectBooking,
  apiApproveCancel,
  apiRejectCancel,
  apiProcessRefund
} from "@/lib/api";
import { API_URL } from "@/lib/config";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

// 5-Step Progress Tracker
const LIFECYCLE_STEPS = [
  { id: "request", label: "Request" },
  { id: "approved", label: "Approved" },
  { id: "payment", label: "Payment" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export default function MerchantBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Approval mode selection
  const [approvalMode, setApprovalMode] = useState("advance");
  const [customAdvance, setCustomAdvance] = useState("");
  const [approving, setApproving] = useState(false);

  // Rejection & Cancel Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Cancellation handling state (customer requested cancellation)
  const [cancelFeeOption, setCancelFeeOption] = useState("preset");
  const [customCancelFee, setCustomCancelFee] = useState("");
  const [processingCancel, setProcessingCancel] = useState(false);

  const loadBooking = async () => {
    if (!token || !id) return;
    try {
      const res = await apiGetBooking(id, token);
      if (res.booking) {
        setBooking(res.booking);
      } else {
        setError("Booking not found");
      }
    } catch (e) {
      setError(e?.message || "Failed to load booking details");
      toast.error(e?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id, token]);

  useRealtimeRefresh(["bookings", "merchant"], loadBooking);

  const handleCopyId = () => {
    if (!booking?._id) return;
    navigator.clipboard.writeText(booking._id);
    setCopiedId(true);
    toast.success("Booking ID copied");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Direct status transition API call
  const handleTransitionStatus = async (targetStatus, successMessage) => {
    setActionLoading(true);
    try {
      await apiUpdateBookingStatus(id, targetStatus, token);
      toast.success(successMessage || `Booking status updated to ${targetStatus.replace(/_/g, " ")}`);
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to update booking status");
    } finally {
      setActionLoading(false);
    }
  };

  // Complete booking
  const handleMarkCompleted = async () => {
    setActionLoading(true);
    try {
      await apiCompleteBooking(id, token);
      toast.success("Booking marked as completed!");
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to complete booking");
    } finally {
      setActionLoading(false);
    }
  };

  // Approval with payment terms
  const handleApproveWithPaymentType = async () => {
    setApproving(true);
    try {
      const body = { paymentType: approvalMode };
      if (approvalMode === "advance" && customAdvance) {
        body.customAdvanceAmount = Number(customAdvance);
      }
      const res = await fetch(`${API_URL}/api/bookings/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to approve booking");
      }
      toast.success(
        approvalMode === "advance"
          ? `Booking approved! Customer notified to pay advance.`
          : "Booking approved with 100% full payment requirement!"
      );
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to approve booking");
    } finally {
      setApproving(false);
    }
  };

  // Reject / Cancel booking action
  const handleConfirmRejectOrCancel = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    setRejecting(true);
    try {
      await apiRejectBooking(id, rejectionReason, token);
      toast.success("Booking cancelled / rejected successfully");
      setShowRejectModal(false);
      setRejectionReason("");
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to cancel booking");
    } finally {
      setRejecting(false);
    }
  };

  // Customer cancellation approval
  const handleApproveCancel = async () => {
    if (!booking) return;
    setProcessingCancel(true);
    try {
      let fee = 0;
      if (cancelFeeOption === "preset") {
        fee = Math.round((booking.price || 0) * 0.3);
      } else if (cancelFeeOption === "custom") {
        fee = Number(customCancelFee) || 0;
      }
      await apiApproveCancel(booking._id, fee, token);
      toast.success(`Cancellation fee proposal of ${formatCurrency(fee)} submitted`);
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to approve cancellation");
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleRejectCancel = async () => {
    setProcessingCancel(true);
    try {
      await apiRejectCancel(booking._id, token);
      toast.success("Cancellation request declined");
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to reject cancellation");
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleProcessRefundAction = async () => {
    setProcessingCancel(true);
    try {
      await apiProcessRefund(booking._id, token);
      toast.success("Refund processed successfully!");
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to process refund");
    } finally {
      setProcessingCancel(false);
    }
  };

  // Compute 5-Step Progress Tracker Index
  const getStepIndex = (b) => {
    if (!b) return 0;
    const { status, paymentStatus } = b;

    if (["cancelled", "rejected"].includes(status)) return -1;
    if (status === "completed") return 4;
    if (status === "processing" || status === "in_progress") return 3;
    if (
      status === "accepted" ||
      paymentStatus === "paid" ||
      paymentStatus === "partially_paid" ||
      status === "paid" ||
      status === "confirmed"
    ) {
      return 3;
    }
    if (status === "approved" || status === "awaiting_payment") return 2; // Step 2 is "Payment"
    return 0; // pending / pending_approval (Step 0 is "Request")
  };

  const primaryHeaderStatus = (() => {
    if (!booking) return "pending";
    const { status, paymentStatus } = booking;
    if (["cancelled", "rejected"].includes(status)) return "cancelled";
    if (status === "completed") return "completed";
    if (status === "cancellation_requested") return "cancellation_requested";
    if (status === "refund_pending") return "refund_pending";
    if (status === "processing" || status === "in_progress") return "in_progress";
    if (status === "accepted") return "accepted";
    if (paymentStatus === "paid" || paymentStatus === "partially_paid" || status === "paid" || status === "confirmed") {
      return "paid";
    }
    if (status === "approved" || status === "awaiting_payment") return "awaiting_payment";
    return "pending_approval";
  })();

  const currentStepIndex = booking ? getStepIndex(booking) : 0;
  const isCancelled = ["cancelled", "rejected"].includes(booking?.status);
  const isCompleted = booking?.status === "completed";

  // Financial Breakdown calculations
  const price = booking?.price || 0;
  const isAdvanceModel = booking?.paymentType === "advance";
  const defaultAdvance = Math.round(price * 0.3);
  const advanceRequired = isAdvanceModel ? (booking?.advanceAmount || defaultAdvance) : price;

  const calculatedAdvanceAmount = customAdvance !== "" && !isNaN(Number(customAdvance))
    ? Number(customAdvance)
    : defaultAdvance;

  const advancePercentage = price > 0 ? Math.round((calculatedAdvanceAmount / price) * 100) : 30;

  const paidAmount = (() => {
    if (!booking) return 0;
    if (booking.paymentStatus === "paid") return price;
    if (booking.paymentStatus === "partially_paid" || booking.isAdvancePaid) {
      return booking.advanceAmount || defaultAdvance;
    }
    return booking.walletAmountPaid || 0;
  })();

  const balanceAmount = Math.max(0, price - paidAmount);

  return (
    <MerchantLayout>
      <div className="w-full min-w-0 space-y-4 pb-12 font-sans">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-secondary cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Bookings
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadBooking}
              disabled={loading}
              className="h-8 px-3 text-xs gap-1.5 border-border/70 bg-card hover:bg-secondary cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-xs gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="font-medium text-sm text-foreground">Loading booking details...</p>
          </div>
        ) : error || !booking ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500/80" />
            <h3 className="text-lg font-bold text-foreground mb-1">{error || "Booking Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The requested booking does not exist or is not assigned to your merchant account.
            </p>
            <Button onClick={() => navigate("/merchant-dashboard/bookings")} className="cursor-pointer bg-gradient-primary">
              Return to Bookings List
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── ONE UNIFIED BOOKING WORKSPACE CONTAINER ───────────────── */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6">
              
              {/* A. TOP BOOKING HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {booking.service?.name || booking.event?.title || booking.serviceName || "Service Booking"}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {booking.service ? "Service Booking" : "Event Booking"}
                    </span>
                    <span>•</span>
                    <button
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy Booking ID"
                    >
                      #{booking._id?.slice(-8).toUpperCase()}
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <span>•</span>
                    <span>
                      {booking.datetime
                        ? new Date(booking.datetime).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          }) +
                          " • " +
                          new Date(booking.datetime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : new Date(booking.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                    </span>
                  </div>
                </div>

                {/* Right side SINGLE primary status badge + 3-dot menu */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <StatusBadge status={primaryHeaderStatus} className="text-xs px-3 py-1 font-semibold" />

                  {/* Dropdown Menu for Secondary Actions */}
                  {!isCancelled && booking.status !== "completed" && (
                    <div className="relative ml-1">
                      <button
                        onClick={() => setShowMoreActions(!showMoreActions)}
                        className="h-8 w-8 rounded-xl border border-border/70 bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="More Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {showMoreActions && (
                        <div
                          className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg p-1 z-30 space-y-0.5"
                          onClick={() => setShowMoreActions(false)}
                        >
                          <button
                            onClick={() => setShowRejectModal(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* B. PROGRESS TRACKER */}
              {!isCancelled ? (
                <div className="pb-1">
                  <div className="flex items-center justify-between max-w-3xl mx-auto px-2 relative">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const isPast = currentStepIndex > idx;
                      const isCurrent = currentStepIndex === idx;
                      const isFullyDone = isCompleted || isPast;

                      return (
                        <div key={step.id} className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-initial">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                                isFullyDone
                                  ? "bg-emerald-500 text-white"
                                  : isCurrent
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                                  : "border border-muted-foreground/30 text-muted-foreground/50 bg-background"
                              }`}
                            >
                              {isFullyDone ? (
                                <Check className="h-3 w-3 stroke-[3]" />
                              ) : isCurrent ? (
                                <div className="h-2 w-2 rounded-full bg-current" />
                              ) : null}
                            </div>

                            <span
                              className={`text-xs font-medium whitespace-nowrap ${
                                isFullyDone || isCurrent
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground/70"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>

                          {idx < LIFECYCLE_STEPS.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 mx-2 transition-colors ${
                                isPast || (isCompleted && idx < LIFECYCLE_STEPS.length - 1)
                                  ? "bg-emerald-500"
                                  : "bg-border"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>This booking has been cancelled / declined. Lifecycle updates are locked.</span>
                </div>
              )}

              <div className="border-t border-border/50 pt-5 space-y-6">
                
                {/* C. CURRENT SITUATION / CONTEXTUAL ACTION AREA */}

                {/* CASE 1: PENDING APPROVAL (NEW BOOKING REQUEST) */}
                {(booking.status === "pending" || booking.status === "pending_approval") && !booking.approvedAt && (
                  <div className="space-y-5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                        ACTION REQUIRED
                      </span>
                      <h2 className="text-lg font-bold text-foreground">New Booking Request</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Review details and choose how the customer should pay.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-xs font-medium text-muted-foreground">Booking Total</span>
                      <span className="text-lg font-bold text-foreground">{formatCurrency(price)}</span>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-foreground block">
                        Choose payment terms:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setApprovalMode("advance")}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all min-h-[80px] flex flex-col justify-between ${
                            approvalMode === "advance"
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border bg-card hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                              approvalMode === "advance" ? "border-primary bg-primary" : "border-muted-foreground/40"
                            }`}>
                              {approvalMode === "advance" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-semibold text-xs text-foreground">Advance Payment</span>
                          </div>
                          <div className="pl-6 mt-1 space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{formatCurrency(calculatedAdvanceAmount)} now</p>
                            <p className="text-[11px] text-muted-foreground">{advancePercentage}% upfront</p>
                          </div>
                        </div>

                        <div
                          onClick={() => setApprovalMode("full")}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all min-h-[80px] flex flex-col justify-between ${
                            approvalMode === "full"
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border bg-card hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                              approvalMode === "full" ? "border-primary bg-primary" : "border-muted-foreground/40"
                            }`}>
                              {approvalMode === "full" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-semibold text-xs text-foreground">Full Payment</span>
                          </div>
                          <div className="pl-6 mt-1 space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{formatCurrency(price)} now</p>
                            <p className="text-[11px] text-muted-foreground">100% upfront</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {approvalMode === "advance" && (
                      <div className="space-y-1.5 max-w-xs">
                        <label className="text-xs font-medium text-foreground block">Advance amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            value={customAdvance !== "" ? customAdvance : defaultAdvance}
                            onChange={(e) => setCustomAdvance(e.target.value)}
                            className="pl-7 text-xs h-9 font-medium bg-background"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {advancePercentage}% of {formatCurrency(price)} total booking amount
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Customer will be asked to pay <strong className="text-foreground font-semibold">{formatCurrency(approvalMode === "advance" ? calculatedAdvanceAmount : price)}</strong> after approval.
                      </p>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer text-xs h-9 px-4 font-medium"
                          onClick={() => setShowRejectModal(true)}
                        >
                          Decline
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground font-bold px-6 text-xs h-9 cursor-pointer shadow-xs"
                          onClick={handleApproveWithPaymentType}
                          disabled={approving}
                        >
                          {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                          Approve Booking
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASE 2: AWAITING CUSTOMER PAYMENT */}
                {(booking.status === "approved" || booking.status === "awaiting_payment") &&
                  booking.paymentStatus !== "paid" &&
                  booking.paymentStatus !== "partially_paid" && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">
                          CURRENT STATUS
                        </span>
                        <h2 className="text-lg font-bold text-foreground">Waiting for Customer Payment</h2>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {formatCurrency(advanceRequired)} {isAdvanceModel ? "advance payment requested" : "full payment requested"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Customer needs to complete payment before the booking can move forward.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>No action required — status updates automatically after payment.</span>
                      </div>
                    </div>
                  )}

                {/* CASE 3: PAYMENT RECEIVED */}
                {(booking.paymentStatus === "paid" || booking.paymentStatus === "partially_paid" || booking.status === "paid" || booking.status === "confirmed") &&
                  booking.status !== "accepted" &&
                  booking.status !== "processing" &&
                  booking.status !== "completed" &&
                  !isCancelled && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                          PAYMENT CONFIRMED
                        </span>
                        <h2 className="text-lg font-bold text-foreground">Payment Received</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ✓ <strong className="text-foreground">{formatCurrency(paidAmount)}</strong> received successfully. Ready for service schedule acceptance.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground font-bold px-6 text-xs h-9 cursor-pointer shadow-xs self-start sm:self-auto"
                        onClick={() => handleTransitionStatus("accepted", "Service schedule accepted & preparation started!")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                        Accept &amp; Start Preparation
                      </Button>
                    </div>
                  )}

                {/* CASE 4: ACCEPTED */}
                {booking.status === "accepted" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-500 block mb-1">
                        PREPARATION READY
                      </span>
                      <h2 className="text-lg font-bold text-foreground">Service Schedule Accepted</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Preparation completed. Click start when event/service commences.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground font-bold px-6 text-xs h-9 cursor-pointer shadow-xs self-start sm:self-auto"
                      onClick={() => handleTransitionStatus("processing", "Service status updated to In Progress")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                      Start Service
                    </Button>
                  </div>
                )}

                {/* CASE 5: IN PROGRESS */}
                {(booking.status === "processing" || booking.status === "in_progress") && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500 block mb-1">
                        ACTIVE FULFILLMENT
                      </span>
                      <h2 className="text-lg font-bold text-foreground">Service In Progress</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        The booking is currently being fulfilled. Mark as completed once finished.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 text-xs h-9 cursor-pointer shadow-xs self-start sm:self-auto"
                      onClick={handleMarkCompleted}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      Mark as Completed
                    </Button>
                  </div>
                )}

                {/* CASE 6: CANCELLATION REQUESTED */}
                {booking.status === "cancellation_requested" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                      <div>
                        <h2 className="font-bold text-base text-foreground">Customer Requested Cancellation</h2>
                        <p className="text-xs text-muted-foreground">
                          Specify cancellation fee terms to proceed.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCancelFeeOption("preset")}
                        className={`p-3 rounded-xl border text-left cursor-pointer ${
                          cancelFeeOption === "preset"
                            ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
                            : "border-border bg-card hover:bg-secondary/40"
                        }`}
                      >
                        <p className="font-semibold text-xs text-foreground">Standard 30% Fee</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Fee: {formatCurrency(Math.round(price * 0.3))} | Refund: {formatCurrency(price - Math.round(price * 0.3))}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCancelFeeOption("custom")}
                        className={`p-3 rounded-xl border text-left cursor-pointer ${
                          cancelFeeOption === "custom"
                            ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
                            : "border-border bg-card hover:bg-secondary/40"
                        }`}
                      >
                        <p className="font-semibold text-xs text-foreground">Custom Fee / Full Refund</p>
                        {cancelFeeOption === "custom" && (
                          <Input
                            type="number"
                            placeholder="Enter fee amount (0 for full refund)"
                            value={customCancelFee}
                            onChange={(e) => setCustomCancelFee(e.target.value)}
                            className="h-7 text-xs bg-background mt-1.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRejectCancel}
                        disabled={processingCancel}
                        className="text-xs cursor-pointer h-8"
                      >
                        Decline Request
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer h-8"
                        onClick={handleApproveCancel}
                        disabled={processingCancel}
                      >
                        {processingCancel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Approve &amp; Propose Fee
                      </Button>
                    </div>
                  </div>
                )}

                {/* CASE 7: REFUND PENDING */}
                {booking.status === "refund_pending" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-base text-foreground">Customer Accepted Cancellation Fee</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Refund Amount:{" "}
                        <span className="font-bold text-purple-600">
                          {formatCurrency(price - (booking.cancellationFee || 0))}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer h-9 shrink-0"
                      onClick={handleProcessRefundAction}
                      disabled={processingCancel}
                    >
                      {processingCancel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      Process Refund Now
                    </Button>
                  </div>
                )}

                {/* CASE 8: COMPLETED */}
                {isCompleted && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block">
                      BOOKING COMPLETED
                    </span>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      ✓ Service Fulfilled Successfully
                    </h2>
                    {balanceAmount > 0 ? (
                      <p className="text-xs text-amber-500 font-semibold mt-1">
                        Payment Remaining: {formatCurrency(balanceAmount)}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-500 font-semibold mt-1">
                        ✓ Payment settled in full
                      </p>
                    )}
                  </div>
                )}

                {/* CASE 9: CANCELLED */}
                {isCancelled && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                      BOOKING CANCELLED
                    </span>
                    <h2 className="text-lg font-bold text-foreground">This booking was declined or cancelled.</h2>
                  </div>
                )}

                {/* D. BOTTOM THREE-COLUMN INFORMATION GRID */}
                <div className="border-t border-border/50 pt-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* COLUMN 1: BOOKING */}
                    <div className="space-y-3 md:border-r border-border/50 md:pr-6">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        BOOKING
                      </span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Service</span>
                          <span className="font-semibold text-foreground text-sm block mt-0.5">
                            {booking.service?.name || booking.event?.title || booking.serviceName || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Date &amp; Time</span>
                          <span className="font-semibold text-foreground text-xs block mt-0.5">
                            {booking.datetime
                              ? new Date(booking.datetime).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                }) +
                                " • " +
                                new Date(booking.datetime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "Scheduled"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Location</span>
                          <span className="font-semibold text-foreground text-xs block mt-0.5">
                            {booking.customerLocation?.address || booking.event?.location || "Provided by customer"}
                          </span>
                          {booking.customerLocation?.latitude && (
                            <a
                              href={`https://www.google.com/maps?q=${booking.customerLocation.latitude},${booking.customerLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-semibold mt-1"
                            >
                              View Map <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: CUSTOMER */}
                    <div className="space-y-3 md:border-r border-border/50 md:pr-6">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        CUSTOMER
                      </span>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Name</span>
                          <span className="font-semibold text-foreground text-sm block mt-0.5">
                            {booking.customer?.name || "Customer"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Email</span>
                          <span className="font-semibold text-foreground text-xs block mt-0.5 truncate" title={booking.customer?.email}>
                            {booking.customer?.email || "—"}
                          </span>
                        </div>
                        {booking.notes && (
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Note</span>
                            <p className="p-2 bg-secondary/50 rounded text-foreground/90 italic text-[11px] mt-0.5">
                              "{booking.notes}"
                            </p>
                          </div>
                        )}
                        <div className="pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/merchant-dashboard/inbox")}
                            className="w-full h-8 text-xs font-medium gap-1.5 border-border/80 hover:bg-secondary cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-primary" /> Message Customer
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: PAYMENT */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        PAYMENT
                      </span>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-border/40">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-foreground text-sm">{formatCurrency(price)}</span>
                        </div>

                        <div className="flex items-center justify-between pb-1 border-b border-border/40">
                          <span className="text-muted-foreground">Paid</span>
                          <span className={`font-bold ${paidAmount > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {formatCurrency(paidAmount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pb-1 border-b border-border/40">
                          <span className="text-muted-foreground">Due</span>
                          <span className={`font-bold text-sm ${balanceAmount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                            {formatCurrency(balanceAmount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-muted-foreground font-medium">Status</span>
                          <StatusBadge status={booking.paymentStatus || "pending"} className="text-xs px-2 py-0.5" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* ── CANCELLATION / REJECTION REASON MODAL ────────────────────── */}
        <AnimatePresence>
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" /> Confirm Cancellation
                  </h3>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Are you sure you want to cancel / decline this booking? Please specify a reason for the customer:
                </p>

                <Textarea
                  placeholder="Enter reason for cancellation..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs min-h-[90px] bg-background resize-none"
                />

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectModal(false)}
                    disabled={rejecting}
                    className="text-xs cursor-pointer h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleConfirmRejectOrCancel}
                    disabled={rejecting}
                    className="text-xs font-bold h-9 cursor-pointer"
                  >
                    {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Confirm Cancellation
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </MerchantLayout>
  );
}
