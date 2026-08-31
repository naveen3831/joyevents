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
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import ConfirmModal from "@/components/common/ConfirmModal";
import ActionMenu from "@/components/common/ActionMenu";
import TableToolbar from "@/components/common/table/TableToolbar";
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
  const [search, setSearch] = useState("");

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

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "upi":
        return <Smartphone className="h-3.5 w-3.5" />;
      case "card":
        return <CreditCard className="h-3.5 w-3.5" />;
      case "wallet":
      case "mixed":
        return <Wallet className="h-3.5 w-3.5" />;
      default:
        return <IndianRupee className="h-3.5 w-3.5" />;
    }
  };

  const payableBookings = bookings.filter((b) =>
    ["paid", "partially_paid", "pending", "failed", "refunded"].includes(b.paymentStatus)
  );

  const filteredBookings = payableBookings.filter((b) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = (b.serviceName || b.eventName || b.event?.title || b.service?.name || "").toLowerCase();
    const customer = (b.customer?.name || b.customer?.email || "").toLowerCase();
    const merchant = (b.assignedTo?.name || b.assignedTo?.email || "").toLowerCase();
    const paymentId = (b.paymentId || "").toLowerCase();
    return name.includes(term) || customer.includes(term) || merchant.includes(term) || paymentId.includes(term);
  });

  const getPaidAmount = (b) => {
    if (["refunded", "failed", "pending"].includes(b.paymentStatus)) return 0;
    if (b.paymentStatus === "partially_paid" && b.isAdvancePaid)
      return b.advanceAmount || 0;
    return b.price || 0;
  };
  const getDueAmount = (b) => Math.max(0, (b.price || 0) - getPaidAmount(b));
  const getAdminEarning = (b) => {
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
    const paidAmount = getPaidAmount(b);
    if (paidAmount <= 0 || b.assignedTo?.role === "admin" || b.commissionSummary?.adminDirect)
      return 0;
    const payout = Number(b.commissionSummary?.merchantPayout);
    if (!Number.isNaN(payout) && payout >= 0) return payout;
    return Math.max(0, paidAmount - getAdminEarning(b));
  };
  const getPaymentReference = (b) => {
    if (b.paymentId) return b.paymentId;
    if (b.advancePaymentId || b.remainingPaymentId)
      return [b.advancePaymentId, b.remainingPaymentId].filter(Boolean).join(" / ");
    return "Not generated";
  };

  const totalCollected = bookings.reduce((sum, b) => sum + getPaidAmount(b), 0);
  const pendingCollection = bookings
    .filter((b) => b.paymentStatus === "pending")
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const totalRefunded = bookings
    .filter((b) => b.paymentStatus === "refunded")
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const adminEarnings = bookings.reduce((sum, b) => sum + getAdminEarning(b), 0);

  return (
    <AdminLayout>
      <PageHeader
        title="Payment & Financial Transactions"
        subtitle="Track collected revenue, commissions, merchant payouts, and process refunds."
        breadcrumbs={[{ label: "Admin Portal" }, { label: "Payments" }]}
      />

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
        <SummaryCard
          title="Total Revenue Collected"
          value={formatCurrency(totalCollected)}
          icon={<IndianRupee className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />}
          tone="bg-emerald-500/10"
        />
        <SummaryCard
          title="Admin Earnings"
          value={formatCurrency(adminEarnings)}
          detail={`${(commissionRate * 100).toFixed(0)}% standard commission`}
          icon={<TrendingUp className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />}
          tone="bg-indigo-500/10"
        />
        <SummaryCard
          title="Pending Dues"
          value={formatCurrency(pendingCollection)}
          icon={<Clock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />}
          tone="bg-amber-500/10"
        />
        <SummaryCard
          title="Total Refunded"
          value={formatCurrency(totalRefunded)}
          icon={<RefreshCw className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />}
          tone="bg-slate-500/10"
        />
        <SummaryCard
          title="Total Transactions"
          value={payableBookings.length}
          icon={<ReceiptText className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />}
          tone="bg-sky-500/10"
        />
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by booking, customer, merchant, payment reference..."
        hasActiveFilters={!!search}
        onClearFilters={() => setSearch("")}
      />

      {loading ? (
        <TableSkeleton columns={8} rows={6} />
      ) : filteredBookings.length === 0 ? (
        <DataTable minWidth="100%">
          <TableBody>
            <TableRow>
              <TableCell colSpan={8}>
                <TableEmptyState
                  title="No payment records found"
                  description="There are no payment transactions matching your search criteria."
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </DataTable>
      ) : (
        <DataTable minWidth="850px">
          <TableHeader>
            <TableHeaderCell className="w-[26%]">Booking / Item</TableHeaderCell>
            <TableHeaderCell className="w-[16%]">Customer</TableHeaderCell>
            <TableHeaderCell className="w-[14%]">Amount</TableHeaderCell>
            <TableHeaderCell className="w-[14%]">Status</TableHeaderCell>
            <TableHeaderCell className="w-[12%]">Method</TableHeaderCell>
            <TableHeaderCell className="w-[12%]">Date</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[6%]">Actions</TableHeaderCell>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => {
              const paidAmount = getPaidAmount(booking);
              const dueAmount = getDueAmount(booking);
              const bookingName =
                booking.serviceName ||
                booking.eventName ||
                booking.event?.title ||
                booking.service?.name ||
                "Booking";
              const formattedDate = new Date(booking.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <TableRow key={booking._id} className="h-[64px]">
                  {/* Booking / Item */}
                  <TableCell className="w-[26%] py-3">
                    <div className="space-y-1">
                      <p className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[210px]" title={bookingName}>
                        {bookingName}
                      </p>
                      <div>
                        <StatusBadge
                          status={booking.event ? "event" : "service"}
                          className="h-4.5 px-2 text-[10px] font-medium min-w-0 inline-flex"
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell className="w-[16%] py-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[130px]" title={booking.customer?.name}>
                        {booking.customer?.name || "Customer"}
                      </p>
                      {booking.customer?.email && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[130px]" title={booking.customer.email}>
                          {booking.customer.email}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="w-[14%] py-3">
                    <p className="font-bold text-xs sm:text-sm text-foreground">
                      {formatCurrency(booking.price || 0)}
                    </p>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="w-[14%] py-3">
                    <StatusBadge
                      status={booking.paymentStatus}
                      className="h-[28px] min-w-[94px] px-3 font-semibold justify-center text-center"
                    />
                  </TableCell>

                  {/* Method */}
                  <TableCell className="w-[12%] py-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                      {getPaymentMethodIcon(booking.paymentMethod)}
                      <span className="capitalize">{booking.paymentMethod || "standard"}</span>
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="w-[12%] py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">
                    {formattedDate}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" className="w-[6%] py-3">
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
      )}

      {/* Confirmation Modal for Refund */}
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

const SummaryCard = ({ title, value, detail, icon, tone }) => (
  <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground truncate">{title}</p>
        <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate mt-0.5">{value}</p>
        {detail && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{detail}</p>}
      </div>
      <div className={`h-9 w-9 rounded-lg ${tone} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
  </div>
);

const AmountLine = ({ label, value, valueClass = "" }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-semibold ${valueClass}`}>{value}</span>
  </div>
);

export default AdminPayments;
