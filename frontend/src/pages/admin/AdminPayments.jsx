import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import {
    AlertCircle,
    Clock,
    CreditCard,
    DollarSign,
    Loader2,
    ReceiptText,
    RefreshCw,
    Smartphone,
    TrendingUp,
    Wallet,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCommissionRate, apiListBookings, apiRefundPayment } from "@/lib/api";
import { toast } from "sonner";

const PAYMENT_STATUS_BADGE = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    paid: "bg-green-500/15 text-green-400 border border-green-500/30",
    partially_paid: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    failed: "bg-red-500/15 text-red-400 border border-red-500/30",
    refunded: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

const BOOKING_STATUS_BADGE = {
    awaiting_payment: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    awaiting_final_payment: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    paid: "bg-green-500/15 text-green-400 border border-green-500/30",
    confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
    pending_approval: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    refunded: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const formatStatus = (value) => String(value || "pending").replace(/_/g, " ");

const AdminPayments = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refunding, setRefunding] = useState(null);
    const [commissionRate, setCommissionRate] = useState(0.05);

    const loadPayments = async () => {
        if (!token)
            return;
        try {
            const res = await apiListBookings(undefined, token);
            setBookings(res.bookings || []);
        }
        catch {
            toast.error("Failed to load payments");
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
    }, [token]);

    useEffect(() => {
        if (!token)
            return;
        const loadCommissionRate = async () => {
            try {
                const res = await apiGetCommissionRate();
                const rate = res.commissionRate > 1
                    ? res.commissionRate / 100
                    : res.commissionRate || 0.05;
                setCommissionRate(rate);
            }
            catch {
                setCommissionRate(0.05);
            }
        };
        loadCommissionRate();
    }, [token]);

    useEffect(() => {
        if (!token)
            return;
        const interval = setInterval(loadPayments, 5000);
        return () => clearInterval(interval);
    }, [token]);

    const handleRefund = async (booking) => {
        const confirmed = confirm(`Refund ${formatCurrency(booking.price)} for "${booking.serviceName || booking.eventName}"?\n\nThis will cancel the booking and mark the payment as refunded.`);
        if (!confirmed)
            return;
        setRefunding(booking._id);
        try {
            await apiRefundPayment(booking._id, "Admin refund", token);
            toast.success("Refund processed successfully");
            loadPayments();
        }
        catch (error) {
            toast.error(error.message || "Failed to process refund");
        }
        finally {
            setRefunding(null);
        }
    };

    const getPaymentMethodIcon = (method) => {
        switch (method) {
            case "upi":
                return <Smartphone className="h-4 w-4"/>;
            case "card":
                return <CreditCard className="h-4 w-4"/>;
            case "wallet":
            case "mixed":
                return <Wallet className="h-4 w-4"/>;
            default:
                return <DollarSign className="h-4 w-4"/>;
        }
    };

    const payableBookings = bookings.filter((b) => ["paid", "partially_paid", "pending", "failed", "refunded"].includes(b.paymentStatus));
    const getPaidAmount = (b) => {
        if (["refunded", "failed", "pending"].includes(b.paymentStatus))
            return 0;
        if (b.paymentStatus === "partially_paid" && b.isAdvancePaid)
            return b.advanceAmount || 0;
        return b.price || 0;
    };
    const getDueAmount = (b) => Math.max(0, (b.price || 0) - getPaidAmount(b));
    const getAdminEarning = (b) => {
        const paidAmount = getPaidAmount(b);
        if (paidAmount <= 0)
            return 0;
        if (b.assignedTo?.role === "admin" || b.commissionSummary?.adminDirect)
            return Number(b.commissionSummary?.grossAmount) || paidAmount;
        const commissionAmount = Number(b.commissionSummary?.commissionAmount);
        if (!Number.isNaN(commissionAmount) && commissionAmount > 0)
            return commissionAmount;
        return paidAmount * commissionRate;
    };
    const getMerchantPayout = (b) => {
        const paidAmount = getPaidAmount(b);
        if (paidAmount <= 0 || b.assignedTo?.role === "admin" || b.commissionSummary?.adminDirect)
            return 0;
        const payout = Number(b.commissionSummary?.merchantPayout);
        if (!Number.isNaN(payout) && payout >= 0)
            return payout;
        return Math.max(0, paidAmount - getAdminEarning(b));
    };
    const getPaymentReference = (b) => {
        if (b.paymentId)
            return b.paymentId;
        if (b.advancePaymentId || b.remainingPaymentId)
            return [b.advancePaymentId, b.remainingPaymentId].filter(Boolean).join(" / ");
        return "Not generated";
    };

    const totalCollected = bookings.reduce((sum, b) => sum + getPaidAmount(b), 0);
    const pendingCollection = bookings.filter((b) => b.paymentStatus === "pending").reduce((sum, b) => sum + (b.price || 0), 0);
    const totalRefunded = bookings.filter((b) => b.paymentStatus === "refunded").reduce((sum, b) => sum + (b.price || 0), 0);
    const adminEarnings = bookings.reduce((sum, b) => sum + getAdminEarning(b), 0);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
              Payment <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Understand collected payments, pending dues, commissions, merchant payouts, and refunds in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5 mb-8">
            <SummaryCard title="Collected" value={formatCurrency(totalCollected)} icon={<DollarSign className="h-5 w-5 text-green-400"/>} tone="bg-green-500/15"/>
            <SummaryCard title="Admin Earnings" value={formatCurrency(adminEarnings)} detail={`${(commissionRate * 100).toFixed(0)}% standard commission`} icon={<TrendingUp className="h-5 w-5 text-emerald-400"/>} tone="bg-emerald-500/15"/>
            <SummaryCard title="Pending Collection" value={formatCurrency(pendingCollection)} icon={<Clock className="h-5 w-5 text-amber-400"/>} tone="bg-amber-500/15"/>
            <SummaryCard title="Refunded" value={formatCurrency(totalRefunded)} icon={<RefreshCw className="h-5 w-5 text-gray-400"/>} tone="bg-gray-500/15"/>
            <SummaryCard title="Payment Records" value={payableBookings.length} icon={<ReceiptText className="h-5 w-5 text-blue-400"/>} tone="bg-blue-500/15"/>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
            <div className="p-2 sm:p-6 border-b border-border">
              <h2 className="font-display text-xl font-semibold">Payment Ledger</h2>
              <p className="mt-1 text-sm text-muted-foreground">Each row shows what was charged, what is still due, who receives payout, and the stored payment reference.</p>
            </div>

            {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading payments...
              </div>) : payableBookings.length === 0 ? (<div className="p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                <p>No payment transactions found.</p>
              </div>) : (<div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Booking</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Customer / Merchant</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Payment</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Amounts</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Split</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Dates</th>
                      <th className="text-left px-5 py-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payableBookings.map((booking) => {
                const paidAmount = getPaidAmount(booking);
                const dueAmount = getDueAmount(booking);
                const adminAmount = getAdminEarning(booking);
                const merchantAmount = getMerchantPayout(booking);
                const bookingName = booking.serviceName || booking.eventName || booking.event?.title || booking.service?.name || "Booking";
                const commissionLabel = booking.commissionSummary?.adminDirect
                    ? "Admin-owned booking"
                    : `Commission ${Number(booking.commissionSummary?.commissionRate ?? commissionRate * 100).toFixed(0)}%`;

                return (<tr key={booking._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors align-top">
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div>
                              <p className="font-semibold">{bookingName}</p>
                              <p className="text-xs text-muted-foreground">Booking ID: {booking._id.slice(-8)}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{booking.event ? "Event" : "Service"}</span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${BOOKING_STATUS_BADGE[booking.status] || "bg-secondary text-muted-foreground"}`}>{formatStatus(booking.status)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium">{booking.customer?.name || "Unknown customer"}</p>
                              <p className="text-xs text-muted-foreground">{booking.customer?.email || "No email"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Merchant</p>
                              <p className="text-sm">{booking.assignedTo?.name || "Unassigned"}</p>
                              <p className="text-xs text-muted-foreground">{booking.assignedTo?.email || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${PAYMENT_STATUS_BADGE[booking.paymentStatus] || "bg-secondary text-muted-foreground"}`}>
                              {formatStatus(booking.paymentStatus)}
                            </span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {getPaymentMethodIcon(booking.paymentMethod)}
                              <span className="capitalize">{booking.paymentMethod || "not selected"}</span>
                            </div>
                            {booking.cardLast4 && (<p className="text-xs text-muted-foreground">Card ending {booking.cardLast4}</p>)}
                            {booking.upiId && (<p className="text-xs text-muted-foreground">{booking.upiId}</p>)}
                            {booking.walletAmountPaid > 0 && (<p className="text-xs text-muted-foreground">Wallet: {formatCurrency(booking.walletAmountPaid)}</p>)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <AmountLine label="Booking" value={formatCurrency(booking.price || 0)}/>
                            <AmountLine label="Paid" value={formatCurrency(paidAmount)} valueClass="text-green-500"/>
                            <AmountLine label="Due" value={formatCurrency(dueAmount)} valueClass={dueAmount > 0 ? "text-amber-500" : ""}/>
                            {booking.paymentType === "advance" && (<p className="text-xs text-muted-foreground">Advance {formatCurrency(booking.advanceAmount || 0)} / Remaining {formatCurrency(booking.remainingAmount || 0)}</p>)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <AmountLine label="Admin" value={formatCurrency(adminAmount)}/>
                            <AmountLine label="Merchant" value={formatCurrency(merchantAmount)}/>
                            <p className="text-xs text-muted-foreground">{commissionLabel}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="font-mono text-xs break-all">{getPaymentReference(booking)}</p>
                            <p className="text-xs text-muted-foreground">Ticket: {booking.ticketId || "Not issued"}</p>
                            <p className="text-xs text-muted-foreground">DB transactions: {booking.transactionRecords?.length || 0}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          <div className="space-y-1">
                            <p>Created: {new Date(booking.createdAt).toLocaleDateString()}</p>
                            {booking.advancePaidAt && (<p>Advance: {new Date(booking.advancePaidAt).toLocaleDateString()}</p>)}
                            {booking.remainingPaidAt && (<p>Remaining: {new Date(booking.remainingPaidAt).toLocaleDateString()}</p>)}
                            {booking.refundedAt && (<p>Refunded: {new Date(booking.refundedAt).toLocaleDateString()}</p>)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {booking.paymentStatus === "paid" && (<Button size="sm" variant="outline" onClick={() => handleRefund(booking)} disabled={refunding === booking._id} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              {refunding === booking._id ? (<>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin"/>
                                  Refunding
                                </>) : (<>
                                  <RefreshCw className="mr-1 h-3 w-3"/>
                                  Refund
                                </>)}
                            </Button>)}
                        </td>
                      </tr>);
            })}
                  </tbody>
                </table>
              </div>)}
          </div>
        </motion.div>
      </section>
    </AdminLayout>);
};

const SummaryCard = ({ title, value, detail, icon, tone }) => (<div className="rounded-xl border border-border bg-card p-3 sm:p-6">
  <div className="flex items-center gap-3">
    <div className={`rounded-full p-3 ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="font-display text-xs sm:text-2xl font-bold truncate">{value}</p>
      {detail && (<p className="text-[10px] text-muted-foreground">{detail}</p>)}
    </div>
  </div>
</div>);

const AmountLine = ({ label, value, valueClass = "" }) => (<div className="flex justify-between gap-4">
  <span className="text-muted-foreground">{label}</span>
  <span className={`font-semibold ${valueClass}`}>{value}</span>
</div>);

export default AdminPayments;
