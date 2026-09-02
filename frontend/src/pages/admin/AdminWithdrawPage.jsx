import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowLeft,
  ShieldCheck,
  Building2,
  User,
  CreditCard,
  Hash,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetAdminEarningsSummary, apiWithdrawAdminEarnings } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AdminWithdrawPage = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [adminSummary, setAdminSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountHolder: user?.name || "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  useEffect(() => {
    if (!token) return;
    loadSummary();
  }, [token]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await apiGetAdminEarningsSummary(token);
      setAdminSummary(data);
    } catch {
      toast.error("Failed to load admin earnings summary");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amountVal = Number(amount);

    if (String(amount).length > 10) {
      toast.error("Withdrawal amount cannot exceed 10 digits");
      return;
    }
    if (Number.isNaN(amountVal) || amountVal < 1) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }
    if (amountVal > (adminSummary?.availableBalance || 0)) {
      toast.error("Withdrawal amount cannot exceed available admin earnings");
      return;
    }

    const holder = bankDetails.accountHolder.trim();
    const accNum = bankDetails.accountNumber.trim();
    const ifsc = bankDetails.ifscCode.trim().toUpperCase();
    const bank = bankDetails.bankName.trim();

    if (!holder || holder.length < 2 || holder.length > 50 || !/^[a-zA-Z\s.]+$/.test(holder)) {
      toast.error("Enter a valid account holder name");
      return;
    }
    if (!/^\d{9,18}$/.test(accNum)) {
      toast.error("Account number must be 9 to 18 digits");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      toast.error("Enter a valid IFSC code (e.g. SBIN0001234)");
      return;
    }
    if (!bank || bank.length < 2 || bank.length > 50 || !/^[a-zA-Z\s&().-]+$/.test(bank)) {
      toast.error("Enter a valid bank name");
      return;
    }

    setSubmitting(true);
    try {
      await apiWithdrawAdminEarnings(
        amountVal,
        {
          accountHolder: holder,
          accountNumber: accNum,
          ifscCode: ifsc,
          bankName: bank,
        },
        token
      );
      toast.success("Admin earnings withdrawn successfully");
      navigate("/admin-dashboard/payouts");
    } catch (error) {
      toast.error(error.message || "Failed to withdraw admin earnings");
    } finally {
      setSubmitting(false);
    }
  };

  const availableBalance = adminSummary?.availableBalance || 0;

  return (
    <AdminLayout>
      <div className="w-full max-w-[1280px] mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Withdraw Admin Earnings"
          subtitle="Only admin platform earnings can be withdrawn. Merchant payout funds stay protected."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "Payouts", to: "/admin-dashboard/payouts" },
            { label: "Withdraw Admin Earnings" },
          ]}
          actions={
            <Button
              variant="outline"
              onClick={() => navigate("/admin-dashboard/payouts")}
              className="h-9 gap-2 text-xs font-semibold rounded-lg border-border/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Payouts
            </Button>
          }
        />

        {/* Main Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left Form Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/70">
                <Wallet className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-foreground">Withdrawal Form</h2>
                  <p className="text-xs text-muted-foreground">
                    Enter the amount and bank account details to receive your funds.
                  </p>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-5">
                {/* Withdrawal Amount Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount" className="text-xs font-semibold text-foreground">
                      Withdrawal Amount *
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Available: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(availableBalance)}</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 10) setAmount(val);
                      }}
                      className="pl-9 pr-20 h-10 text-sm font-semibold font-mono"
                      min="1"
                      max={availableBalance}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance > 0 ? String(availableBalance) : "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 rounded-md transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  {Number(amount) > availableBalance && (
                    <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Amount exceeds available admin earnings
                    </p>
                  )}
                </div>

                {/* Bank Account Details */}
                <div className="space-y-4 pt-2 border-t border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Bank Account Details
                  </h3>

                  {/* Account Holder Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="accountHolder" className="text-xs font-semibold">
                      Account Holder Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="accountHolder"
                        placeholder="Name as in bank account"
                        maxLength={50}
                        value={bankDetails.accountHolder}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, accountHolder: e.target.value })
                        }
                        className="pl-9 h-9 text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Account Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber" className="text-xs font-semibold">
                      Account Number *
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="accountNumber"
                        placeholder="9 to 18 digit account number"
                        maxLength={18}
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails({
                            ...bankDetails,
                            accountNumber: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className="pl-9 h-9 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* IFSC & Bank Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ifscCode" className="text-xs font-semibold">
                        IFSC Code *
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="ifscCode"
                          placeholder="e.g. SBIN0001234"
                          maxLength={11}
                          value={bankDetails.ifscCode}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                            })
                          }
                          className="pl-9 h-9 text-xs font-mono uppercase"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="bankName" className="text-xs font-semibold">
                        Bank Name *
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="bankName"
                          placeholder="e.g. State Bank of India"
                          maxLength={50}
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails({ ...bankDetails, bankName: e.target.value })
                          }
                          className="pl-9 h-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin-dashboard/payouts")}
                    disabled={submitting}
                    className="h-9 px-4 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || availableBalance <= 0}
                    className="h-9 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2"
                  >
                    {submitting ? (
                      "Processing..."
                    ) : (
                      <>
                        <Wallet className="h-3.5 w-3.5" />
                        Withdraw Funds
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Summary Sidebar (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Available Balance Box */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Available Admin Balance
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </div>

              <p className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
                {loading ? "…" : formatCurrency(availableBalance)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Platform commissions collected and ready for payout transfer.
              </p>
            </div>

            {/* Account Financial Overview */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Financial Summary
              </h3>

              <div className="space-y-3 divide-y divide-border/60 text-xs">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Total Admin Earnings</span>
                  <span className="font-semibold text-foreground font-mono">
                    {loading ? "…" : formatCurrency(adminSummary?.totalAdminEarnings || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <span className="text-muted-foreground">Lifetime Withdrawn</span>
                  <span className="font-semibold text-foreground font-mono">
                    {loading ? "…" : formatCurrency(adminSummary?.totalWithdrawn || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <span className="text-muted-foreground">Pending Approvals</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                    {loading ? "…" : formatCurrency(adminSummary?.pendingWithdrawals || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-700 dark:text-blue-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                Fund Protection Policy
              </div>
              <p className="text-[11px] text-blue-600/90 dark:text-blue-300/90 leading-relaxed">
                Merchant payout funds are strictly separated from platform earnings. Only verified admin commissions are eligible for withdrawal to your bank account.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminWithdrawPage;
