import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Wallet, History, ArrowDownRight, ArrowUpRight, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, RefreshCcw } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiGetEarningsDashboard, apiRequestWithdrawal, apiGetWithdrawals, apiGetTransactions } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
const EarningsDashboard = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [bankDetails, setBankDetails] = useState({
        accountHolder: "",
        accountNumber: "",
        ifscCode: "",
        bankName: ""
    });
    const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
    const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const loadEarningsData = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            const [earningsRes, withdrawalsRes, transactionsRes] = await Promise.all([
                apiGetEarningsDashboard(token),
                apiGetWithdrawals(token),
                apiGetTransactions(token)
            ]);
            setEarnings(earningsRes);
            setWithdrawals(withdrawalsRes.withdrawals || []);
            setTransactions(transactionsRes.transactions || []);
        }
        catch (error) {
            toast.error(error.message || "Failed to load earnings data");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadEarningsData();
    }, [token]);
    // Smooth real-time updates without blinking
    useEffect(() => {
        if (!token)
            return;
        const pollInterval = setInterval(async () => {
            try {
                const [earningsRes, withdrawalsRes, transactionsRes] = await Promise.all([
                    apiGetEarningsDashboard(token),
                    apiGetWithdrawals(token),
                    apiGetTransactions(token)
                ]);
                setEarnings(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(earningsRes)) {
                        return earningsRes;
                    }
                    return prev;
                });
                setWithdrawals(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(withdrawalsRes.withdrawals || [])) {
                        return withdrawalsRes.withdrawals || [];
                    }
                    return prev;
                });
                setTransactions(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(transactionsRes.transactions || [])) {
                        return transactionsRes.transactions || [];
                    }
                    return prev;
                });
            }
            catch {
                // silently ignore polling errors
            }
        }, 2000); // Poll every 2 seconds for real-time updates
        // Listen for earnings update events
        const handleEarningsUpdate = async () => {
            try {
                const earningsRes = await apiGetEarningsDashboard(token);
                setEarnings(earningsRes);
                const withdrawalsRes = await apiGetWithdrawals(token);
                setWithdrawals(withdrawalsRes.withdrawals || []);
                const transactionsRes = await apiGetTransactions(token);
                setTransactions(transactionsRes.transactions || []);
            }
            catch {
                // silently ignore
            }
        };
        window.addEventListener("earningsUpdated", handleEarningsUpdate);
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener("earningsUpdated", handleEarningsUpdate);
        };
    }, [token]);
    const handleRequestWithdrawal = async () => {
        if (withdrawalAmount.length > 10) {
            toast.error("Withdrawal amount cannot exceed 10 digits");
            return;
        }
        const amountVal = parseFloat(withdrawalAmount);
        if (isNaN(amountVal) || amountVal < 1) {
            toast.error("Please enter a valid amount (minimum ₹1)");
            return;
        }
        if (amountVal > (earnings?.availableBalance || 0)) {
            toast.error("Insufficient balance for withdrawal");
            return;
        }
        // Account Holder Name validation
        const holder = bankDetails.accountHolder.trim();
        if (!holder) {
            toast.error("Account holder name is required");
            return;
        }
        if (holder.length < 2 || holder.length > 50) {
            toast.error("Account holder name must be between 2 and 50 characters");
            return;
        }
        if (!/^[a-zA-Z\s.]+$/.test(holder)) {
            toast.error("Account holder name can only contain letters, spaces, and dots");
            return;
        }
        // Account Number validation
        const accNum = bankDetails.accountNumber.trim();
        if (!accNum) {
            toast.error("Account number is required");
            return;
        }
        if (!/^\d+$/.test(accNum)) {
            toast.error("Account number must contain only numbers");
            return;
        }
        if (accNum.length < 9 || accNum.length > 18) {
            toast.error("Account number must be between 9 and 18 digits");
            return;
        }
        // IFSC Code validation
        const ifsc = bankDetails.ifscCode.trim().toUpperCase();
        if (!ifsc) {
            toast.error("IFSC Code is required");
            return;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
            toast.error("Invalid IFSC Code format. E.g. SBIN0001234 (11 characters: 4 letters, '0', then 6 letters/digits)");
            return;
        }
        // Bank Name validation
        const bank = bankDetails.bankName.trim();
        if (!bank) {
            toast.error("Bank name is required");
            return;
        }
        if (bank.length < 2 || bank.length > 50) {
            toast.error("Bank name must be between 2 and 50 characters");
            return;
        }
        if (!/^[a-zA-Z\s&().-]+$/.test(bank)) {
            toast.error("Bank name contains invalid characters");
            return;
        }
        setSubmittingWithdrawal(true);
        try {
            await apiRequestWithdrawal(amountVal, {
                accountHolder: holder,
                accountNumber: accNum,
                ifscCode: ifsc,
                bankName: bank
            }, token);
            toast.success("Withdrawal request submitted successfully");
            setWithdrawalDialogOpen(false);
            setWithdrawalAmount("");
            setBankDetails({ accountHolder: "", accountNumber: "", ifscCode: "", bankName: "" });
            loadEarningsData();
        }
        catch (error) {
            toast.error(error.message || "Failed to request withdrawal");
        }
        finally {
            setSubmittingWithdrawal(false);
        }
    };
    const statsGridRef = useGsapStagger([earnings]);
    if (loading) {
        return (<MerchantLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading earnings data…
          </div>
        </section>
      </MerchantLayout>);
    }
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-primary"/>
                Earnings <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Track your earnings, commissions, and withdrawals</p>
            </div>
            <Button onClick={loadEarningsData} variant="outline" size="sm" className="w-full sm:w-auto">
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div ref={statsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <StatCard title="Total Earnings" value={formatCurrency(earnings?.totalEarnings || 0)} icon={<TrendingUp className="h-5 w-5"/>} index={0} trend="12.5%"/>
          <StatCard title="Commission Deducted" value={formatCurrency(earnings?.totalCommission || 0)} icon={<ArrowDownRight className="h-5 w-5"/>} index={1}/>
          <StatCard title="Total Withdrawn" value={formatCurrency(earnings?.totalWithdrawn || 0)} icon={<Wallet className="h-5 w-5"/>} index={2}/>
          <StatCard title="Total Refunded" value={formatCurrency(earnings?.totalRefunded || 0)} icon={<RefreshCcw className="h-5 w-5"/>} index={3}/>
          <StatCard title="Available Balance" value={formatCurrency(earnings?.availableBalance || 0)} icon={<DollarSign className="h-5 w-5"/>} index={4}/>
        </div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <p className="text-sm text-muted-foreground mb-2">Paid Bookings</p>
            <p className="text-xs sm:text-3xl font-bold text-primary">{earnings?.completedBookings || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <p className="text-sm text-muted-foreground mb-2">Pending Withdrawals</p>
            <p className="text-xs sm:text-3xl font-bold text-orange-600">{earnings?.pendingWithdrawals || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 sm:p-6">
            <p className="text-sm text-muted-foreground mb-2">Pending Amount</p>
            <p className="text-xs sm:text-3xl font-bold text-orange-600">{formatCurrency(earnings?.pendingWithdrawalAmount || 0)}</p>
          </div>
        </motion.div>

        {/* Withdrawal Request Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.3 }} className="mb-8">
          <Button onClick={() => setWithdrawalDialogOpen(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg">
            <ArrowUpRight className="h-4 w-4 mr-2"/>
            Request Withdrawal
          </Button>
        </motion.div>

        {/* Withdrawal History */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.4 }} className="mb-8">
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-6 border-b border-border/80">
              <h2 className="font-display text-lg sm:text-xl font-bold">Withdrawal Requests</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Track your submitted withdrawal requests and payout progress.</p>
            </div>
            {withdrawals.length === 0 ? (
              <TableEmptyState title="No withdrawal requests yet" description="Your requested withdrawals will appear here." colSpan={4} />
            ) : (
              <DataTable minWidth="600px">
                <TableHeader>
                  <TableHeaderCell width="140px">Amount</TableHeaderCell>
                  <TableHeaderCell width="200px">Bank Details</TableHeaderCell>
                  <TableHeaderCell width="140px">Requested Date</TableHeaderCell>
                  <TableHeaderCell align="right" width="120px">Status</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {(showAllWithdrawals ? withdrawals : withdrawals.slice(0, 10)).map((w) => (
                    <TableRow key={w._id}>
                      <TableCell className="font-bold text-xs text-foreground">{formatCurrency(w.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.bankDetails?.bankName} — •••• {w.bankDetails?.accountNumber?.slice(-4)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <StatusBadge status={w.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            )}
            {withdrawals.length > 10 && (
              <div className="p-3 text-center border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setShowAllWithdrawals(!showAllWithdrawals)} className="text-primary hover:text-primary/80 font-semibold text-xs">
                  {showAllWithdrawals ? "Show Less" : `View All (${withdrawals.length})`}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.5 }}>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-6 border-b border-border/80">
              <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary"/> Transaction History
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Full audit trail of earnings, deductions, and payouts.</p>
            </div>
            {transactions.length === 0 ? (
              <TableEmptyState title="No transactions yet" description="Recent financial transactions will be recorded here." colSpan={4} />
            ) : (
              <DataTable minWidth="600px">
                <TableHeader>
                  <TableHeaderCell width="150px">Type</TableHeaderCell>
                  <TableHeaderCell width="250px">Description</TableHeaderCell>
                  <TableHeaderCell width="130px">Date</TableHeaderCell>
                  <TableHeaderCell align="right" width="130px">Amount</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {(showAllTransactions ? transactions : transactions.slice(0, 10)).map((t) => {
                    const isPositive = Number(t.amount) >= 0 && t.type !== "commission_deduction";
                    const displayAmount = Math.abs(t.amount);
                    return (
                      <TableRow key={t._id}>
                        <TableCell className="font-semibold text-xs text-foreground capitalize">
                          {t.type.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right" className={`font-bold text-xs ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                          {isPositive ? "+" : "-"}{formatCurrency(displayAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTable>
            )}
            {transactions.length > 10 && (
              <div className="p-3 text-center border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setShowAllTransactions(!showAllTransactions)} className="text-primary hover:text-primary/80 font-semibold text-xs">
                  {showAllTransactions ? "Show Less" : `View All (${transactions.length})`}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <DialogContent className="max-w-sm p-5 gap-3">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold">Request Withdrawal</DialogTitle>
              <DialogDescription className="text-xs">
                Enter the amount and bank details for your withdrawal request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs">Withdrawal Amount</Label>
                <div className="mt-1 p-2 rounded-md bg-secondary">
                  <p className="text-xs text-muted-foreground">Available Balance: {formatCurrency(earnings?.availableBalance || 0)}</p>
                </div>
                <Input type="number" placeholder="Enter amount" value={withdrawalAmount} onChange={(e) => {
            const val = e.target.value;
            if (val.length <= 10)
                setWithdrawalAmount(val);
        }} className="mt-1.5 h-9 text-xs" min="0" max={earnings?.availableBalance || 0}/>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-semibold text-xs mb-2">Bank Details</h4>
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-[10px]">Account Holder Name</Label>
                    <Input placeholder="Full name" maxLength={50} value={bankDetails.accountHolder} onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })} className="mt-0.5 h-9 text-xs"/>
                  </div>
                  <div>
                    <Label className="text-[10px]">Account Number</Label>
                    <Input placeholder="Account number" maxLength={18} value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, '') })} className="mt-0.5 h-9 text-xs"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">IFSC Code</Label>
                      <Input placeholder="IFSC code" maxLength={11} value={bankDetails.ifscCode} onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} className="mt-0.5 h-9 text-xs"/>
                    </div>
                    <div>
                      <Label className="text-[10px]">Bank Name</Label>
                      <Input placeholder="Bank name" maxLength={50} value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} className="mt-0.5 h-9 text-xs"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2 flex-row gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setWithdrawalDialogOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button onClick={handleRequestWithdrawal} disabled={submittingWithdrawal} size="sm" className="bg-gradient-primary text-primary-foreground h-9 text-xs">
                {submittingWithdrawal ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </MerchantLayout>);
};
export default EarningsDashboard;
