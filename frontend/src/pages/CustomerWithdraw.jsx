import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, QrCode, Building2, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiWithdrawWallet, apiVerifyToken } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerWithdraw() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("upi");
  const [withdrawUpi, setWithdrawUpi] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const availableBalance = user?.walletBalance || 0;
  const parsedAmount = Number(withdrawAmount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const remainingBalance = availableBalance - validAmount;

  const refreshUserSession = async () => {
    try {
      const verifyRes = await apiVerifyToken(token);
      if (verifyRes.user) {
        updateUser(verifyRes.user);
      }
    } catch (e) {}
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }
    if (amountNum > availableBalance) {
      toast.error("Insufficient wallet balance");
      return;
    }
    if (withdrawMethod === "upi" && !withdrawUpi.trim()) {
      toast.error("Please enter a UPI ID");
      return;
    }
    if (withdrawMethod === "bank" && (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim())) {
      toast.error("Please enter complete bank transfer details");
      return;
    }

    setWithdrawing(true);
    try {
      const details =
        withdrawMethod === "upi"
          ? { upiId: withdrawUpi.trim() }
          : { bankName: bankName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim().toUpperCase() };
      await apiWithdrawWallet(amountNum, withdrawMethod, details, token);
      toast.success(`Successfully initiated withdrawal of ${formatCurrency(amountNum)}!`);
      await refreshUserSession();
      navigate("/customer-dashboard/wallet");
    } catch (err) {
      toast.error(err?.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const isSubmitDisabled =
    withdrawing ||
    !withdrawAmount ||
    Number(withdrawAmount) <= 0 ||
    Number(withdrawAmount) > availableBalance ||
    availableBalance <= 0;

  return (
    <CustomerLayout>
      <div className="w-full pt-1 sm:pt-2 pb-8 max-w-5xl space-y-5">
        {/* ── Page Header ─────────────────────────────── */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => navigate("/customer-dashboard/wallet")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Wallet
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Withdraw <span className="text-gradient">Funds</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-normal">
              Transfer wallet funds directly to your verified bank account or UPI ID.
            </p>
          </div>
        </div>

        {/* ── 2-Column Payout Layout ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">

          {/* ════ LEFT: Withdrawal Details Panel ════ */}
          <form
            onSubmit={handleWithdrawSubmit}
            className="min-w-0 w-full rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="font-semibold text-base text-foreground">Withdrawal Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Choose an amount and payout destination.</p>
            </div>

            {/* ── Amount Section ──────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="withAmount" className="text-xs sm:text-sm font-semibold text-foreground">
                  Amount to Withdraw <span className="text-destructive">*</span>
                </Label>
                {availableBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(availableBalance))}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer shrink-0"
                  >
                    Use Max {formatCurrency(availableBalance)}
                  </button>
                )}
              </div>

              {/* Currency-integrated Input */}
              <div className="relative flex items-center">
                <span className="absolute left-4 font-display font-bold text-lg sm:text-xl text-primary pointer-events-none">
                  ₹
                </span>
                <Input
                  id="withAmount"
                  type="number"
                  min="1"
                  max={availableBalance}
                  step="any"
                  placeholder="0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  className="h-[52px] pl-9 pr-4 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-lg sm:text-xl font-bold font-display"
                />
              </div>

              {/* Excess amount warning */}
              {validAmount > availableBalance && validAmount > 0 && (
                <p className="text-[11px] text-destructive font-medium">
                  Amount exceeds available balance of {formatCurrency(availableBalance)}.
                </p>
              )}
            </div>

            {/* ── Payout Method Selection ─────────────── */}
            <div className="space-y-3">
              <Label className="text-xs sm:text-sm font-semibold text-foreground block">
                Payout Method <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* UPI Option */}
                <button
                  type="button"
                  onClick={() => setWithdrawMethod("upi")}
                  className={`h-[74px] p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    withdrawMethod === "upi"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      withdrawMethod === "upi" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm block text-foreground">UPI</span>
                    <span className="text-[11px] text-muted-foreground truncate block">Instant UPI payout</span>
                  </div>
                </button>

                {/* Bank Option */}
                <button
                  type="button"
                  onClick={() => setWithdrawMethod("bank")}
                  className={`h-[74px] p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    withdrawMethod === "bank"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      withdrawMethod === "bank" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm block text-foreground">Bank Account</span>
                    <span className="text-[11px] text-muted-foreground truncate block">NEFT / IMPS</span>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Method-Specific Fields ──────────────── */}
            {withdrawMethod === "upi" ? (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="withdrawUpi" className="text-xs font-semibold text-foreground">
                    UPI ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="withdrawUpi"
                    type="text"
                    placeholder="yourname@upi"
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Funds will be transferred to this UPI ID.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Details</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs font-semibold text-foreground">
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder="e.g., HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs font-semibold text-foreground">
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="e.g., 50100234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm font-mono tracking-wide"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ifscCode" className="text-xs font-semibold text-foreground">
                    IFSC Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ifscCode"
                    type="text"
                    placeholder="e.g., HDFC0000060"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm font-mono uppercase"
                  />
                </div>
              </div>
            )}

            {/* ── Primary CTA Button ──────────────────── */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm sm:text-base shadow-glow hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Payout...
                  </>
                ) : validAmount > 0 ? (
                  `Withdraw ${formatCurrency(validAmount)}`
                ) : (
                  "Withdraw Funds"
                )}
              </Button>
            </div>
          </form>

          {/* ════ RIGHT: Withdrawal Summary Panel ════ */}
          <div className="min-w-0 w-full">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-base text-foreground">Withdrawal Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-semibold text-foreground">{formatCurrency(availableBalance)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Withdrawal Amount</span>
                  <span className={`font-medium ${validAmount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {validAmount > 0 ? `-${formatCurrency(validAmount)}` : formatCurrency(0)}
                  </span>
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-foreground">Remaining Balance</span>
                  <span
                    className={`font-display font-extrabold text-xl ${
                      remainingBalance < 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {formatCurrency(Math.max(0, remainingBalance))}
                  </span>
                </div>
              </div>

              {/* Payout Destination Summary */}
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Payout via</span>
                  <span className="font-semibold text-foreground">
                    {withdrawMethod === "upi" ? "UPI" : "Bank Account"}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Secure payout</span>
                    <span>Bank and UPI transfers are processed securely.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </CustomerLayout>
  );
}
