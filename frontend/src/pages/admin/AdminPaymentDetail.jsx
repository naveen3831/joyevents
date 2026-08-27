import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Store,
  CreditCard,
  Percent,
  Calendar,
  Sparkles
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { apiGetBooking, apiGetCommissionRate } from "@/lib/api";
import { StatusBadge } from "@/components/common/table/StatusBadge";

const AdminPaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commissionRate, setCommissionRate] = useState(0.05);

  const loadBookingDetail = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGetBooking(id, token);
      if (res.booking) {
        setBooking(res.booking);
      } else {
        setError("Transaction details not found.");
      }
    } catch (e) {
      setError(e?.message || "Failed to load transaction details");
      toast.error(e?.message || "Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      loadBookingDetail();
    }
  }, [id, token]);

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

  const getPaidAmount = (b) => {
    if (!b) return 0;
    if (["refunded", "failed", "pending"].includes(b.paymentStatus)) return 0;
    if (b.paymentStatus === "partially_paid" && b.isAdvancePaid)
      return b.advanceAmount || 0;
    return b.price || 0;
  };
  const getDueAmount = (b) => {
    if (!b) return 0;
    return Math.max(0, (b.price || 0) - getPaidAmount(b));
  };
  const getAdminEarning = (b) => {
    if (!b) return 0;
    const paidAmount = getPaidAmount(b);
    if (paidAmount <= 0) return 0;
    if (b.assignedTo?.role === "admin" || b.commissionSummary?.adminDirect)
      return Number(b.commissionSummary?.grossAmount) || paidAmount;
    const commissionAmount = Number(b.commissionSummary?.commissionAmount);
    if (!Number.isNaN(commissionAmount) && commissionAmount > 0)
      return commissionAmount;
    return paidAmount * commissionRate;
  };
  const getMerchantPayout = (b) => {
    if (!b) return 0;
    const paidAmount = getPaidAmount(b);
    if (paidAmount <= 0 || b.assignedTo?.role === "admin" || b.commissionSummary?.adminDirect)
      return 0;
    const payout = Number(b.commissionSummary?.merchantPayout);
    if (!Number.isNaN(payout) && payout >= 0) return payout;
    return Math.max(0, paidAmount - getAdminEarning(b));
  };
  const getPaymentReference = (b) => {
    if (!b) return "";
    if (b.paymentId) return b.paymentId;
    if (b.advancePaymentId || b.remainingPaymentId)
      return [b.advancePaymentId, b.remainingPaymentId].filter(Boolean).join(" / ");
    return "Not generated";
  };

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-4 font-sans">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/admin-dashboard/payments")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Transactions
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading transaction details...
          </div>
        ) : error || !booking ? (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "Transaction Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-3">The requested transaction does not exist or has been removed.</p>
            <Link to="/admin-dashboard/payments" className="text-primary font-semibold text-xs hover:underline">
              Return to Transactions List
            </Link>
          </div>
        ) : (() => {
          const paidAmount = getPaidAmount(booking);
          const dueAmount = getDueAmount(booking);
          const adminAmount = getAdminEarning(booking);
          const merchantAmount = getMerchantPayout(booking);
          const bookingName =
            booking.serviceName ||
            booking.eventName ||
            booking.event?.title ||
            booking.service?.name ||
            "Booking";
          const commissionRatePercent = (
            booking.commissionSummary?.commissionRate ?? commissionRate * 100
          );

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Header Card */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Booking ID: <span className="font-mono">{booking._id}</span>
                      </span>
                      <StatusBadge status={booking.event ? "event" : "service"} />
                    </div>
                    <h1 className="font-semibold text-lg sm:text-xl text-foreground leading-tight truncate">
                      {bookingName}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Payment Status:</span>
                        <StatusBadge status={booking.paymentStatus || "pending"} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Layout for details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Customer Information */}
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Customer Details
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Name</span>
                        <span className="font-semibold text-foreground">{booking.customer?.name || "Customer"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground font-medium">Email Address</span>
                        <span className="font-semibold text-foreground truncate max-w-[200px]" title={booking.customer?.email}>
                          {booking.customer?.email || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Information */}
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" /> Assigned Merchant
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Merchant Name</span>
                        <span className="font-semibold text-foreground">{booking.assignedTo?.name || "Unassigned"}</span>
                      </div>
                      {booking.assignedTo?.email && (
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground font-medium">Email Address</span>
                          <span className="font-semibold text-foreground truncate max-w-[200px]" title={booking.assignedTo.email}>
                            {booking.assignedTo.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Financial Breakdown
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Total Amount</span>
                        <span className="font-bold text-foreground">{formatCurrency(booking.price || 0)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Paid Amount</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground font-medium">Due Amount</span>
                        <span className="font-semibold text-amber-600">{formatCurrency(dueAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Split */}
                  <div className="p-4 bg-indigo-500/5 rounded-lg border border-indigo-500/10 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" /> Revenue Split
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Commission Rate</span>
                        <span className="font-semibold text-foreground">{commissionRatePercent.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Admin Earnings</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(adminAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground font-medium">Merchant Share</span>
                        <span className="font-bold text-foreground">{formatCurrency(merchantAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gateway & References */}
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3 md:col-span-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Gateway & References
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Payment Method</span>
                        <span className="capitalize font-semibold text-foreground">{booking.paymentMethod || "standard"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Payment Reference</span>
                        <span className="font-mono text-foreground break-all">{getPaymentReference(booking)}</span>
                      </div>
                      {booking.ticketId && (
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground font-medium">Ticket ID</span>
                          <span className="font-mono text-foreground">{booking.ticketId}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Transaction Date</span>
                        <span className="text-foreground">{new Date(booking.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentDetail;
