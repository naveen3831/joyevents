import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, Wallet, History, ArrowDownRight, ArrowUpRight, Loader2, RefreshCcw } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiGetEarningsDashboard, apiGetWithdrawals, apiGetTransactions } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

const formatWithdrawalDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
        return "—";
    }
};

const formatTransactionDate = (dateStr) => {
    if (!dateStr) return { date: "—", time: "" };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: "—", time: "" };
        const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        return { date, time };
    } catch {
        return { date: "—", time: "" };
    }
};

const formatBankDetails = (bankDetails) => {
    if (!bankDetails) return { primary: "—", full: "No bank details provided" };
    const rawBankName = bankDetails.bankName || bankDetails.accountHolderName || "";
    const rawAccount = bankDetails.accountNumber ? String(bankDetails.accountNumber) : "";
    
    let cleanBank = rawBankName.trim();
    if (cleanBank.toLowerCase() === "sbi" || cleanBank.toLowerCase().startsWith("state bank")) {
        cleanBank = "SBI";
    } else if (cleanBank.toLowerCase().startsWith("yes bank")) {
        cleanBank = "Yes Bank";
    } else if (cleanBank.toLowerCase().startsWith("hdfc")) {
        cleanBank = "HDFC Bank";
    } else if (cleanBank.toLowerCase().startsWith("icici")) {
        cleanBank = "ICICI Bank";
    } else if (cleanBank.length > 25) {
        cleanBank = cleanBank.substring(0, 25) + "…";
    }

    const last4 = rawAccount.length >= 4 ? `•••• ${rawAccount.slice(-4)}` : (rawAccount ? `•••• ${rawAccount}` : "•••• N/A");
    const primary = cleanBank ? `${cleanBank}  ${last4}` : `Bank  ${last4}`;
    const full = `${rawBankName || "Bank"} — Account: ${rawAccount || "N/A"}${bankDetails.ifscCode ? ` | IFSC: ${bankDetails.ifscCode}` : ""}`;
    return { primary, full };
};

const WITHDRAWAL_STATUS_CONFIG = {
    approved: { label: "Approved", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
    completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
    rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
};

const formatTransactionType = (type) => {
    switch (type) {
        case "earning":
            return {
                label: "Earning",
                icon: "↓",
                className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            };
        case "commission_deduction":
        case "commission":
            return {
                label: "Commission",
                icon: "↑",
                className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            };
        case "refund":
            return {
                label: "Refund",
                icon: "↩",
                className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
            };
        case "withdrawal":
        case "payout":
            return {
                label: "Payout",
                icon: "→",
                className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
            };
        case "referral_bonus":
            return {
                label: "Referral",
                icon: "★",
                className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
            };
        default:
            return {
                label: (type || "Transaction").replace(/_/g, " "),
                icon: "•",
                className: "bg-muted text-muted-foreground border-border/60"
            };
    }
};

const formatTransactionDetails = (desc, type) => {
    if (!desc) return { primary: "—", secondary: "" };
    
    // Check for "Platform commission (X%) for: Title"
    const commMatch = desc.match(/Platform commission \(([^)]+)\) for:\s*(.*)/i);
    if (commMatch) {
        return {
            primary: commMatch[2].trim() || desc,
            secondary: `${commMatch[1]} platform commission`
        };
    }

    // Check for "Full payment: Title (after X% commission)"
    const fullPayMatch = desc.match(/Full payment:\s*([^()]+)(?:\(([^)]+)\))?/i);
    if (fullPayMatch) {
        return {
            primary: fullPayMatch[1].trim() || desc,
            secondary: fullPayMatch[2] ? `Booking earning • ${fullPayMatch[2]}` : "Booking earning"
        };
    }

    // Check for "Event booking payment: Title (after X% commission)"
    const eventPayMatch = desc.match(/Event booking payment:\s*([^()]+)(?:\(([^)]+)\))?/i);
    if (eventPayMatch) {
        return {
            primary: eventPayMatch[1].trim() || desc,
            secondary: eventPayMatch[2] ? `Event booking • ${eventPayMatch[2]}` : "Event booking"
        };
    }

    // Check for "Admin refund deduction for booking: Title"
    const refundMatch = desc.match(/Admin refund deduction for booking:\s*(.*)/i);
    if (refundMatch) {
        return {
            primary: refundMatch[1].trim() || desc,
            secondary: "Admin refund"
        };
    }

    // Fallback: If description has a colon or separator
    if (desc.includes(":")) {
        const parts = desc.split(":");
        return {
            primary: parts.slice(1).join(":").trim() || desc,
            secondary: parts[0].trim()
        };
    }

    return {
        primary: desc,
        secondary: type === "earning" ? "Earnings credit" : ""
    };
};

const EarningsDashboard = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [withdrawalPage, setWithdrawalPage] = useState(1);
    const [transactionPage, setTransactionPage] = useState(1);

    const WITHDRAWAL_PAGE_SIZE = 10;
    const totalWithdrawalPages = Math.ceil(withdrawals.length / WITHDRAWAL_PAGE_SIZE) || 1;
    const paginatedWithdrawals = withdrawals.slice((withdrawalPage - 1) * WITHDRAWAL_PAGE_SIZE, withdrawalPage * WITHDRAWAL_PAGE_SIZE);
    const totalWithdrawalAmount = withdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);

    const TRANSACTION_PAGE_SIZE = 10;
    const totalTransactionPages = Math.ceil(transactions.length / TRANSACTION_PAGE_SIZE) || 1;
    const paginatedTransactions = transactions.slice((transactionPage - 1) * TRANSACTION_PAGE_SIZE, transactionPage * TRANSACTION_PAGE_SIZE);

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
        }, 2000);

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
                        <Loader2 className="h-5 w-5 animate-spin text-primary"/> Loading earnings data…
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
                        <Button onClick={() => navigate("/merchant-dashboard/withdraw")} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-3.5 cursor-pointer">
                            <Wallet className="mr-1.5 h-4 w-4"/> Request Withdrawal
                        </Button>
                    }
                />

                {/* Stats Grid */}
                <div ref={statsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <StatCard title="Total Earnings" value={formatCurrency(earnings?.totalEarnings || 0)} icon={<TrendingUp className="h-5 w-5"/>} index={0} trend="12.5%"/>
                    <StatCard title="Commission Deducted" value={formatCurrency(earnings?.totalCommission || 0)} icon={<ArrowDownRight className="h-5 w-5"/>} index={1}/>
                    <StatCard title="Total Withdrawn" value={formatCurrency(earnings?.totalWithdrawn || 0)} icon={<Wallet className="h-5 w-5"/>} index={2}/>
                    <StatCard title="Total Refunded" value={formatCurrency(earnings?.totalRefunded || 0)} icon={<RefreshCcw className="h-5 w-5"/>} index={3}/>
                    <StatCard title="Available Balance" value={formatCurrency(earnings?.availableBalance || 0)} icon={<IndianRupee className="h-5 w-5"/>} index={4}/>
                </div>

                {/* Quick Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 mb-6">
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Paid Bookings</p>
                        <p className="text-lg sm:text-2xl font-bold text-primary">{earnings?.completedBookings || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Withdrawals</p>
                        <p className="text-lg sm:text-2xl font-bold text-amber-600">{earnings?.pendingWithdrawals || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-5 col-span-2 md:col-span-1">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Amount</p>
                        <p className="text-lg sm:text-2xl font-bold text-amber-600">{formatCurrency(earnings?.pendingWithdrawalAmount || 0)}</p>
                    </div>
                </motion.div>

                {/* Withdrawal History Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.4 }} className="mb-6">
                    <div className="rounded-[12px] border border-border/70 bg-card overflow-hidden shadow-2xs">
                        {/* Compact Section Header */}
                        <div className="px-4 sm:px-5 py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-card">
                            <div>
                                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground tracking-tight">
                                    Withdrawal Requests
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Track your submitted withdrawal requests and payout progress.
                                </p>
                            </div>
                            {withdrawals.length > 0 && (
                                <div className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                    <span className="text-foreground font-semibold">{withdrawals.length}</span> requests{" "}
                                    <span className="mx-1 text-border">•</span>{" "}
                                    <span className="text-foreground font-semibold">{formatCurrency(totalWithdrawalAmount)}</span> total
                                </div>
                            )}
                        </div>

                        {withdrawals.length === 0 ? (
                            <TableEmptyState title="No withdrawal requests yet" description="Your requested withdrawals will appear here." colSpan={4} />
                        ) : (
                            <>
                                {/* Desktop & Tablet Table */}
                                <div className="hidden md:block w-full overflow-hidden">
                                    <DataTable minWidth="100%">
                                        <TableHeader className="bg-muted/20 border-b border-border/50">
                                            <TableHeaderCell className="w-[20%] py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Amount
                                            </TableHeaderCell>
                                            <TableHeaderCell className="w-[40%] py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Bank / Account
                                            </TableHeaderCell>
                                            <TableHeaderCell className="w-[20%] py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                Requested
                                            </TableHeaderCell>
                                            <TableHeaderCell align="right" className="w-[20%] py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                Status
                                            </TableHeaderCell>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedWithdrawals.map((w) => {
                                                const bankInfo = formatBankDetails(w.bankDetails);
                                                const statusStyle = WITHDRAWAL_STATUS_CONFIG[w.status] || {
                                                    label: (w.status || "Unknown").replace(/_/g, " "),
                                                    className: "bg-muted text-muted-foreground border-border/60"
                                                };

                                                return (
                                                    <TableRow key={w._id} className="hover:bg-muted/25 transition-colors border-b border-border/40 last:border-b-0">
                                                        {/* Amount */}
                                                        <TableCell className="w-[20%] py-2.5 px-4 align-middle font-semibold text-[13.5px] text-foreground tracking-tight whitespace-nowrap">
                                                            {formatCurrency(w.amount)}
                                                        </TableCell>

                                                        {/* Bank / Account */}
                                                        <TableCell className="w-[40%] py-2.5 px-4 align-middle text-xs text-foreground/90">
                                                            <span className="truncate block font-medium" title={bankInfo.full}>
                                                                {bankInfo.primary}
                                                            </span>
                                                        </TableCell>

                                                        {/* Requested Date */}
                                                        <TableCell className="w-[20%] py-2.5 px-4 align-middle text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatWithdrawalDate(w.requestedAt || w.createdAt)}
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell align="right" className="w-[20%] py-2.5 px-4 align-middle whitespace-nowrap">
                                                            <div className="flex items-center justify-end">
                                                                <span className={`inline-flex items-center justify-center h-[24px] min-h-[24px] px-2.5 rounded-full text-[11.5px] font-medium border capitalize leading-none ${statusStyle.className}`}>
                                                                    {statusStyle.label || w.status}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </DataTable>
                                </div>

                                {/* Mobile (<768px): Compact Transaction Cards */}
                                <div className="md:hidden divide-y divide-border/40">
                                    {paginatedWithdrawals.map((w) => {
                                        const bankInfo = formatBankDetails(w.bankDetails);
                                        const statusStyle = WITHDRAWAL_STATUS_CONFIG[w.status] || {
                                            label: (w.status || "Unknown").replace(/_/g, " "),
                                            className: "bg-muted text-muted-foreground border-border/60"
                                        };

                                        return (
                                            <div key={w._id} className="p-3.5 space-y-1.5 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-sm text-foreground">
                                                        {formatCurrency(w.amount)}
                                                    </span>
                                                    <span className={`inline-flex items-center justify-center h-[22px] min-h-[22px] px-2 rounded-full text-[11px] font-medium border capitalize leading-none ${statusStyle.className}`}>
                                                        {statusStyle.label || w.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-0.5">
                                                    <span className="truncate" title={bankInfo.full}>
                                                        Bank: <span className="font-medium text-foreground/80">{bankInfo.primary}</span>
                                                    </span>
                                                    <span className="shrink-0 text-[11px]">
                                                        {formatWithdrawalDate(w.requestedAt || w.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Compact Pagination Bar */}
                                {withdrawals.length > WITHDRAWAL_PAGE_SIZE && (
                                    <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between bg-card text-xs text-muted-foreground">
                                        <div>
                                            Showing <span className="font-medium text-foreground">{(withdrawalPage - 1) * WITHDRAWAL_PAGE_SIZE + 1}</span>–
                                            <span className="font-medium text-foreground">{Math.min(withdrawalPage * WITHDRAWAL_PAGE_SIZE, withdrawals.length)}</span> of{" "}
                                            <span className="font-medium text-foreground">{withdrawals.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={withdrawalPage === 1}
                                                onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                                                className="h-7 w-7 p-0 rounded-md text-xs cursor-pointer"
                                                title="Previous page"
                                            >
                                                ‹
                                            </Button>
                                            {Array.from({ length: totalWithdrawalPages }, (_, i) => i + 1).map((p) => (
                                                <Button
                                                    key={p}
                                                    variant={p === withdrawalPage ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setWithdrawalPage(p)}
                                                    className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs cursor-pointer ${
                                                        p === withdrawalPage ? "bg-primary text-primary-foreground font-semibold" : ""
                                                    }`}
                                                >
                                                    {p}
                                                </Button>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={withdrawalPage === totalWithdrawalPages}
                                                onClick={() => setWithdrawalPage((p) => Math.min(totalWithdrawalPages, p + 1))}
                                                className="h-7 w-7 p-0 rounded-md text-xs cursor-pointer"
                                                title="Next page"
                                            >
                                                ›
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Transaction History Section (Redesigned Compact Fintech Ledger) */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.5 }}>
                    {/* Compact Financial Summary Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div className="rounded-[12px] border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Total Earnings
                            </p>
                            <p className="text-base sm:text-xl font-bold text-foreground">
                                {formatCurrency(earnings?.totalEarnings || 0)}
                            </p>
                        </div>
                        <div className="rounded-[12px] border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Commission
                            </p>
                            <p className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(earnings?.totalCommission || 0)}
                            </p>
                        </div>
                        <div className="rounded-[12px] border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Refunds
                            </p>
                            <p className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(earnings?.totalRefunded || 0)}
                            </p>
                        </div>
                        <div className="rounded-[12px] border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Net Earned
                            </p>
                            <p className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(Math.max(0, (earnings?.totalEarnings || 0) - (earnings?.totalCommission || 0) - (earnings?.totalRefunded || 0)))}
                            </p>
                        </div>
                    </div>

                    {/* Ledger Card */}
                    <div className="rounded-[12px] border border-border/70 bg-card overflow-hidden shadow-2xs">
                        {/* Compact Header */}
                        <div className="px-4 sm:px-5 py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 bg-card">
                            <div>
                                <h2 className="font-display text-base sm:text-lg font-semibold flex items-center gap-2 text-foreground tracking-tight">
                                    <History className="h-4 w-4 text-primary"/> Transaction History
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Track earnings, fees, refunds and payouts.
                                </p>
                            </div>
                            {transactions.length > 0 && (
                                <div className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                    <span className="text-foreground font-semibold">{transactions.length}</span> transactions
                                </div>
                            )}
                        </div>

                        {transactions.length === 0 ? (
                            <TableEmptyState title="No transactions yet" description="Recent financial transactions will be recorded here." colSpan={4} />
                        ) : (
                            <>
                                {/* Desktop & Tablet Table */}
                                <div className="hidden md:block w-full overflow-hidden">
                                    <table className="w-full table-fixed text-xs sm:text-sm border-collapse">
                                        <colgroup>
                                            <col className="w-[18%]" />
                                            <col className="w-[42%]" />
                                            <col className="w-[20%]" />
                                            <col className="w-[20%]" />
                                        </colgroup>
                                        <thead className="bg-muted/20 border-b border-border/50">
                                            <tr>
                                                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left whitespace-nowrap">
                                                    Type
                                                </th>
                                                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left">
                                                    Details
                                                </th>
                                                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left whitespace-nowrap">
                                                    Date
                                                </th>
                                                <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {paginatedTransactions.map((t) => {
                                                const isPositive = Number(t.amount) >= 0 && t.type !== "commission_deduction";
                                                const displayAmount = Math.abs(t.amount);
                                                const typeInfo = formatTransactionType(t.type);
                                                const detailsInfo = formatTransactionDetails(t.description, t.type);
                                                const dateInfo = formatTransactionDate(t.createdAt);

                                                return (
                                                    <tr key={t._id} className="hover:bg-muted/25 transition-colors">
                                                        {/* Type */}
                                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1 h-[24px] min-h-[24px] px-2.5 rounded-full text-[11.5px] font-medium border leading-none ${typeInfo.className}`}>
                                                                <span>{typeInfo.icon}</span>
                                                                <span>{typeInfo.label}</span>
                                                            </span>
                                                        </td>

                                                        {/* Details */}
                                                        <td className="py-2.5 px-4 align-middle">
                                                            <div className="min-w-0 pr-2">
                                                                <span className="text-[13px] font-medium text-foreground block truncate" title={detailsInfo.primary}>
                                                                    {detailsInfo.primary}
                                                                </span>
                                                                {detailsInfo.secondary && (
                                                                    <span className="text-[11px] text-muted-foreground block truncate mt-0.5" title={detailsInfo.secondary}>
                                                                        {detailsInfo.secondary}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Date */}
                                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap text-left">
                                                            <div className="text-[12.5px] font-medium text-foreground">{dateInfo.date}</div>
                                                            {dateInfo.time && (
                                                                <div className="text-[11px] text-muted-foreground mt-0.5">{dateInfo.time}</div>
                                                            )}
                                                        </td>

                                                        {/* Amount */}
                                                        <td className={`py-2.5 px-4 align-middle whitespace-nowrap text-right font-semibold text-[13.5px] ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                            {isPositive ? "+" : "−"}{formatCurrency(displayAmount)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View (<768px): Compact Financial Cards */}
                                <div className="md:hidden divide-y divide-border/40">
                                    {paginatedTransactions.map((t) => {
                                        const isPositive = Number(t.amount) >= 0 && t.type !== "commission_deduction";
                                        const displayAmount = Math.abs(t.amount);
                                        const typeInfo = formatTransactionType(t.type);
                                        const detailsInfo = formatTransactionDetails(t.description, t.type);
                                        const dateInfo = formatTransactionDate(t.createdAt);

                                        return (
                                            <div key={t._id} className="p-3.5 space-y-1.5 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`inline-flex items-center gap-1 h-[22px] min-h-[22px] px-2 rounded-full text-[11px] font-medium border leading-none ${typeInfo.className}`}>
                                                        <span>{typeInfo.icon}</span>
                                                        <span>{typeInfo.label}</span>
                                                    </span>
                                                    <span className={`font-semibold text-sm ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                        {isPositive ? "+" : "−"}{formatCurrency(displayAmount)}
                                                    </span>
                                                </div>

                                                <div className="text-xs pt-0.5">
                                                    <span className="font-medium text-foreground block truncate" title={detailsInfo.primary}>
                                                        {detailsInfo.primary}
                                                    </span>
                                                    {detailsInfo.secondary && (
                                                        <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                                                            {detailsInfo.secondary}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                                    <span>{dateInfo.date}</span>
                                                    {dateInfo.time && <span>{dateInfo.time}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Compact Pagination Bar */}
                                {transactions.length > TRANSACTION_PAGE_SIZE && (
                                    <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between bg-card text-xs text-muted-foreground">
                                        <div>
                                            Showing <span className="font-medium text-foreground">{(transactionPage - 1) * TRANSACTION_PAGE_SIZE + 1}</span>–
                                            <span className="font-medium text-foreground">{Math.min(transactionPage * TRANSACTION_PAGE_SIZE, transactions.length)}</span> of{" "}
                                            <span className="font-medium text-foreground">{transactions.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={transactionPage === 1}
                                                onClick={() => setTransactionPage((p) => Math.max(1, p - 1))}
                                                className="h-7 w-7 p-0 rounded-md text-xs cursor-pointer"
                                                title="Previous page"
                                            >
                                                ‹
                                            </Button>
                                            {Array.from({ length: totalTransactionPages }, (_, i) => i + 1).map((p) => (
                                                <Button
                                                    key={p}
                                                    variant={p === transactionPage ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setTransactionPage(p)}
                                                    className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs cursor-pointer ${
                                                        p === transactionPage ? "bg-primary text-primary-foreground font-semibold" : ""
                                                    }`}
                                                >
                                                    {p}
                                                </Button>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={transactionPage === totalTransactionPages}
                                                onClick={() => setTransactionPage((p) => Math.min(totalTransactionPages, p + 1))}
                                                className="h-7 w-7 p-0 rounded-md text-xs cursor-pointer"
                                                title="Next page"
                                            >
                                                ›
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </MerchantLayout>
    );
};

export default EarningsDashboard;
