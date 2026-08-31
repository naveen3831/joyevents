import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, QrCode, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiAddWalletFunds, apiVerifyToken } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerAddFunds() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();

  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("card");
  const [depositing, setDepositing] = useState(false);

  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // UPI details
  const [depositUpi, setDepositUpi] = useState("");

  const currentBalance = user?.walletBalance || 0;
  const parsedAmount = Number(depositAmount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const newBalance = currentBalance + validAmount;

  const refreshUserSession = async () => {
    try {
      const verifyRes = await apiVerifyToken(token);
      if (verifyRes.user) {
        updateUser(verifyRes.user);
      }
    } catch (e) {}
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (validAmount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    if (validAmount < 10) {
      toast.error("Minimum deposit amount is ₹10");
      return;
    }
    if (depositMethod === "card") {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardholderName) {
        toast.error("Please fill all card details");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length !== 16) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }
    } else {
      if (!depositUpi.includes("@")) {
        toast.error("Please enter a valid UPI ID");
        return;
      }
    }

    setDepositing(true);
    try {
      const details =
        depositMethod === "card"
          ? { cardNumber, cardholderName, cvv: cardCvv }
          : { upiId: depositUpi.trim() };
      await apiAddWalletFunds(validAmount, depositMethod, details, token);
      toast.success(`Successfully deposited ${formatCurrency(validAmount)} to wallet!`);
      await refreshUserSession();
      navigate("/customer-dashboard/wallet");
    } catch (err) {
      toast.error(err?.message || "Failed to deposit funds");
    } finally {
      setDepositing(false);
    }
  };

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
              Add Funds to <span className="text-gradient">Wallet</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-normal">
              Add balance instantly using credit card, debit card, or UPI.
            </p>
          </div>
        </div>

        {/* ── 2-Column Checkout Layout ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">

          {/* ════ LEFT: Payment Details Panel ════ */}
          <form
            onSubmit={handleDepositSubmit}
            className="min-w-0 w-full rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="font-semibold text-base text-foreground">Payment Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Choose an amount and payment method.</p>
            </div>

            {/* ── Amount Section ──────────────────────── */}
            <div className="space-y-3">
              <Label htmlFor="depAmount" className="text-xs sm:text-sm font-semibold text-foreground">
                Amount to Add <span className="text-destructive">*</span>
              </Label>
              
              {/* Currency-integrated Input */}
              <div className="relative flex items-center">
                <span className="absolute left-4 font-display font-bold text-lg sm:text-xl text-primary pointer-events-none">
                  ₹
                </span>
                <Input
                  id="depAmount"
                  type="number"
                  min="10"
                  step="any"
                  placeholder="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  className="h-[52px] pl-9 pr-4 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-lg sm:text-xl font-bold font-display"
                />
              </div>

              {/* Quick Add Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Quick add
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[100, 500, 1000, 2000].map((amt) => {
                    const isSelected = parsedAmount === amt;
                    return (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setDepositAmount(String(amt))}
                        className={`h-9 px-3.5 text-xs rounded-xl border font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-border bg-secondary/40 hover:bg-secondary text-foreground hover:border-border/80"
                        }`}
                      >
                        +₹{amt.toLocaleString("en-IN")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Payment Method Selection ────────────── */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Label className="text-xs sm:text-sm font-semibold text-foreground block">
                Payment Method <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => setDepositMethod("card")}
                  className={`h-[74px] p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    depositMethod === "card"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      depositMethod === "card" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm block text-foreground">Card</span>
                    <span className="text-[11px] text-muted-foreground truncate block">Visa, Mastercard, RuPay</span>
                  </div>
                </button>

                {/* UPI Option */}
                <button
                  type="button"
                  onClick={() => setDepositMethod("upi")}
                  className={`h-[74px] p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    depositMethod === "upi"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      depositMethod === "upi" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm block text-foreground">UPI</span>
                    <span className="text-[11px] text-muted-foreground truncate block">GPay, PhonePe, Paytm</span>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Method Specific Form ────────────────── */}
            {depositMethod === "card" ? (
              <div className="space-y-4 pt-4 border-t border-border/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Card Details</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-xs font-semibold text-foreground">
                    Card Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 1234 5678"
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                      const match = v.match(/\d{4,16}/g)?.[0] || "";
                      const parts = [];
                      for (let i = 0; i < match.length; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      setCardNumber(parts.length ? parts.join(" ") : v);
                    }}
                    maxLength={19}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm font-mono tracking-wide"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cardExpiry" className="text-xs font-semibold text-foreground">
                      Expiry Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cardExpiry"
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                        setCardExpiry(v.length >= 2 ? v.substring(0, 2) + "/" + v.substring(2, 4) : v);
                      }}
                      maxLength={5}
                      required
                      className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvv" className="text-xs font-semibold text-foreground">
                      CVV <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cardCvv"
                      type="password"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={3}
                      required
                      className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cardholder" className="text-xs font-semibold text-foreground">
                    Name on Card <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cardholder"
                    type="text"
                    placeholder="e.g., Santhosh Kumar"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="depositUpi" className="text-xs font-semibold text-foreground">
                    UPI ID (VPA) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="depositUpi"
                    type="text"
                    placeholder="e.g., user@okhdfcbank or 9876543210@paytm"
                    value={depositUpi}
                    onChange={(e) => setDepositUpi(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A payment request will be sent to your UPI app for confirmation.
                </p>
              </div>
            )}

            {/* ── Primary CTA Button ──────────────────── */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={depositing || validAmount < 10}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm sm:text-base shadow-glow hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {depositing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Payment...
                  </>
                ) : validAmount > 0 ? (
                  `Add ${formatCurrency(validAmount)} to Wallet`
                ) : (
                  "Add Funds to Wallet"
                )}
              </Button>
            </div>
          </form>

          {/* ════ RIGHT: Wallet Summary Panel ════ */}
          <div className="min-w-0 w-full space-y-4">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-base text-foreground">Wallet Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-medium text-foreground">{formatCurrency(currentBalance)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount to Add</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{formatCurrency(validAmount)}
                  </span>
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-foreground">New Balance</span>
                  <span className="font-display font-extrabold text-xl text-gradient">
                    {formatCurrency(newBalance)}
                  </span>
                </div>
              </div>

              {/* Subtle Security Badge */}
              <div className="pt-3 border-t border-border/60">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Secure payment</span>
                    <span>Your payment details are processed securely.</span>
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
