import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowLeft, 
  DollarSign, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  CreditCard,
  User,
  Hash
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { apiGetEarningsDashboard, apiRequestWithdrawal } from "@/lib/api";

const RequestWithdrawal = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
    bankName: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await apiGetEarningsDashboard(token);
        setEarnings(data);
      } catch (error) {
        toast.error(error.message || "Failed to load balance information");
      } finally {
        setLoading(false);
      }
    };
    loadEarnings();
  }, [token]);

  const availableBalance = earnings?.availableBalance || 0;

  const handleQuickAmount = (percentage) => {
    if (availableBalance <= 0) return;
    const calculated = (availableBalance * percentage).toFixed(2);
    setWithdrawalAmount(calculated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (withdrawalAmount.length > 10) {
      toast.error("Withdrawal amount cannot exceed 10 digits");
      return;
    }
    const amountVal = parseFloat(withdrawalAmount);
    if (isNaN(amountVal) || amountVal < 1) {
      toast.error("Please enter a valid amount (minimum ₹1)");
      return;
    }
    if (amountVal > availableBalance) {
      toast.error("Insufficient balance for withdrawal");
      return;
    }

    // Validation
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

    const ifsc = bankDetails.ifscCode.trim().toUpperCase();
    if (!ifsc) {
      toast.error("IFSC Code is required");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      toast.error("Invalid IFSC Code format (e.g., SBIN0001234)");
      return;
    }

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

    setSubmitting(true);
    try {
      await apiRequestWithdrawal(
        amountVal,
        {
          accountHolder: holder,
          accountNumber: accNum,
          ifscCode: ifsc,
          bankName: bank
        },
        token
      );
      toast.success("Withdrawal request submitted successfully!");
      navigate("/merchant-dashboard/earnings");
    } catch (error) {
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <section className="py-16">
          <div className="flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading withdrawal options…
          </div>
        </section>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 font-sans py-2 sm:py-4">
        <PageHeader
          title="Request Withdrawal"
          subtitle="Submit a request to transfer your available balance directly to your bank account."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Earnings", to: "/merchant-dashboard/earnings" },
            { label: "Request Withdrawal" },
          ]}
          actions={
            <Button
              variant="outline"
              onClick={() => navigate("/merchant-dashboard/earnings")}
              className="rounded-lg text-xs font-semibold h-9 px-3.5"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Earnings
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Overview Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/80 shadow-xs bg-gradient-to-r from-primary/5 via-card to-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Balance</p>
                      <h2 className="text-3xl font-extrabold text-foreground mt-1">
                        {formatCurrency(availableBalance)}
                      </h2>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Wallet className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Withdrawal Details Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-6 pb-4 border-b border-border/60">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> Withdrawal Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Specify the amount you wish to withdraw and confirm your bank details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Amount Field */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="amount" className="text-xs font-semibold">
                          Withdrawal Amount (₹) <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Max: {formatCurrency(availableBalance)}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">₹</span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={withdrawalAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.length <= 10) setWithdrawalAmount(val);
                          }}
                          className="pl-8 h-11 text-sm font-semibold"
                          min="1"
                          max={availableBalance}
                          step="any"
                          required
                        />
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground mr-1">Quick fill:</span>
                        {[
                          { label: "25%", val: 0.25 },
                          { label: "50%", val: 0.5 },
                          { label: "75%", val: 0.75 },
                          { label: "Max", val: 1.0 },
                        ].map((btn) => (
                          <Button
                            key={btn.label}
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleQuickAmount(btn.val)}
                            className="h-7 text-xs px-2.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border/80 pt-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold text-sm">Bank Account Details</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="accountHolder" className="text-xs">
                            Account Holder Name <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="accountHolder"
                              placeholder="Full name on bank account"
                              maxLength={50}
                              value={bankDetails.accountHolder}
                              onChange={(e) =>
                                setBankDetails({ ...bankDetails, accountHolder: e.target.value })
                              }
                              className="pl-9 h-10 text-xs"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="accountNumber" className="text-xs">
                            Account Number <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="accountNumber"
                              placeholder="9 to 18 digit account number"
                              maxLength={18}
                              value={bankDetails.accountNumber}
                              onChange={(e) =>
                                setBankDetails({
                                  ...bankDetails,
                                  accountNumber: e.target.value.replace(/\D/g, "")
                                })
                              }
                              className="pl-9 h-10 text-xs"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="ifscCode" className="text-xs">
                            IFSC Code <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="ifscCode"
                              placeholder="e.g. SBIN0001234"
                              maxLength={11}
                              value={bankDetails.ifscCode}
                              onChange={(e) =>
                                setBankDetails({
                                  ...bankDetails,
                                  ifscCode: e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]/g, "")
                                })
                              }
                              className="pl-9 h-10 text-xs uppercase"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="bankName" className="text-xs">
                            Bank Name <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="bankName"
                              placeholder="e.g. State Bank of India"
                              maxLength={50}
                              value={bankDetails.bankName}
                              onChange={(e) =>
                                setBankDetails({ ...bankDetails, bankName: e.target.value })
                              }
                              className="pl-9 h-10 text-xs"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/merchant-dashboard/earnings")}
                        className="h-10 text-xs font-semibold px-5"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || availableBalance < 1}
                        className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-10 text-xs font-semibold px-6 shadow-md"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Request...
                          </>
                        ) : (
                          "Submit Withdrawal Request"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Side Info & Processing Details */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Payout Safety & Timelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Processing Time</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Withdrawal requests are processed within 24 to 48 business hours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Direct Bank Deposit</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Funds are transferred via NEFT/RTGS/IMPS directly to your specified account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Verification</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Ensure account details match your registered business name to prevent delays.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default RequestWithdrawal;
