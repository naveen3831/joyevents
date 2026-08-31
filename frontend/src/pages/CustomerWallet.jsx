import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Wallet, ArrowUpRight, ArrowDownLeft, Landmark, Plus, Loader2, History } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { apiGetTransactions } from "@/lib/api";
import { useGsapStagger } from "@/lib/gsapAnimations";

const CustomerWallet = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const txRef = useGsapStagger([transactions]);

    const loadData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const txRes = await apiGetTransactions(token);
            setTransactions(txRes.transactions || []);
        } catch (e) {
            toast.error(e?.message || "Failed to load wallet transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [token]);

    const refundInflow = transactions
        .filter(t => t.type === "refund" || t.type === "referral_bonus")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalOutflow = transactions
        .filter(t => t.type === "withdrawal")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const formatTxDate = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: dateStr, time: "" };
        const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
        return { date, time };
    };

    return (
      <CustomerLayout>
        <div className="w-full pt-1 sm:pt-2 pb-8 space-y-6">
          
          {/* ── Page Header ─────────────────────────────── */}
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Wallet</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your balance, add funds, or withdraw to your bank account.
            </p>
          </div>

          {/* ── Top Summary Grid (60% / 40%) ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6 items-stretch">
            
            {/* Available Balance Card (60%) */}
            <Card className="lg:col-span-3 rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[190px]">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Available Balance</span>
                  <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Wallet className="h-4 w-4"/>
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-gradient">
                  {formatCurrency(user?.walletBalance || 0)}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Available wallet balance</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <Button
                  onClick={() => navigate("/customer-dashboard/wallet/add-funds")}
                  className="h-11 px-5 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4"/> Add Funds
                </Button>
                <Button
                  onClick={() => navigate("/customer-dashboard/wallet/withdraw")}
                  variant="outline"
                  disabled={!user?.walletBalance || user.walletBalance <= 0}
                  className="h-11 px-5 rounded-xl border-border text-foreground hover:bg-secondary font-semibold transition-all flex items-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  <Landmark className="h-4 w-4 text-muted-foreground"/> Withdraw
                </Button>
              </div>
            </Card>

            {/* Wallet Activity Card (40%) */}
            <Card className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[190px]">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-primary"/>
                <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Wallet Activity</span>
              </div>

              <div className="space-y-3 divide-y divide-border/60">
                <div className="flex justify-between items-center text-xs sm:text-sm pt-0 first:pt-0">
                  <span className="text-muted-foreground">Total Transactions</span>
                  <span className="font-semibold text-foreground">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm pt-2.5">
                  <span className="text-muted-foreground">Refund Inflow</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(refundInflow)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm pt-2.5">
                  <span className="text-muted-foreground">Total Outflow</span>
                  <span className={`font-semibold ${totalOutflow > 0 ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>
                    {totalOutflow > 0 ? `-${formatCurrency(totalOutflow)}` : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Transaction History ─────────────────────── */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold font-display text-foreground">Transaction History</h3>
              {transactions.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
                </span>
              )}
            </div>

            <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary"/> Loading transactions...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground space-y-2">
                    <History className="h-8 w-8 mx-auto opacity-30"/>
                    <p className="text-sm font-medium">No transaction history found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="w-[15%] px-5 py-3.5">Transaction</th>
                          <th className="w-[50%] px-5 py-3.5">Description</th>
                          <th className="w-[22%] px-5 py-3.5">Date & Time</th>
                          <th className="w-[13%] px-5 py-3.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody ref={txRef} className="divide-y divide-border/60 text-sm">
                        {transactions.map((tx) => {
                          const isDeposit = tx.type === "refund" || tx.type === "referral_bonus";
                          const { date, time } = formatTxDate(tx.createdAt);
                          return (
                            <tr key={tx._id} className="hover:bg-secondary/40 transition-colors">
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                  isDeposit
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                }`}>
                                  {isDeposit ? (
                                    <>
                                      <ArrowDownLeft className="h-3 w-3"/> Deposit
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpRight className="h-3 w-3"/> Withdrawal
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-xs sm:text-sm text-foreground leading-snug">{tx.description}</p>
                                {tx.relatedId && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Ref: {tx.relatedId}</p>}
                              </td>
                              <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                                <div className="font-medium text-foreground/80">{date}</div>
                                <div className="text-[11px] text-muted-foreground">{time}</div>
                              </td>
                              <td className={`px-5 py-3.5 text-right font-bold text-xs sm:text-sm whitespace-nowrap ${
                                isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}>
                                {isDeposit ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CustomerLayout>
    );
};

export default CustomerWallet;

