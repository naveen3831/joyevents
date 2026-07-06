import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, CreditCard, Smartphone, CheckCircle, XCircle, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiRefundPayment } from "@/lib/api";
import { toast } from "sonner";

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  paid: "bg-green-500/15 text-green-400 border border-green-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
  refunded: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

const AdminPayments = () => {
  const { token } = useAuth() as any;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  const loadPayments = async () => {
    if (!token) return;
    try {
      const res = await apiListBookings(undefined, token);
      setBookings(res.bookings || []);
    } catch (error: any) {
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
    const interval = setInterval(() => {
      loadPayments();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRefund = async (booking: any) => {
    const confirmed = confirm(
      `Are you sure you want to refund ${formatCurrency(booking.price)} for booking "${booking.serviceName || booking.eventName}"?\n\nThis will cancel the booking and mark the payment as refunded.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setRefunding(booking._id);
    try {
      await apiRefundPayment(booking._id, "Admin refund", token);
      toast.success("Refund processed successfully");
      loadPayments(); // Reload to show updated status
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund");
    } finally {
      setRefunding(null);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "upi":
        return <Smartphone className="h-4 w-4" />;
      case "card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaidAmount = (b: any) => (b.paymentStatus === "partially_paid" && b.isAdvancePaid) ? (b.advanceAmount || 0) : (b.price || 0);

  const totalRevenue = bookings
    .filter(b => b.paymentStatus === "paid" || b.paymentStatus === "partially_paid")
    .reduce((sum, b) => sum + getPaidAmount(b), 0);

  const totalRefunded = bookings
    .filter(b => b.paymentStatus === "refunded")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
              Payment <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage all payment transactions
            </p>
          </div>

          {/* Payment Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/15 p-3">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/15 p-3">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Bookings</p>
                  <p className="font-display text-xs sm:text-2xl font-bold truncate">
                    {bookings.filter(b => b.paymentStatus === "paid").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gray-500/15 p-3">
                  <RefreshCw className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refunded</p>
                  <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalRefunded)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-500/15 p-3">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed Payments</p>
                  <p className="font-display text-xs sm:text-2xl font-bold truncate">
                    {bookings.filter(b => b.paymentStatus === "failed").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
            <div className="p-2 sm:p-6 border-b border-border">
              <h2 className="font-display text-xl font-semibold">Payment Transactions</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading payments...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
                <p>No payment transactions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Booking</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Payment Method</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Payment Status</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Payment ID</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-6 py-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{booking.serviceName || booking.eventName}</p>
                            <p className="text-xs text-muted-foreground">ID: {booking._id.slice(-8)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{booking.customer?.name}</p>
                            <p className="text-xs text-muted-foreground">{booking.customer?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold">{formatCurrency(booking.price)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(booking.paymentMethod)}
                            <span className="capitalize">{booking.paymentMethod || "card"}</span>
                            {booking.cardLast4 && (
                              <span className="text-xs text-muted-foreground">****{booking.cardLast4}</span>
                            )}
                            {booking.upiId && (
                              <span className="text-xs text-muted-foreground">{booking.upiId}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            PAYMENT_STATUS_BADGE[booking.paymentStatus] || "bg-secondary text-muted-foreground"
                          }`}>
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs">
                            {booking.paymentId || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {booking.paymentStatus === "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefund(booking)}
                              disabled={refunding === booking._id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {refunding === booking._id ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Refunding...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Refund
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </AdminLayout>
  );
};

export default AdminPayments;
