import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Wallet, ArrowUpRight, ArrowDownLeft, Landmark, Plus, Loader2, History } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiGetTransactions, apiWithdrawWallet, apiAddWalletFunds, apiVerifyToken } from "@/lib/api";
const CustomerWallet = () => {
    const { token, user, updateUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    // Deposit states
    const [depositModal, setDepositModal] = useState(false);
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
    // Withdrawal states
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("upi");
    const [withdrawUpi, setWithdrawUpi] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const loadData = async () => {
        if (!token)
            return;
        setLoading(true);
        try {
            const txRes = await apiGetTransactions(token);
            setTransactions(txRes.transactions || []);
        }
        catch (e) {
            toast.error(e?.message || "Failed to load wallet transactions");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [token]);
    const refreshUserSession = async () => {
        try {
            const verifyRes = await apiVerifyToken(token);
            if (verifyRes.user) {
                updateUser(verifyRes.user);
            }
        }
        catch (e) { }
    };
    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        const amountNum = Number(depositAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid deposit amount");
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
        }
        else {
            if (!depositUpi.includes("@")) {
                toast.error("Please enter a valid UPI ID");
                return;
            }
        }
        setDepositing(true);
        try {
            const details = depositMethod === "card"
                ? { cardNumber, cardholderName, cvv: cardCvv }
                : { upiId: depositUpi };
            await apiAddWalletFunds(amountNum, depositMethod, details, token);
            toast.success(`Successfully deposited ${formatCurrency(amountNum)} to wallet!`);
            setDepositModal(false);
            setDepositAmount("");
            setCardNumber("");
            setCardExpiry("");
            setCardCvv("");
            setCardholderName("");
            setDepositUpi("");
            await refreshUserSession();
            loadData();
        }
        catch (err) {
            toast.error(err?.message || "Failed to deposit funds");
        }
        finally {
            setDepositing(false);
        }
    };
    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const amountNum = Number(withdrawAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (amountNum > (user?.walletBalance || 0)) {
            toast.error("Insufficient balance");
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
            const details = withdrawMethod === "upi" ? { upiId: withdrawUpi } : { bankName, accountNumber, ifscCode };
            await apiWithdrawWallet(amountNum, withdrawMethod, details, token);
            toast.success(`Successfully initiated withdrawal of ${formatCurrency(amountNum)}!`);
            setWithdrawModal(false);
            setWithdrawAmount("");
            setWithdrawUpi("");
            setBankName("");
            setAccountNumber("");
            setIfscCode("");
            await refreshUserSession();
            loadData();
        }
        catch (e) {
            toast.error(e?.message || "Failed to process withdrawal");
        }
        finally {
            setWithdrawing(false);
        }
    };
    return (<CustomerLayout>
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight">Wallet</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your balance, add funds, or withdraw to your bank account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Balance Card */}
            <Card className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-black/40 to-card border-primary/20 backdrop-blur-xl">
              <CardContent className="p-8 flex flex-col justify-between h-full min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Available Balance</span>
                    <h2 className="text-4xl sm:text-5xl font-black font-display text-gradient mt-2">
                      {formatCurrency(user?.walletBalance || 0)}
                    </h2>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Wallet className="h-8 w-8"/>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-8">
                  <Button onClick={() => setDepositModal(true)} className="bg-gradient-primary text-primary-foreground font-bold gap-2">
                    <Plus className="h-4 w-4"/> Add Funds
                  </Button>
                  <Button onClick={() => setWithdrawModal(true)} variant="outline" disabled={!user?.walletBalance || user.walletBalance <= 0} className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2">
                    <Landmark className="h-4 w-4"/> Withdraw to Bank / UPI
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="bg-black/30 border-white/5 backdrop-blur-xl flex flex-col justify-center p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary"/> Wallet Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Total Transactions</span>
                  <span className="font-bold">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Recent Refund Inflow</span>
                  <span className="font-bold text-green-500">
                    {formatCurrency(transactions
            .filter(t => t.type === "refund")
            .reduce((sum, t) => sum + t.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Total Outflow</span>
                  <span className="font-bold text-red-400">
                    {formatCurrency(transactions
            .filter(t => t.type === "withdrawal")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <div>
            <h3 className="text-xl font-bold font-display mb-4">Transaction History</h3>
            <Card className="bg-black/20 border-white/5 backdrop-blur-md overflow-hidden">
              <CardContent className="p-0">
                {loading ? (<div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin"/> Loading transactions...
                  </div>) : transactions.length === 0 ? (<div className="p-12 text-center text-muted-foreground space-y-2">
                    <History className="h-8 w-8 mx-auto opacity-30"/>
                    <p>No transaction history found</p>
                  </div>) : (<div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-4">Transaction</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {transactions.map((tx) => {
                const isDeposit = tx.type === "refund"; // credit
                return (<tr key={tx._id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${isDeposit
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                  {isDeposit ? (<>
                                      <ArrowDownLeft className="h-3 w-3"/> Deposit
                                    </>) : (<>
                                      <ArrowUpRight className="h-3 w-3"/> Withdrawal / Paid
                                    </>)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-medium text-foreground">{tx.description}</p>
                                {tx.relatedId && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Ref: {tx.relatedId}</p>}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className={`px-6 py-4 text-right font-bold font-mono whitespace-nowrap ${isDeposit ? "text-green-400" : "text-red-400"}`}>
                                {isDeposit ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                              </td>
                            </tr>);
            })}
                      </tbody>
                    </table>
                  </div>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Deposit Dialog */}
      <Dialog open={depositModal} onOpenChange={setDepositModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary"/> Add Funds to Wallet
            </DialogTitle>
            <DialogDescription>
              Enter the amount you wish to add to your wallet balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="depAmount">Amount (₹)</Label>
              <Input id="depAmount" type="number" min="10" step="any" placeholder="Enter amount (min ₹10)..." value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required className="bg-secondary border-border w-full mt-1.5"/>
            </div>

            <div>
              <Label className="block mb-2">Select Payment Method</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="radio" name="depMethod" checked={depositMethod === "card"} onChange={() => setDepositMethod("card")} className="accent-primary"/>
                  Credit / Debit Card
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="radio" name="depMethod" checked={depositMethod === "upi"} onChange={() => setDepositMethod("upi")} className="accent-primary"/>
                  UPI Payment
                </label>
              </div>
            </div>

            {depositMethod === "card" ? (<div className="space-y-3 bg-secondary/20 p-3 rounded-lg border">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" type="text" placeholder="1234 5678 1234 5678" value={cardNumber} onChange={e => {
                const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                const match = v.match(/\d{4,16}/g)?.[0] || "";
                const parts = [];
                for (let i = 0; i < match.length; i += 4) {
                    parts.push(match.substring(i, i + 4));
                }
                setCardNumber(parts.length ? parts.join(" ") : v);
            }} maxLength={19} required className="mt-1"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardExpiry">Expiry Date</Label>
                    <Input id="cardExpiry" type="text" placeholder="MM/YY" value={cardExpiry} onChange={e => {
                const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                setCardExpiry(v.length >= 2 ? v.substring(0, 2) + "/" + v.substring(2, 4) : v);
            }} maxLength={5} required className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="cardCvv">CVV</Label>
                    <Input id="cardCvv" type="password" placeholder="123" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))} maxLength={3} required className="mt-1"/>
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardholder">Cardholder Name</Label>
                  <Input id="cardholder" type="text" placeholder="John Doe" value={cardholderName} onChange={e => setCardholderName(e.target.value)} required className="mt-1"/>
                </div>
              </div>) : (<div className="bg-secondary/20 p-3 rounded-lg border">
                <Label htmlFor="depositUpi">UPI ID</Label>
                <Input id="depositUpi" type="text" placeholder="e.g. user@okhdfcbank" value={depositUpi} onChange={e => setDepositUpi(e.target.value)} required className="mt-1.5"/>
              </div>)}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDepositModal(false)}>Cancel</Button>
              <Button type="submit" disabled={depositing || !depositAmount} className="bg-gradient-primary text-primary-foreground font-bold">
                {depositing ? "Processing..." : "Process Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawModal} onOpenChange={setWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary"/> Withdraw Balance
            </DialogTitle>
            <DialogDescription>
              Funds will be transferred out of your wallet balance to your selected payout target.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Available Balance: <span className="font-bold text-primary">{formatCurrency(user?.walletBalance || 0)}</span>
              </p>
              <Label htmlFor="withdrawAmount">Amount to Withdraw (₹)</Label>
              <Input id="withdrawAmount" type="number" min="1" max={user?.walletBalance || 0} step="any" placeholder="Enter amount..." value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required className="bg-secondary border-border w-full mt-1.5"/>
            </div>

            <div>
              <Label className="block mb-2">Withdrawal Method</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="radio" name="withMethod" checked={withdrawMethod === "upi"} onChange={() => setWithdrawMethod("upi")} className="accent-primary"/>
                  UPI Transfer
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="radio" name="withMethod" checked={withdrawMethod === "bank"} onChange={() => setWithdrawMethod("bank")} className="accent-primary"/>
                  Bank Transfer
                </label>
              </div>
            </div>

            {withdrawMethod === "upi" ? (<div className="bg-secondary/20 p-3 rounded-lg border">
                <Label htmlFor="withdrawUpi">UPI ID</Label>
                <Input id="withdrawUpi" type="text" placeholder="e.g. user@okaxis" value={withdrawUpi} onChange={e => setWithdrawUpi(e.target.value)} required className="mt-1.5"/>
              </div>) : (<div className="space-y-3 bg-secondary/20 p-3 rounded-lg border">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" type="text" placeholder="e.g. HDFC Bank" value={bankName} onChange={e => setBankName(e.target.value)} required className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" type="text" placeholder="e.g. 50100234567890" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input id="ifscCode" type="text" placeholder="e.g. HDFC0000060" value={ifscCode} onChange={e => setIfscCode(e.target.value)} required className="mt-1"/>
                </div>
              </div>)}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setWithdrawModal(false)}>Cancel</Button>
              <Button type="submit" disabled={withdrawing || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (user?.walletBalance || 0)} className="bg-gradient-primary text-primary-foreground font-bold">
                {withdrawing ? "Processing..." : "Process Withdrawal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CustomerLayout>);
};
export default CustomerWallet;
