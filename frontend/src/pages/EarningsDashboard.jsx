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
    const StatCard = ({ title, value, icon: Icon, color, trend }) => (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-sm sm:text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {trend && <p className="text-xs text-green-500 mt-2">↑ {trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}>
          <Icon className="h-6 w-6"/>
        </div>
      </div>
    </motion.div>);
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-base sm:text-3xl font-bold flex items-center gap-2">
                <DollarSign className="h-7 w-7 text-primary"/>
                Earnings <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Track your earnings, commissions, and withdrawals</p>
            </div>
            <Button onClick={loadEarningsData} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard title="Total Earnings" value={formatCurrency(earnings?.totalEarnings || 0)} icon={TrendingUp} color="text-green-600" trend="+12.5%"/>
          <StatCard title="Commission Deducted" value={formatCurrency(earnings?.totalCommission || 0)} icon={ArrowDownRight} color="text-red-600"/>
          <StatCard title="Total Withdrawn" value={formatCurrency(earnings?.totalWithdrawn || 0)} icon={Wallet} color="text-blue-600"/>
          <StatCard title="Total Refunded" value={formatCurrency(earnings?.totalRefunded || 0)} icon={RefreshCcw} color="text-orange-600"/>
          <StatCard title="Available Balance" value={formatCurrency(earnings?.availableBalance || 0)} icon={DollarSign} color="text-purple-600"/>
        </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 mb-8">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <Button onClick={() => setWithdrawalDialogOpen(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg">
            <ArrowUpRight className="h-4 w-4 mr-2"/>
            Request Withdrawal
          </Button>
        </motion.div>

        {/* Withdrawal History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                  <p>No withdrawal requests yet</p>
                </div>) : (<div className="space-y-3">
                  {(showAllWithdrawals ? withdrawals : withdrawals.slice(0, 10)).map((withdrawal) => (<div key={withdrawal._id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {withdrawal.bankDetails?.bankName} - {withdrawal.bankDetails?.accountNumber?.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(withdrawal.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {withdrawal.status === "pending" && (<div className="flex items-center gap-1 text-orange-600 font-semibold text-sm">
                              <Clock className="h-4 w-4"/>
                              Pending
                            </div>)}
                          {withdrawal.status === "approved" && (<div className="flex items-center gap-1 text-blue-600 font-semibold text-sm">
                              <CheckCircle2 className="h-4 w-4"/>
                              Approved
                            </div>)}
                          {withdrawal.status === "completed" && (<div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                              <CheckCircle2 className="h-4 w-4"/>
                              Completed
                            </div>)}
                          {withdrawal.status === "rejected" && (<div className="flex items-center gap-1 text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4"/>
                              Rejected
                            </div>)}
                        </div>
                      </div>
                    </div>))}
                  {withdrawals.length > 10 && (<div className="text-center pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllWithdrawals(!showAllWithdrawals)} className="text-primary hover:text-primary/80 font-semibold">
                        {showAllWithdrawals ? "Show Less" : `View All (${withdrawals.length})`}
                      </Button>
                    </div>)}
                </div>)}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5"/>
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                  <p>No transactions yet</p>
                </div>) : (<div className="space-y-3">
                  {(showAllTransactions ? transactions : transactions.slice(0, 10)).map((transaction) => (<div key={transaction._id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{transaction.type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{transaction.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {(() => {
                    const isPositive = Number(transaction.amount) >= 0 && transaction.type !== "commission_deduction";
                    const displayAmount = Math.abs(transaction.amount);
                    return (<p className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                {isPositive ? "+" : "-"}{formatCurrency(displayAmount)}
                              </p>);
                })()}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          {transaction.status === "completed" && (<div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                              <CheckCircle2 className="h-4 w-4"/>
                            </div>)}
                          {transaction.status === "pending" && (<div className="flex items-center gap-1 text-orange-600 font-semibold text-sm">
                              <Clock className="h-4 w-4"/>
                            </div>)}
                          {transaction.status === "failed" && (<div className="flex items-center gap-1 text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4"/>
                            </div>)}
                        </div>
                      </div>
                    </div>))}
                  {transactions.length > 10 && (<div className="text-center pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllTransactions(!showAllTransactions)} className="text-primary hover:text-primary/80 font-semibold">
                        {showAllTransactions ? "Show Less" : `View All (${transactions.length})`}
                      </Button>
                    </div>)}
                </div>)}
            </CardContent>
          </Card>
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
