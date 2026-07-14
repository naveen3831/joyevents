import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, RefreshCcw, Wallet, CheckCircle2, Loader2, AlertCircle, Check, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListBookings, apiUpdateBookingStatus, apiProcessMerchantPayout, apiGetAllWithdrawals, apiApproveWithdrawal, apiCompleteWithdrawal, apiRejectWithdrawal } from "@/lib/api";
const COMMISSION_RATE = 0.05; // 5% commission
// Force rebuild - Admin Manages section added
const PaymentManagement = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("transactions");
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [refundReason, setRefundReason] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
    const [processedPayouts, setProcessedPayouts] = useState(new Set());
    const [withdrawals, setWithdrawals] = useState([]);
    const [withdrawalLoading, setWithdrawalLoading] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [processingWithdrawal, setProcessingWithdrawal] = useState(null);
    const [approveAllDialogOpen, setApproveAllDialogOpen] = useState(false);
    const [approvingAll, setApprovingAll] = useState(false);
    useEffect(() => {
        loadTransactions();
        loadWithdrawals();
    }, [token]);
    useEffect(() => {
        if (activeTab === "payouts") {
            loadWithdrawals();
        }
    }, [activeTab]);
    // Auto-refresh withdrawals every 3 seconds when on payouts tab
    useEffect(() => {
        if (activeTab !== "payouts")
            return;
        const pollInterval = setInterval(() => {
            loadWithdrawals();
        }, 3000);
        return () => clearInterval(pollInterval);
    }, [activeTab, token]);
    const loadTransactions = async () => {
        try {
            setLoading(true);
            const data = await apiListBookings(undefined, token);
            setBookings(data.bookings || []);
        }
        catch (error) {
            toast.error("Failed to load transactions");
        }
        finally {
            setLoading(false);
        }
    };
    const loadWithdrawals = async () => {
        try {
            setWithdrawalLoading(true);
            const data = await apiGetAllWithdrawals(token);
            // Sort by status: pending first, then approved, then completed/rejected
            const sorted = (data.withdrawals || []).sort((a, b) => {
                const statusOrder = { pending: 0, approved: 1, completed: 2, rejected: 3 };
                return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
            });
            setWithdrawals(sorted);
        }
        catch (error) {
            toast.error("Failed to load withdrawals");
        }
        finally {
            setWithdrawalLoading(false);
        }
    };
    const handleApproveWithdrawal = async () => {
        if (!selectedWithdrawal)
            return;
        try {
            setProcessingWithdrawal(selectedWithdrawal._id);
            await apiApproveWithdrawal(selectedWithdrawal._id, token);
            toast.success("✅ Withdrawal Approved Successfully! Merchant has been notified.");
            setApproveDialogOpen(false);
            loadWithdrawals();
        }
        catch (error) {
            toast.error(error.message || "Failed to approve withdrawal");
        }
        finally {
            setProcessingWithdrawal(null);
        }
    };
    const handleCompleteWithdrawal = async () => {
        if (!selectedWithdrawal || !transactionId) {
            toast.error("Please enter transaction ID");
            return;
        }
        try {
            setProcessingWithdrawal(selectedWithdrawal._id);
            await apiCompleteWithdrawal(selectedWithdrawal._id, transactionId, token);
            toast.success("✅ Withdrawal Completed Successfully! Merchant has been notified.");
            setCompleteDialogOpen(false);
            setTransactionId("");
            loadWithdrawals();
        }
        catch (error) {
            toast.error(error.message || "Failed to complete withdrawal");
        }
        finally {
            setProcessingWithdrawal(null);
        }
    };
    const handleRejectWithdrawal = async () => {
        if (!selectedWithdrawal || !rejectionReason) {
            toast.error("Please enter rejection reason");
            return;
        }
        try {
            setProcessingWithdrawal(selectedWithdrawal._id);
            await apiRejectWithdrawal(selectedWithdrawal._id, rejectionReason, token);
            toast.success("✅ Withdrawal Rejected Successfully! Merchant has been notified.");
            setRejectDialogOpen(false);
            setRejectionReason("");
            loadWithdrawals();
        }
        catch (error) {
            toast.error(error.message || "Failed to reject withdrawal");
        }
        finally {
            setProcessingWithdrawal(null);
        }
    };
    const totalRevenue = bookings
        .filter((b) => b.paymentStatus === "paid")
        .reduce((sum, b) => sum + b.price, 0);
    const totalCommission = totalRevenue * COMMISSION_RATE;
    const pendingPayments = bookings.filter((b) => b.paymentStatus === "pending").length;
    const completedTransactions = bookings.filter((b) => b.paymentStatus === "paid").length;
    const refundedTransactions = bookings.filter((b) => b.paymentStatus === "refunded").length;
    // Calculate merchant payouts
    const merchantPayouts = bookings
        .filter((b) => b.paymentStatus === "paid" && b.assignedTo)
        .reduce((acc, booking) => {
        const merchantShare = booking.price * (1 - COMMISSION_RATE);
        const existing = acc.find((p) => p.merchant._id === booking.assignedTo._id);
        if (existing) {
            existing.totalRevenue += booking.price;
            existing.totalCommission += booking.price * COMMISSION_RATE;
            existing.netPayout += merchantShare;
            existing.bookings.push(booking);
        }
        else {
            acc.push({
                merchant: booking.assignedTo,
                totalRevenue: booking.price,
                totalCommission: booking.price * COMMISSION_RATE,
                netPayout: merchantShare,
                bookings: [booking]
            });
        }
        return acc;
    }, []);
    const handleRefund = async () => {
        if (!selectedBooking || !refundReason.trim()) {
            toast.error("Please provide a refund reason");
            return;
        }
        try {
            await apiUpdateBookingStatus(selectedBooking._id, "cancelled", token);
            toast.success("Refund processed successfully");
            setRefundDialogOpen(false);
            setRefundReason("");
            setSelectedBooking(null);
            loadTransactions();
        }
        catch (error) {
            toast.error("Failed to process refund");
        }
    };
    const handleProcessPayout = async (payout) => {
        try {
            const bookingIds = payout.bookings.map((b) => b._id);
            await apiProcessMerchantPayout(payout.merchant._id, payout.netPayout, bookingIds, token);
            // Mark this payout as processed
            setProcessedPayouts(prev => new Set([...prev, payout.merchant._id]));
            // Dispatch event to notify merchant dashboard
            window.dispatchEvent(new CustomEvent('payoutProcessed', {
                detail: {
                    merchantId: payout.merchant._id,
                    merchantName: payout.merchant.name,
                    amount: payout.netPayout
                }
            }));
            toast.success(`Payout of ${formatCurrency(payout.netPayout)} processed for ${payout.merchant.name}`);
            // Reload transactions to update the table
            loadTransactions();
        }
        catch (error) {
            toast.error(error.message || "Failed to process payout");
        }
    };
    const handleApproveAllPayouts = async () => {
        try {
            setApprovingAll(true);
            const pendingPayouts = merchantPayouts.filter(p => !processedPayouts.has(p.merchant._id));
            if (pendingPayouts.length === 0) {
                toast.info("No pending payouts to approve");
                return;
            }
            let successCount = 0;
            let failureCount = 0;
            for (const payout of pendingPayouts) {
                try {
                    await handleProcessPayout(payout);
                    successCount++;
                }
                catch (error) {
                    failureCount++;
                }
            }
            setApproveAllDialogOpen(false);
            if (failureCount === 0) {
                toast.success(`✅ All ${successCount} payouts approved successfully! Merchants have been notified.`);
            }
            else {
                toast.warning(`⚠️ ${successCount} payouts approved, ${failureCount} failed`);
            }
        }
        catch (error) {
            toast.error(error.message || "Failed to approve all payouts");
        }
        finally {
            setApprovingAll(false);
        }
    };
    const openRefundDialog = (booking) => {
        setSelectedBooking(booking);
        setRefundDialogOpen(true);
    };
    const filteredBookings = bookings.filter((booking) => {
        if (filterStatus !== "all" && booking.status !== filterStatus)
            return false;
        if (filterPaymentStatus !== "all" && booking.paymentStatus !== filterPaymentStatus)
            return false;
        return true;
    });
    const StatCard = ({ title, value, icon: Icon, trend, color }) => (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {trend && (<div className="flex items-center gap-1 mt-2 text-xs">
              <ArrowUpRight className="h-3 w-3 text-green-500"/>
              <span className="text-green-500">{trend}</span>
            </div>)}
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}>
          <Icon className="h-6 w-6"/>
        </div>
      </div>
    </motion.div>);
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-xs sm:text-3xl font-bold flex items-center gap-2">
                <DollarSign className="h-7 w-7 text-primary"/>
                Payment <span className="text-gradient">Management</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage transactions, commissions, refunds, and merchant payouts
              </p>
            </div>
            <Button onClick={loadTransactions} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2"/>
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Admin Manages Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-display font-semibold text-lg mb-6">🛠️ Admin Manages</h3>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payment Transactions */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer" onClick={() => setActiveTab("transactions")}>
              <div className="flex items-start justify-between mb-3">
                <CreditCard className="h-6 w-6 text-blue-600"/>
                <span className="text-xs font-semibold bg-blue-500/20 text-blue-600 px-2 py-1 rounded">Active</span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Payment Transactions</h4>
              <p className="text-xs text-muted-foreground mb-3">Monitor and manage all payment transactions</p>
              <p className="text-lg font-bold text-blue-600">{completedTransactions}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>

            {/* Commission Calculation */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer" onClick={() => setActiveTab("commissions")}>
              <div className="flex items-start justify-between mb-3">
                <DollarSign className="h-6 w-6 text-green-600"/>
                <span className="text-xs font-semibold bg-green-500/20 text-green-600 px-2 py-1 rounded">5%</span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Commission Calculation</h4>
              <p className="text-xs text-muted-foreground mb-3">Track admin commission on all transactions</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalCommission)}</p>
              <p className="text-xs text-muted-foreground">Total Commission</p>
            </div>

            {/* Refunds */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer" onClick={() => setActiveTab("refunds")}>
              <div className="flex items-start justify-between mb-3">
                <ArrowDownRight className="h-6 w-6 text-red-600"/>
                <span className="text-xs font-semibold bg-red-500/20 text-red-600 px-2 py-1 rounded">Processed</span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Refunds</h4>
              <p className="text-xs text-muted-foreground mb-3">Process and manage customer refunds</p>
              <p className="text-lg font-bold text-red-600">{refundedTransactions}</p>
              <p className="text-xs text-muted-foreground">Refunded Transactions</p>
            </div>

            {/* Merchant Payouts */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer" onClick={() => setActiveTab("payouts")}>
              <div className="flex items-start justify-between mb-3">
                <Wallet className="h-6 w-6 text-purple-600"/>
                <span className="text-xs font-semibold bg-purple-500/20 text-purple-600 px-2 py-1 rounded">95%</span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Merchant Payouts</h4>
              <p className="text-xs text-muted-foreground mb-3">Manage merchant payout distribution</p>
              <p className="text-lg font-bold text-purple-600">{merchantPayouts.length}</p>
              <p className="text-xs text-muted-foreground">Active Merchants</p>
            </div>

            {/* Merchant Withdrawals */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer" onClick={() => setActiveTab("withdrawals")}>
              <div className="flex items-start justify-between mb-3">
                <ArrowUpRight className="h-6 w-6 text-orange-600"/>
                <span className="text-xs font-semibold bg-orange-500/20 text-orange-600 px-2 py-1 rounded">Pending</span>
              </div>
              <h4 className="font-semibold text-sm mb-2">Merchant Withdrawals</h4>
              <p className="text-xs text-muted-foreground mb-3">Approve and manage withdrawal requests</p>
              <p className="text-lg font-bold text-orange-600">{withdrawals.filter(w => w.status === "pending").length}</p>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
            </div>
          </div>
        </motion.div>

        {/* Commission Structure Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-display font-semibold text-lg mb-4">💰 Commission Structure Example</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-muted-foreground mb-2">User Ticket Price</p>
              <p className="text-sm sm:text-2xl font-bold text-blue-600">{formatCurrency(1000)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground mb-2">Admin Commission (5%)</p>
              <p className="text-sm sm:text-2xl font-bold text-green-600">{formatCurrency(50)}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-muted-foreground mb-2">Merchant Receives (95%)</p>
              <p className="text-sm sm:text-2xl font-bold text-purple-600">{formatCurrency(950)}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Revenue" value={`${formatCurrency(totalRevenue)}`} icon={TrendingUp} trend="+12.5%" color="text-green-600"/>
          <StatCard title="Admin Commission (5%)" value={`${formatCurrency(totalCommission)}`} icon={DollarSign} trend="+8.2%" color="text-blue-600"/>
          <StatCard title="Pending Payments" value={pendingPayments} icon={CreditCard} color="text-orange-600"/>
          <StatCard title="Completed Transactions" value={completedTransactions} icon={Wallet} trend="+15.3%" color="text-purple-600"/>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="payouts">Merchant Payouts</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="ratings">Customer Ratings</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by status"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Payment status"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (<div className="text-center py-8 text-muted-foreground">Loading transactions...</div>) : filteredBookings.length === 0 ? (<div className="text-center py-8 text-muted-foreground">No transactions found</div>) : (<Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Event/Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (<TableRow key={booking._id}>
                          <TableCell className="font-mono text-xs">
                            {booking._id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {booking.customer?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {booking.customer?.email || ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{booking.service?.name || booking.event?.title || booking.serviceName || "-"}</div>
                              {booking.service && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>}
                              {booking.event && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(booking.price)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={booking.paymentStatus === "paid"
                    ? "default"
                    : booking.paymentStatus === "refunded"
                        ? "secondary"
                        : "outline"}>
                              {booking.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{booking.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(booking.datetime).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {booking.paymentStatus === "paid" && (<Button variant="outline" size="sm" onClick={() => openRefundDialog(booking)} className="text-red-600 hover:text-red-700">
                                  Refund
                                </Button>)}
                            </div>
                          </TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown (5% per transaction)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Event/Service</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Admin Commission (5%)</TableHead>
                      <TableHead>Merchant Share (95%)</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings
            .filter((b) => b.paymentStatus === "paid")
            .map((booking) => (<TableRow key={booking._id}>
                          <TableCell className="font-mono text-xs">
                            {booking._id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{booking.service?.name || booking.event?.title || booking.serviceName || "-"}</div>
                              {booking.service && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>}
                              {booking.event && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(booking.price)}</TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {formatCurrency((booking.price * COMMISSION_RATE))}
                          </TableCell>
                          <TableCell className="text-blue-600 font-semibold">
                            {formatCurrency((booking.price * (1 - COMMISSION_RATE)))}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(booking.datetime).toLocaleDateString()}
                          </TableCell>
                        </TableRow>))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Refunded Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {refundedTransactions === 0 ? (<div className="text-center py-8 text-muted-foreground">
                    No refunds processed yet
                  </div>) : (<Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Event/Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings
                .filter((b) => b.paymentStatus === "refunded")
                .map((booking) => (<TableRow key={booking._id}>
                            <TableCell className="font-mono text-xs">
                              {booking._id.slice(-8)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {booking.customer?.name || "Unknown"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {booking.customer?.email || ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{booking.service?.name || booking.event?.title || booking.serviceName || "-"}</div>
                                {booking.service && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>}
                                {booking.event && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              -{formatCurrency(booking.price)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Refunded</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(booking.datetime).toLocaleDateString()}
                            </TableCell>
                          </TableRow>))}
                    </TableBody>
                  </Table>)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Merchant Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Payouts Summary</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Commission Structure: 5% admin commission, 95% merchant share
                </p>
              </CardHeader>
              <CardContent>
                {merchantPayouts.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                    No merchant payouts available
                  </div>) : (<Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Total Bookings</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Admin Commission (5%)</TableHead>
                        <TableHead>Net Payout (95%)</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantPayouts.map((payout) => (<TableRow key={payout.merchant._id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payout.merchant.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {payout.merchant.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{payout.bookings.length}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payout.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {formatCurrency(payout.totalCommission)}
                          </TableCell>
                          <TableCell className="text-blue-600 font-semibold text-lg">
                            {formatCurrency(payout.netPayout)}
                          </TableCell>
                          <TableCell>
                            {processedPayouts.has(payout.merchant._id) ? (<div className="flex items-center gap-2 text-green-600 font-semibold">
                                <CheckCircle2 className="h-4 w-4"/>
                                Processed
                              </div>) : (<Button variant="outline" size="sm" onClick={() => handleProcessPayout(payout)} className="text-blue-600 hover:text-blue-700">
                                Process Payout
                              </Button>)}
                          </TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>)}
              </CardContent>
            </Card>

            {/* Merchant Withdrawal Approvals Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-orange-600"/>
                    Pending Withdrawal Approvals
                  </CardTitle>
                  <Button onClick={loadWithdrawals} variant="outline" size="sm" disabled={withdrawalLoading}>
                    <RefreshCcw className="h-4 w-4 mr-2"/>
                    Refresh
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Merchants have requested withdrawals. Review and approve below.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {withdrawalLoading ? (<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin"/> Loading withdrawals...
                  </div>) : withdrawals.filter(w => w.status === "pending").length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                    <p>No pending withdrawal requests</p>
                  </div>) : (withdrawals.filter(w => w.status === "pending").map((withdrawal) => (<div key={withdrawal._id} className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-lg">{withdrawal.merchant?.name}</p>
                            <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Pending</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{withdrawal.merchant?.email}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="p-2 rounded bg-secondary/50">
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-semibold text-orange-600">{formatCurrency(withdrawal.amount)}</p>
                            </div>
                            <div className="p-2 rounded bg-secondary/50">
                              <p className="text-xs text-muted-foreground">Requested</p>
                              <p className="font-semibold text-sm">{new Date(withdrawal.requestedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="p-2 rounded bg-secondary/50">
                              <p className="text-xs text-muted-foreground">Account</p>
                              <p className="font-semibold text-sm">****{withdrawal.bankDetails?.accountNumber?.slice(-4)}</p>
                            </div>
                            <div className="p-2 rounded bg-secondary/50">
                              <p className="text-xs text-muted-foreground">Bank</p>
                              <p className="font-semibold text-sm">{withdrawal.bankDetails?.bankName}</p>
                            </div>
                          </div>

                          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 mb-3">
                            <p className="text-xs text-blue-600">
                              <strong>Account Holder:</strong> {withdrawal.bankDetails?.accountHolder}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              <strong>IFSC Code:</strong> {withdrawal.bankDetails?.ifscCode}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => {
                setSelectedWithdrawal(withdrawal);
                setRejectDialogOpen(true);
            }} disabled={processingWithdrawal === withdrawal._id}>
                          <X className="h-4 w-4 mr-1"/>
                          Reject
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" onClick={() => {
                setSelectedWithdrawal(withdrawal);
                setApproveDialogOpen(true);
            }} disabled={processingWithdrawal === withdrawal._id}>
                          <Check className="h-4 w-4 mr-1"/>
                          Approve
                        </Button>
                      </div>
                    </div>)))}
              </CardContent>
            </Card>

            {/* Payout Summary Card */}
            {merchantPayouts.length > 0 && (<>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Payout Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-sm sm:text-2xl font-bold text-blue-600 mt-2">
                          {formatCurrency(merchantPayouts.reduce((sum, p) => sum + p.totalRevenue, 0))}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-muted-foreground">Total Admin Commission</p>
                        <p className="text-sm sm:text-2xl font-bold text-green-600 mt-2">
                          {formatCurrency(merchantPayouts.reduce((sum, p) => sum + p.totalCommission, 0))}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm text-muted-foreground">Total Merchant Payouts</p>
                        <p className="text-sm sm:text-2xl font-bold text-purple-600 mt-2">
                          {formatCurrency(merchantPayouts.reduce((sum, p) => sum + p.netPayout, 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payout Approval Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Approve All Payouts</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Review and approve all pending merchant payouts at once
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-orange-600">Pending Payouts</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {merchantPayouts.filter(p => !processedPayouts.has(p.merchant._id)).length} merchant(s) waiting for payout approval
                            </p>
                            <p className="text-lg font-bold text-orange-600 mt-2">
                              {formatCurrency(merchantPayouts
                .filter(p => !processedPayouts.has(p.merchant._id))
                .reduce((sum, p) => sum + p.netPayout, 0))}
                            </p>
                          </div>
                          <Button onClick={() => setApproveAllDialogOpen(true)} disabled={merchantPayouts.filter(p => !processedPayouts.has(p.merchant._id)).length === 0} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" size="lg">
                            <CheckCircle2 className="h-5 w-5 mr-2"/>
                            Approve All Payouts
                          </Button>
                        </div>
                      </div>

                      {/* Processed Payouts Summary */}
                      {merchantPayouts.some(p => processedPayouts.has(p.merchant._id)) && (<div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-green-600">Processed Payouts</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {merchantPayouts.filter(p => processedPayouts.has(p.merchant._id)).length} merchant(s) payout(s) approved
                              </p>
                              <p className="text-lg font-bold text-green-600 mt-2">
                                {formatCurrency(merchantPayouts
                    .filter(p => processedPayouts.has(p.merchant._id))
                    .reduce((sum, p) => sum + p.netPayout, 0))}
                              </p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-600"/>
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>
              </>)}
          </TabsContent>

          {/* Customer Ratings Tab */}
          <TabsContent value="ratings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Ratings & Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.filter(b => b.rating?.score).length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                    No ratings yet
                  </div>) : (<div className="space-y-4">
                    {bookings
                .filter(b => b.rating?.score)
                .sort((a, b) => new Date(b.rating?.ratedAt || 0).getTime() - new Date(a.rating?.ratedAt || 0).getTime())
                .map((booking) => (<div key={booking._id} className="p-4 rounded-lg border border-border bg-secondary/30">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold">{booking.customer?.name}</p>
                              <p className="text-sm text-muted-foreground">{booking.service?.name || booking.event?.title || booking.serviceName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (<span key={star} className={star <= (booking.rating?.score || 0) ? "text-yellow-500" : "text-muted-foreground"}>
                                    ⭐
                                  </span>))}
                              </div>
                              <span className="font-semibold">{booking.rating?.score}/5</span>
                            </div>
                          </div>
                          
                          {booking.rating?.comment && (<p className="text-sm text-muted-foreground mb-2 italic">"{booking.rating.comment}"</p>)}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Merchant: {booking.assignedTo?.name || "Unassigned"}</span>
                            <span>{new Date(booking.rating?.ratedAt || 0).toLocaleDateString()}</span>
                          </div>
                        </div>))}
                  </div>)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5"/>
                    Merchant Withdrawal Requests
                  </CardTitle>
                  <Button onClick={loadWithdrawals} variant="outline" size="sm">
                    <RefreshCcw className="h-4 w-4 mr-2"/>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {withdrawalLoading ? (<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin"/> Loading withdrawals...
                  </div>) : withdrawals.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40"/>
                    <p>No pending withdrawal requests</p>
                  </div>) : (<div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => (<TableRow key={withdrawal._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{withdrawal.merchant?.name}</p>
                                <p className="text-xs text-muted-foreground">{withdrawal.merchant?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(withdrawal.amount)}</TableCell>
                            <TableCell className="text-sm">
                              <div className="space-y-1">
                                <p>{withdrawal.bankDetails?.accountHolder}</p>
                                <p className="text-muted-foreground">{withdrawal.bankDetails?.accountNumber}</p>
                                <p className="text-muted-foreground">{withdrawal.bankDetails?.ifscCode}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(withdrawal.requestedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={withdrawal.status === "pending" ? "bg-yellow-500/20 text-yellow-600" :
                    withdrawal.status === "approved" ? "bg-blue-500/20 text-blue-600" :
                        withdrawal.status === "completed" ? "bg-green-500/20 text-green-600" :
                            "bg-red-500/20 text-red-600"}>
                                {withdrawal.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="space-x-2">
                              {withdrawal.status === "pending" && (<>
                                  <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setApproveDialogOpen(true);
                    }} disabled={processingWithdrawal === withdrawal._id}>
                                    <Check className="h-4 w-4 mr-1"/>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setRejectDialogOpen(true);
                    }} disabled={processingWithdrawal === withdrawal._id}>
                                    <X className="h-4 w-4 mr-1"/>
                                    Reject
                                  </Button>
                                </>)}
                              {withdrawal.status === "approved" && (<Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700" onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setCompleteDialogOpen(true);
                    }} disabled={processingWithdrawal === withdrawal._id}>
                                  <CheckCircle2 className="h-4 w-4 mr-1"/>
                                  Complete
                                </Button>)}
                              {withdrawal.status === "completed" && (<div className="flex items-center gap-2 text-green-600 font-semibold">
                                  <CheckCircle2 className="h-4 w-4"/>
                                  Completed
                                </div>)}
                              {withdrawal.status === "rejected" && (<div className="flex items-center gap-2 text-red-600 font-semibold">
                                  <X className="h-4 w-4"/>
                                  Rejected
                                </div>)}
                            </TableCell>
                          </TableRow>))}
                      </TableBody>
                    </Table>
                  </div>)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Refund Dialog */}
        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Are you sure you want to process a refund for this transaction?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Transaction Details</Label>
                <div className="mt-2 p-3 rounded-lg bg-secondary">
                  <div className="text-sm">
                    <strong>Event/Service:</strong>{" "}
                    {selectedBooking?.service?.name || selectedBooking?.event?.title || selectedBooking?.serviceName}
                  </div>
                  <div className="text-sm">
                    <strong>Customer:</strong> {selectedBooking?.customer?.name}
                  </div>
                  <div className="text-sm">
                    <strong>Amount:</strong> {formatCurrency(selectedBooking?.price)}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Refund Reason</Label>
                <Textarea id="reason" placeholder="Please provide a reason for the refund..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="mt-2"/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRefund}>
                Confirm Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Withdrawal Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Withdrawal</DialogTitle>
              <DialogDescription>
                Approve this withdrawal request from the merchant
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary">
                <div className="text-sm">
                  <strong>Merchant:</strong> {selectedWithdrawal?.merchant?.name}
                </div>
                <div className="text-sm">
                  <strong>Amount:</strong> {formatCurrency(selectedWithdrawal?.amount)}
                </div>
                <div className="text-sm">
                  <strong>Account:</strong> {selectedWithdrawal?.bankDetails?.accountNumber}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveWithdrawal} disabled={processingWithdrawal === selectedWithdrawal?._id} className="bg-green-600 hover:bg-green-700">
                {processingWithdrawal === selectedWithdrawal?._id ? "Approving..." : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Withdrawal Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Withdrawal</DialogTitle>
              <DialogDescription>
                Mark this withdrawal as completed
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary">
                <div className="text-sm">
                  <strong>Merchant:</strong> {selectedWithdrawal?.merchant?.name}
                </div>
                <div className="text-sm">
                  <strong>Amount:</strong> {formatCurrency(selectedWithdrawal?.amount)}
                </div>
              </div>
              <div>
                <Label htmlFor="transactionId">Transaction ID</Label>
                <Input id="transactionId" placeholder="Enter bank transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-2"/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteWithdrawal} disabled={processingWithdrawal === selectedWithdrawal?._id} className="bg-blue-600 hover:bg-blue-700">
                {processingWithdrawal === selectedWithdrawal?._id ? "Completing..." : "Complete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Withdrawal Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Withdrawal</DialogTitle>
              <DialogDescription>
                Reject this withdrawal request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary">
                <div className="text-sm">
                  <strong>Merchant:</strong> {selectedWithdrawal?.merchant?.name}
                </div>
                <div className="text-sm">
                  <strong>Amount:</strong> {formatCurrency(selectedWithdrawal?.amount)}
                </div>
              </div>
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea id="rejectionReason" placeholder="Please provide a reason for rejection..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2"/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRejectWithdrawal} disabled={processingWithdrawal === selectedWithdrawal?._id} variant="destructive">
                {processingWithdrawal === selectedWithdrawal?._id ? "Rejecting..." : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve All Payouts Dialog */}
        <Dialog open={approveAllDialogOpen} onOpenChange={setApproveAllDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve All Pending Payouts</DialogTitle>
              <DialogDescription>
                This will approve all pending merchant payouts and notify each merchant
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm font-semibold text-orange-600 mb-3">Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchants to approve:</span>
                    <span className="font-semibold">{merchantPayouts.filter(p => !processedPayouts.has(p.merchant._id)).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total amount:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(merchantPayouts
            .filter(p => !processedPayouts.has(p.merchant._id))
            .reduce((sum, p) => sum + p.netPayout, 0))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-600">
                  ℹ️ Each merchant will receive a notification about their payout approval
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveAllDialogOpen(false)} disabled={approvingAll}>
                Cancel
              </Button>
              <Button onClick={handleApproveAllPayouts} disabled={approvingAll} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                {approvingAll ? (<>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                    Approving...
                  </>) : (<>
                    <CheckCircle2 className="h-4 w-4 mr-2"/>
                    Approve All Payouts
                  </>)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </AdminLayout>);
};
export default PaymentManagement;
