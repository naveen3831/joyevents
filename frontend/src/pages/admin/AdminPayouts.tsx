import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Wallet, DollarSign, TrendingUp, Users, CreditCard, CheckCircle, Clock, ArrowRight, XCircle, Loader2, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiListUsers, apiFetchWithdrawals, apiApproveWithdrawal, apiRejectWithdrawal, apiProcessMerchantPayout } from "@/lib/api";
import { toast } from "sonner";

interface Merchant {
  _id: string;
  name: string;
  email: string;
}

interface WithdrawalRequest {
  _id: string;
  merchant: { _id: string; name: string; email: string };
  amount: number;
  status: string;
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  transactionId?: string;
}

interface Booking {
  _id: string;
  customer: {
    _id: string;
    name: string;
    email: string;
  };
  event?: {
    _id: string;
    title: string;
  };
  serviceName?: string;
  price: number;
  datetime: string;
  status: string;
  paymentStatus: string;
  payoutProcessed?: boolean;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  completedAt?: string;
}

interface MerchantPayout {
  merchant: Merchant;
  totalEarnings: number;
  commission: number;
  netPayout: number;
  completedBookings: number;
  pendingPayout: boolean;
}

const COMMISSION_RATE = 0.05; // 5% commission

const WITHDRAWAL_STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  approved: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
  completed: "bg-green-500/15 text-green-400 border border-green-500/30",
};

const AdminPayouts = () => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [payoutNote, setPayoutNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadData();
    loadWithdrawalRequests();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, usersData] = await Promise.all([
        apiListBookings(undefined, token!),
        apiListUsers(token!)
      ]);
      
      // Filter completed and paid bookings
      const completedPaid = (bookingsData.bookings || []).filter((b: Booking) => 
        b.status === "completed" && b.paymentStatus === "paid"
      );
      setBookings(completedPaid);
      
      // Get all merchants
      const merchantUsers = (usersData.users || []).filter((u: any) => u.role === "merchant");
      setMerchants(merchantUsers);
    } catch (error) {
      toast.error("Failed to load payout data");
    } finally {
      setLoading(false);
    }
  };

  const calculateMerchantPayouts = (): MerchantPayout[] => {
    const payoutMap = new Map<string, MerchantPayout>();

    bookings.forEach((booking) => {
      if (!booking.assignedTo) return;

      const merchantId = booking.assignedTo._id;
      const existing = payoutMap.get(merchantId);

      const grossEarnings = booking.price || 0;
      const commission = grossEarnings * COMMISSION_RATE;
      const netPayout = grossEarnings - commission;
      const isUnpaid = !booking.payoutProcessed;

      if (existing) {
        existing.totalEarnings += grossEarnings;
        existing.commission += commission;
        existing.netPayout += netPayout;
        existing.completedBookings += 1;
        // If any booking is unpaid, mark as pending
        if (isUnpaid) existing.pendingPayout = true;
      } else {
        const merchant = merchants.find(m => m._id === merchantId);
        if (merchant) {
          payoutMap.set(merchantId, {
            merchant,
            totalEarnings: grossEarnings,
            commission,
            netPayout,
            completedBookings: 1,
            pendingPayout: isUnpaid
          });
        }
      }
    });

    return Array.from(payoutMap.values());
  };

  const loadWithdrawalRequests = async () => {
    try {
      setLoadingWithdrawals(true);
      const data = await apiFetchWithdrawals(token!);
      // Filter only pending withdrawals for approval
      const pending = (data.withdrawals || []).filter((w: WithdrawalRequest) => w.status === "pending");
      setWithdrawalRequests(pending);
    } catch (error) {
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    if (!confirm(`Are you sure you want to approve this withdrawal request of ${formatCurrency(withdrawal.amount)} for ${withdrawal.merchant.name}?`)) {
      return;
    }

    setActionInProgress(withdrawal._id);
    try {
      await apiApproveWithdrawal(withdrawal._id, token!);
      toast.success(`Withdrawal approved for ${withdrawal.merchant.name}`);
      loadWithdrawalRequests(); // Reload to update list
    } catch (error: any) {
      toast.error(error.message || "Failed to approve withdrawal");
    } finally {
      setActionInProgress(null);
    }
  };

  const openRejectDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionInProgress(selectedWithdrawal._id);
    try {
      await apiRejectWithdrawal(selectedWithdrawal._id, rejectionReason, token!);
      toast.success(`Withdrawal rejected for ${selectedWithdrawal.merchant.name}`);
      setRejectDialogOpen(false);
      setRejectionReason("");
      loadWithdrawalRequests(); // Reload to update list
    } catch (error: any) {
      toast.error(error.message || "Failed to reject withdrawal");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedMerchant) return;

    setProcessing(true);
    try {
      const payout = merchantPayouts.find(p => p.merchant._id === selectedMerchant._id);
      if (!payout) throw new Error("Payout data not found");

      // Get booking IDs for this merchant
      const merchantBookingIds = bookings
        .filter(b => b.assignedTo?._id === selectedMerchant._id)
        .map(b => b._id);

      await apiProcessMerchantPayout(
        selectedMerchant._id,
        Math.round(payout.netPayout * 100) / 100,
        merchantBookingIds,
        token!
      );
      
      toast.success(`${formatCurrency(payout.netPayout)} credited to ${selectedMerchant.name} successfully!`);
      setPayoutDialogOpen(false);
      setPayoutNote("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to process payout");
    } finally {
      setProcessing(false);
    }
  };

  const openPayoutDialog = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setPayoutNote("");
    setPayoutDialogOpen(true);
  };

  const merchantPayouts = calculateMerchantPayouts();
  const totalPayoutAmount = merchantPayouts.reduce((sum, p) => sum + p.netPayout, 0);
  const totalCommission = merchantPayouts.reduce((sum, p) => sum + p.commission, 0);

  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
                  Merchant <span className="text-gradient">Payouts</span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage and process merchant payouts from completed bookings
                </p>
              </div>
            </div>
          </div>

          {/* Payout Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-500/15 p-3">
                    <Wallet className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payout Amount</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalPayoutAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/15 p-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform Commission</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalCommission)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/15 p-3">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Merchants</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{merchantPayouts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-orange-500/15 p-3">
                    <CheckCircle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Bookings</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">
                      {merchantPayouts.reduce((sum, p) => sum + p.completedBookings, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Requests Section */}
          <Card className="mb-8 border-yellow-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                  <div>
                    <CardTitle>Pending Withdrawal Requests</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review and approve or reject merchant withdrawal requests
                    </p>
                  </div>
                </div>
                {withdrawalRequests.length > 0 && (
                  <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    {withdrawalRequests.length} Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingWithdrawals ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading withdrawal requests...
                </div>
              ) : withdrawalRequests.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No pending withdrawal requests.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRequests.map((withdrawal) => (
                      <TableRow key={withdrawal._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{withdrawal.merchant.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {withdrawal.merchant.email}
                        </TableCell>
                        <TableCell className="font-semibold text-purple-600">
                          {formatCurrency(withdrawal.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {withdrawal.bankDetails?.accountHolder && (
                              <p className="truncate max-w-[200px]">{withdrawal.bankDetails.accountHolder}</p>
                            )}
                            {withdrawal.bankDetails?.accountNumber && (
                              <p className="text-muted-foreground">****{withdrawal.bankDetails.accountNumber.slice(-4)}</p>
                            )}
                            {withdrawal.bankDetails?.ifscCode && (
                              <p className="text-muted-foreground">{withdrawal.bankDetails.ifscCode}</p>
                            )}
                            {withdrawal.bankDetails?.bankName && (
                              <p className="text-muted-foreground">{withdrawal.bankDetails.bankName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(withdrawal.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={WITHDRAWAL_STATUS_BADGE[withdrawal.status] || "bg-secondary text-muted-foreground"}>
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveWithdrawal(withdrawal)}
                              disabled={actionInProgress === withdrawal._id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {actionInProgress === withdrawal._id ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectDialog(withdrawal)}
                              disabled={actionInProgress === withdrawal._id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {actionInProgress === withdrawal._id ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Merchant Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Merchant Payout Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  Loading payout data...
                </div>
              ) : merchantPayouts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No merchant payouts to process.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Completed Bookings</TableHead>
                      <TableHead>Gross Earnings</TableHead>
                      <TableHead>Platform Commission (5%)</TableHead>
                      <TableHead>Net Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchantPayouts.map((payout) => (
                      <TableRow key={payout.merchant._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.merchant.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payout.merchant.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payout.completedBookings}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payout.totalEarnings)}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          {formatCurrency(payout.commission)}
                        </TableCell>
                        <TableCell className="text-purple-600 font-bold">
                          {formatCurrency(payout.netPayout)}
                        </TableCell>
                        <TableCell>
                          <Badge className={payout.pendingPayout ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}>
                            {payout.pendingPayout ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payout.pendingPayout ? (
                            <Button
                              size="sm"
                              onClick={() => openPayoutDialog(payout.merchant)}
                            >
                              Process Payout
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Payout Done
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Merchant Payout</DialogTitle>
            <DialogDescription>
              You are about to process a payout to {selectedMerchant?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Merchant Name</Label>
                <p className="text-sm font-medium mt-1">{selectedMerchant?.name}</p>
              </div>
              <div>
                <Label>Merchant Email</Label>
                <p className="text-sm font-medium mt-1">{selectedMerchant?.email}</p>
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <Label>Gross Earnings</Label>
                <p className="text-sm font-semibold">
                  {formatCurrency(selectedMerchant ? merchantPayouts.find(p => p.merchant._id === selectedMerchant._id)?.totalEarnings : 0)}
                </p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <Label>Platform Commission (5%)</Label>
                <p className="text-sm font-semibold text-green-600">
                  -{formatCurrency(selectedMerchant ? merchantPayouts.find(p => p.merchant._id === selectedMerchant._id)?.commission : 0)}
                </p>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Net Payout Amount</Label>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(selectedMerchant ? merchantPayouts.find(p => p.merchant._id === selectedMerchant._id)?.netPayout : 0)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="payout-note">Payout Note (Optional)</Label>
              <Textarea
                id="payout-note"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Add a note for this payout..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <CreditCard className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Payout Information:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                  <li>The payout will be transferred to the merchant's registered account</li>
                  <li>Transaction ID will be generated upon successful transfer</li>
                  <li>Both admin and merchant will receive confirmation</li>
                  <li>Payout history will be updated automatically</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessPayout}
              disabled={processing}
              className="bg-primary hover:bg-primary/90"
            >
              {processing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Confirm Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Withdrawal Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              You are about to reject this withdrawal request for {selectedWithdrawal?.merchant.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <Label>Merchant Name</Label>
                <p className="text-sm font-medium">{selectedWithdrawal?.merchant.name}</p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <Label>Merchant Email</Label>
                <p className="text-sm font-medium">{selectedWithdrawal?.merchant.email}</p>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-base">Withdrawal Amount</Label>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedWithdrawal?.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this withdrawal request..."
                rows={4}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-200">
                <p className="font-medium mb-1">Important Information:</p>
                <ul className="list-disc list-inside space-y-1 text-red-300/80">
                  <li>The merchant will be notified of this rejection</li>
                  <li>The rejection reason will be visible to the merchant</li>
                  <li>The withdrawal status will be changed to "rejected"</li>
                  <li>The merchant can submit a new withdrawal request if needed</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionInProgress === selectedWithdrawal?._id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectWithdrawal}
              disabled={actionInProgress === selectedWithdrawal?._id || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionInProgress === selectedWithdrawal?._id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPayouts;
