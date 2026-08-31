import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Store,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Send,
  MessageSquare,
  IndianRupee,
  Info,
  XCircle,
  FileText
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

const STATUS_OPTIONS = [
  {
    group: "BOOKING LIFECYCLE",
    items: [
      {
        value: "pending_approval",
        label: "Pending Approval",
        description: "Booking request received, awaiting merchant confirmation.",
        dot: "bg-amber-400",
        badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20"
      },
      {
        value: "approved",
        label: "Approved",
        description: "Booking approved. Customer can proceed with payment.",
        dot: "bg-sky-400",
        badgeColor: "text-sky-500 bg-sky-500/10 border-sky-500/20"
      },
    ]
  },
  {
    group: "PAYMENT STATUS",
    items: [
      {
        value: "awaiting_payment",
        label: "Awaiting Payment",
        description: "Invoice generated and customer prompted for payment.",
        dot: "bg-indigo-400",
        badgeColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
      },
      {
        value: "paid",
        label: "Paid",
        description: "Required payment has been received and verified.",
        dot: "bg-emerald-400",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      },
    ]
  },
  {
    group: "SERVICE FULFILLMENT",
    items: [
      {
        value: "pending",
        label: "Pending",
        description: "Queued for fulfillment and preparation.",
        dot: "bg-yellow-400",
        badgeColor: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      },
      {
        value: "accepted",
        label: "Accepted",
        description: "Merchant accepted schedule and is preparing delivery.",
        dot: "bg-teal-400",
        badgeColor: "text-teal-500 bg-teal-500/10 border-teal-500/20"
      },
      {
        value: "processing",
        label: "Processing",
        description: "Service or event is actively in progress.",
        dot: "bg-orange-400",
        badgeColor: "text-orange-500 bg-orange-500/10 border-orange-500/20"
      },
      {
        value: "completed",
        label: "Completed",
        description: "Service fulfilled and event concluded successfully.",
        dot: "bg-emerald-500",
        badgeColor: "text-emerald-600 bg-emerald-500/15 border-emerald-500/30"
      },
    ]
  },
  {
    group: "OTHER ACTIONS",
    items: [
      {
        value: "cancelled",
        label: "Cancelled",
        description: "Booking has been officially cancelled.",
        dot: "bg-rose-400",
        badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20"
      }
    ]
  }
];

const LIFECYCLE_STEPS = [
  { id: "pending_approval", label: "Request Submitted" },
  { id: "approved", label: "Approved" },
  { id: "paid", label: "Payment Confirmed" },
  { id: "processing", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export default function MerchantBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Approval with payment type
  const [approvalMode, setApprovalMode] = useState("full");
  const [customAdvance, setCustomAdvance] = useState("");
  const [approving, setApproving] = useState(false);

  // Rejection modal / form
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Cancellation handling
  const [cancelFeeOption, setCancelFeeOption] = useState("preset");
  const [customCancelFee, setCustomCancelFee] = useState("");
  const [processingCancel, setProcessingCancel] = useState(false);

  const loadBooking = async () => {
    if (!token || !id) return;
    try {
      const res = await apiGetBooking(id, token);
      if (res.booking) {
        setBooking(res.booking);
        setSelectedStatus(res.booking.status);
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
    toast.success("Booking ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === booking?.status) return;
    setUpdating(true);
    try {
      await apiUpdateBookingStatus(id, selectedStatus, token);
      toast.success(`Booking status updated to ${selectedStatus.replace(/_/g, " ")}`);
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to update booking status");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickComplete = async () => {
    setUpdating(true);
    try {
      await apiCompleteBooking(id, token);
      toast.success("Booking marked as completed!");
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to complete booking");
    } finally {
      setUpdating(false);
    }
  };

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
          ? `Booking approved with advance payment of ${formatCurrency(customAdvance || Math.round((booking?.price || 0) * 0.3))}!`
          : "Booking approved with full payment requirement!"
      );
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to approve booking");
    } finally {
      setApproving(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setRejecting(true);
    try {
      await apiRejectBooking(id, rejectionReason, token);
      toast.success("Booking rejected. Refund/notification initiated.");
      setShowRejectForm(false);
      await loadBooking();
    } catch (e) {
      toast.error(e?.message || "Failed to reject booking");
    } finally {
      setRejecting(false);
    }
  };

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
      toast.success("Cancellation request rejected");
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

  // Determine active step index
  const getStepIndex = (status) => {
    switch (status) {
      case "pending_approval":
        return 0;
      case "approved":
      case "awaiting_payment":
        return 1;
      case "paid":
      case "confirmed":
      case "accepted":
        return 2;
      case "processing":
      case "pending":
        return 3;
      case "completed":
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = booking ? getStepIndex(booking.status) : 0;
  const isCancelled = ["cancelled", "rejected"].includes(booking?.status);

  return (
    <MerchantLayout>
      <div className="w-full min-w-0 space-y-6 pb-12 font-sans">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-secondary cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
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

            <Link to="/merchant-dashboard/bookings">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                All Bookings
              </Button>
            </Link>
          </div>
        </div>

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
              The booking requested does not exist or is not assigned to your merchant account.
            </p>
            <Button onClick={() => navigate("/merchant-dashboard")} className="cursor-pointer bg-gradient-primary">
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header Card */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 hover:bg-secondary text-xs font-mono font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/60"
                      title="Click to copy Booking ID"
                    >
                      {booking._id}
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>

                    {booking.service ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Service Booking
                      </span>
                    ) : booking.event ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Event Booking
                      </span>
                    ) : null}

                    <span className="text-xs text-muted-foreground">
                      Created on {new Date(booking.createdAt || booking.datetime || Date.now()).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {booking.service?.name || booking.event?.title || booking.serviceName || "Booking Management"}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-secondary/40 p-3 rounded-xl border border-border/60">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">
                      Current Status
                    </span>
                    <StatusBadge status={booking.status} className="text-xs px-3 py-1 font-semibold" />
                  </div>
                  <div className="h-8 w-px bg-border/60 mx-1" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-0.5">
                      Payment Status
                    </span>
                    <StatusBadge status={booking.paymentStatus || "pending"} className="text-xs px-3 py-1 font-semibold" />
                  </div>
                </div>
              </div>

              {/* Progress Tracker (unless cancelled) */}
              {!isCancelled ? (
                <div className="mt-8 pt-6 border-t border-border/60">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-0 relative">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const isPast = currentStep > idx;
                      const isCurrent = currentStep === idx;
                      return (
                        <div key={step.id} className="flex flex-col items-center text-center relative group">
                          {/* Connecting line */}
                          {idx < LIFECYCLE_STEPS.length - 1 && (
                            <div
                              className={`hidden sm:block absolute top-3.5 left-1/2 w-full h-0.5 z-0 ${
                                currentStep > idx ? "bg-emerald-500" : "bg-border"
                              }`}
                            />
                          )}
                          <div
                            className={`relative z-10 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                              isPast
                                ? "bg-emerald-500 text-white"
                                : isCurrent
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {isPast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                          </div>
                          <span
                            className={`mt-2 text-[11px] font-medium transition-colors ${
                              isCurrent
                                ? "text-foreground font-bold"
                                : isPast
                                ? "text-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>This booking has been cancelled / rejected. Status updates are locked.</span>
                </div>
              )}
            </div>

            {/* Special Action Alert: Pending Approval */}
            {booking.service && (booking.status === "pending" || booking.status === "pending_approval") && !booking.approvedAt && (
              <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-6 shadow-md space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Action Required: Approve Booking</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose payment requirement terms for this service booking to confirm and notify the customer.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setApprovalMode("advance")}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      approvalMode === "advance"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground">Advance Payment (Deposit)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customer pays a deposit now (default 30% = {formatCurrency(Math.round((booking.price || 0) * 0.3))}) and remainder after service.
                    </p>

                    {approvalMode === "advance" && (
                      <div className="mt-3 pt-3 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          Custom Advance Amount (optional)
                        </Label>
                        <Input
                          type="number"
                          placeholder={`Default: ₹${Math.round((booking.price || 0) * 0.3)}`}
                          value={customAdvance}
                          onChange={(e) => setCustomAdvance(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalMode("full")}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      approvalMode === "full"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground">Require Full Payment (100%)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        100% Upfront
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customer pays full total amount of {formatCurrency(booking.price)} immediately to confirm the booking.
                    </p>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer text-xs"
                    onClick={() => setShowRejectForm(!showRejectForm)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {showRejectForm ? "Cancel Rejection" : "Reject Booking"}
                  </Button>

                  <Button
                    type="button"
                    className="bg-gradient-primary text-primary-foreground font-semibold px-6 shadow-glow cursor-pointer text-xs"
                    onClick={handleApproveWithPaymentType}
                    disabled={approving}
                  >
                    {approving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                    Confirm Approval & Send to Customer
                  </Button>
                </div>

                {showRejectForm && (
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3 mt-3">
                    <Label className="text-xs font-bold text-rose-500">Reason for Rejection</Label>
                    <Textarea
                      placeholder="Please specify why this booking cannot be accepted (e.g. date unavailable, capacity reached)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="text-xs min-h-[70px] bg-background"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRejectBooking}
                      disabled={rejecting}
                      className="text-xs"
                    >
                      {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Confirm Rejection & Notify Customer
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Special Action Alert: Cancellation Requested */}
            {booking.status === "cancellation_requested" && (
              <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-6 shadow-md space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-bold text-base text-foreground">Customer Requested Cancellation</h3>
                    <p className="text-xs text-muted-foreground">
                      Customer requested to cancel this booking. Please set the cancellation fee and approve or reject the request.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelFeeOption("preset")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer ${
                      cancelFeeOption === "preset"
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <p className="font-semibold text-xs text-foreground">Standard 30% Cancellation Fee</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fee: {formatCurrency(Math.round((booking.price || 0) * 0.3))} | Refund: {formatCurrency((booking.price || 0) - Math.round((booking.price || 0) * 0.3))}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCancelFeeOption("custom")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer ${
                      cancelFeeOption === "custom"
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <p className="font-semibold text-xs text-foreground">Custom Fee / Full Refund</p>
                    {cancelFeeOption === "custom" && (
                      <Input
                        type="number"
                        placeholder="Enter fee amount (0 for full refund)"
                        value={customCancelFee}
                        onChange={(e) => setCustomCancelFee(e.target.value)}
                        className="h-7 text-xs bg-background mt-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectCancel}
                    disabled={processingCancel}
                    className="text-xs cursor-pointer"
                  >
                    Reject Cancellation
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer"
                    onClick={handleApproveCancel}
                    disabled={processingCancel}
                  >
                    {processingCancel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Approve & Propose Fee
                  </Button>
                </div>
              </div>
            )}

            {/* Special Action Alert: Refund Pending */}
            {booking.status === "refund_pending" && (
              <div className="rounded-2xl border-2 border-purple-500/40 bg-purple-500/5 p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-foreground">Customer Accepted Cancellation Fee</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Refund Amount to Process:{" "}
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency((booking.price || 0) - (booking.cancellationFee || 0))}
                    </span>{" "}
                    (Fee retained: {formatCurrency(booking.cancellationFee || 0)})
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-glow"
                  onClick={handleProcessRefundAction}
                  disabled={processingCancel}
                >
                  {processingCancel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Process Refund Now
                </Button>
              </div>
            )}

            {/* Main Content Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Status Management */}
              <div className="lg:col-span-7 space-y-6">
                {/* Status Update Control Panel */}
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" /> Update Booking Status
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select a lifecycle status below and confirm to update the booking stage.
                      </p>
                    </div>

                    {booking.status !== "completed" && !isCancelled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleQuickComplete}
                        disabled={updating}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer hidden sm:inline-flex"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        Mark as Completed
                      </Button>
                    )}
                  </div>

                  {/* Status Options Selector */}
                  <div className="space-y-5">
                    {STATUS_OPTIONS.map((group) => (
                      <div key={group.group} className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                          {group.group}
                        </span>

                        <div className="grid grid-cols-1 gap-2">
                          {group.items.map((opt) => {
                            const isCurrent = opt.value === booking.status;
                            const isSelected = opt.value === selectedStatus;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={isCurrent || isCancelled || updating}
                                onClick={() => !isCurrent && setSelectedStatus(opt.value)}
                                className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                                  isCurrent
                                    ? "border-border bg-secondary/40 opacity-75 cursor-default ring-1 ring-border"
                                    : isSelected
                                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 cursor-pointer"
                                    : "border-border/80 bg-background hover:bg-secondary/50 hover:border-border cursor-pointer"
                                }`}
                              >
                                <span className={`h-3 w-3 rounded-full mt-0.5 shrink-0 ${opt.dot} ${isCurrent ? "opacity-60" : ""}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`text-sm font-semibold ${
                                        isCurrent
                                          ? "text-muted-foreground"
                                          : isSelected
                                          ? "text-foreground font-bold"
                                          : "text-foreground/90"
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/60">
                                        Current Status
                                      </span>
                                    )}
                                    {isSelected && !isCurrent && (
                                      <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                                        Ready to Apply
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {opt.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Submit Status Action */}
                  <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground text-center sm:text-left">
                      {selectedStatus !== booking.status ? (
                        <span>
                          Status will transition to:{" "}
                          <strong className="text-foreground capitalize">{selectedStatus.replace(/_/g, " ")}</strong>
                        </span>
                      ) : (
                        <span>Select a different status option above to apply changes.</span>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={!selectedStatus || selectedStatus === booking.status || updating || isCancelled}
                      className="w-full sm:w-auto min-w-[180px] h-10 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-xs shadow-glow hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Updating...
                        </>
                      ) : (
                        `Apply Status Change`
                      )}
                    </Button>
                  </div>
                </div>

                {/* Customer Review & Rating Panel (if available) */}
                {booking.rating?.score && (
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Customer Review & Rating
                    </h3>
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-2">
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < booking.rating.score
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="font-bold text-sm text-foreground ml-1.5">
                          {booking.rating.score} / 5.0
                        </span>
                      </div>
                      {booking.rating.comment && (
                        <p className="text-xs italic text-foreground/90 bg-background p-3 rounded-lg border border-border/40">
                          "{booking.rating.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Comprehensive Details Cards */}
              <div className="lg:col-span-5 space-y-6">
                {/* Service / Event Info */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Booked Item Details
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-3 pb-2 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Title / Service</span>
                      <span className="font-bold text-foreground text-right">
                        {booking.service?.name || booking.event?.title || booking.serviceName || "—"}
                      </span>
                    </div>

                    {(booking.service?.category || booking.event?.category) && (
                      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
                        <span className="text-muted-foreground font-medium">Category</span>
                        <span className="font-semibold text-foreground capitalize">
                          {booking.service?.category || booking.event?.category}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Date & Schedule</span>
                      <span className="font-semibold text-foreground text-right">
                        {booking.datetime
                          ? new Date(booking.datetime).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            }) +
                            " at " +
                            new Date(booking.datetime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "Flexible / Scheduled"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground font-medium shrink-0">Location</span>
                      <div className="text-right">
                        <p className="font-semibold text-foreground break-words max-w-[200px]">
                          {booking.customerLocation?.address || booking.event?.location || "Provided by customer"}
                        </p>
                        {booking.customerLocation?.latitude && (
                          <a
                            href={`https://www.google.com/maps?q=${booking.customerLocation.latitude},${booking.customerLocation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 font-semibold mt-1"
                          >
                            Open in Google Maps <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" /> Customer Information
                    </h3>

                    <Link
                      to="/merchant-dashboard/inbox"
                      className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" /> Inbox
                    </Link>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Customer Name</span>
                      <span className="font-bold text-foreground">{booking.customer?.name || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Email Address</span>
                      <span className="font-semibold text-foreground truncate max-w-[200px]" title={booking.customer?.email}>
                        {booking.customer?.email || "—"}
                      </span>
                    </div>

                    {booking.notes && (
                      <div className="pt-1">
                        <span className="text-muted-foreground font-medium block mb-1">Customer Note:</span>
                        <p className="p-3 bg-secondary/50 rounded-lg text-foreground/90 italic text-[11px]">
                          "{booking.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financials & Payment Breakdown */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Summary
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Total Booking Amount</span>
                      <span className="font-bold text-base text-primary">{formatCurrency(booking.price)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Payment Model</span>
                      <span className="font-semibold capitalize text-foreground">
                        {booking.paymentType === "advance" ? "Advance Payment (Deposit)" : "Full Payment"}
                      </span>
                    </div>

                    {booking.paymentType === "advance" && (
                      <>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground font-medium">Advance Amount</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(booking.advanceAmount || Math.round((booking.price || 0) * 0.3))}
                            {booking.isAdvancePaid ? (
                              <span className="ml-1.5 text-[10px] text-emerald-500 font-bold">(Paid)</span>
                            ) : (
                              <span className="ml-1.5 text-[10px] text-amber-500 font-bold">(Pending)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground font-medium">Remaining Balance</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(booking.remainingAmount || (booking.price - (booking.advanceAmount || 0)))}
                            {booking.isRemainingPaid ? (
                              <span className="ml-1.5 text-[10px] text-emerald-500 font-bold">(Paid)</span>
                            ) : (
                              <span className="ml-1.5 text-[10px] text-amber-500 font-bold">(Unpaid)</span>
                            )}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground font-medium">Current Payment State</span>
                      <StatusBadge status={booking.paymentStatus || "pending"} className="text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </MerchantLayout>
  );
}
