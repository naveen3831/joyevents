import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Wallet, History, ArrowDownRight, ArrowUpRight, Loader2, RefreshCcw } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiGetEarningsDashboard, apiGetWithdrawals, apiGetTransactions } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

const EarningsDashboard = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
    const [showAllTransactions, setShowAllTransactions] = useState(false);

    const loadEarningsData = async () => {
        if (!token) return;
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
        if (!token) return;
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

    const statsGridRef = useGsapStagger([earnings]);

    if (loading) {
        return (
            <MerchantLayout>
                <section className="py-2 sm:py-8 lg:py-10">
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin"/> Loading earnings data…
                    </div>
                </section>
            </MerchantLayout>
        );
    }

    return (
        <MerchantLayout>
            <div className="w-full min-w-0 space-y-5 font-sans">
                <PageHeader
                    title="Earnings & Wallet"
                    subtitle="Monitor total earnings, available balance, transaction history, and payout requests."
                    breadcrumbs={[
                        { label: "Merchant Portal", to: "/merchant-dashboard" },
                        { label: "Growth" },
                        { label: "Earnings" },
                    ]}
                    actions={
                        <Button onClick={() => navigate("/merchant-dashboard/withdraw")} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-3.5">
                            <Wallet className="mr-1.5 h-4 w-4"/> Request Withdrawal
                        </Button>
                    }
                />

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
                    <Button onClick={() => navigate("/merchant-dashboard/withdraw")} className="bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg">
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
            </div>
        </MerchantLayout>
    );
};

export default EarningsDashboard;
