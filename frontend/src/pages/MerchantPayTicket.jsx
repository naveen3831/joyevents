import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, Zap, Lock } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiPayTicketQuotation, apiGetTickets } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

const MerchantPayTicket = () => {
    const { ticketId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(true);

    const [cardNumber, setCardNumber] = useState("");
    const [cardholderName, setCardholderName] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        const fetchTicket = async () => {
            if (!token) return;
            setLoadingTicket(true);
            try {
                const res = await apiGetTickets(token);
                const found = (res.tickets || []).find((t) => t._id === ticketId);
                if (!found) {
                    toast.error("Ticket not found.");
                    navigate("/merchant-dashboard");
                    return;
                }
                if (found.status !== "quotation_sent") {
                    toast.error("This ticket does not require payment.");
                    navigate("/merchant-dashboard");
                    return;
                }
                setTicket(found);
            } catch (err) {
                toast.error(err?.message || "Failed to load ticket details.");
                navigate("/merchant-dashboard");
            } finally {
                setLoadingTicket(false);
            }
        };
        fetchTicket();
    }, [token, ticketId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token || !ticket) return;

        if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
            toast.error("Please fill in all card details");
            return;
        }
        if (cardNumber.replace(/\s/g, "").length !== 16) {
            toast.error("Please enter a valid 16-digit card number");
            return;
        }

        setPaymentLoading(true);
        try {
            await apiPayTicketQuotation(ticket._id, cardNumber, token);
            toast.success("Payment successful! Awaiting admin approval.");
            navigate("/merchant-dashboard");
        } catch (err) {
            toast.error(err?.message || "Payment failed. Please try again.");
        } finally {
            setPaymentLoading(false);
        }
    };

    return (
        <MerchantLayout>
            <div className="w-full min-w-0 py-6 px-3 sm:px-4 font-sans">
                {/* Back nav */}
                <div className="max-w-[820px] mx-auto mb-4">
                    <button
                        onClick={() => navigate("/merchant-dashboard")}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Dashboard
                    </button>
                </div>

                {loadingTicket ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Loading payment detailsâ€¦</p>
                    </div>
                ) : ticket ? (
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        className="w-full max-w-[820px] mx-auto"
                    >
                        <div className="flex flex-col lg:flex-row gap-5 items-start">

                            {/* â”€â”€ LEFT COLUMN: Order Summary â”€â”€ */}
                            <div className="w-full lg:w-[288px] lg:shrink-0">
                                <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                                    {/* Summary header */}
                                    <div className="px-5 pt-5 pb-4 border-b border-border/60">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Slot Upgrade</span>
                                        </div>
                                        <h1 className="text-[15px] font-bold text-foreground leading-snug">
                                            Pay Slot Upgrade
                                        </h1>
                                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                            Activate your upgraded event &amp; service limits after payment.
                                        </p>
                                    </div>

                                    {/* Upgrade includes */}
                                    <div className="px-5 py-4 space-y-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upgrade Includes</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/8 border border-primary/20 text-[11px] font-semibold text-primary">
                                                +{ticket.requestedEvents} Events
                                            </span>
                                            <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/8 border border-primary/20 text-[11px] font-semibold text-primary">
                                                +{ticket.requestedServices} Services
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dashed divider */}
                                    <div className="mx-5 border-t border-dashed border-border/70" />

                                    {/* Amount due */}
                                    <div className="px-5 py-4">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount Due</p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">One-time setup fee</p>
                                            </div>
                                            <p className="text-[22px] font-extrabold text-primary font-display tracking-tight leading-none">
                                                {formatCurrency(ticket.quotationAmount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Security note */}
                                    <div className="mx-5 mb-5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 px-3.5 py-3 flex items-start gap-2.5">
                                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-semibold text-emerald-700">Secure demo payment</p>
                                            <p className="text-[10px] text-emerald-600/80 mt-0.5 leading-relaxed">No real charges will be made. This is a simulated transaction.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* â”€â”€ RIGHT COLUMN: Payment Form â”€â”€ */}
                            <div className="w-full flex-1 min-w-0">
                                <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                                    {/* Form header */}
                                    <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Payment Details</p>
                                            <p className="text-[11px] text-muted-foreground">Enter your card information below</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                                        {/* Card Number */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cardNumber" className="text-xs font-semibold text-foreground/80">Card Number</Label>
                                            <Input
                                                id="cardNumber"
                                                required
                                                placeholder="4111 2222 3333 4444"
                                                value={cardNumber}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                                                    const matches = val.match(/\d{4,16}/g);
                                                    const match = (matches && matches[0]) || "";
                                                    const parts = [];
                                                    for (let i = 0, len = match.length; i < len; i += 4) {
                                                        parts.push(match.substring(i, i + 4));
                                                    }
                                                    setCardNumber(parts.length ? parts.join(" ") : val);
                                                }}
                                                maxLength={19}
                                                className="h-11 text-sm rounded-xl font-mono tracking-widest border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                            />
                                        </div>

                                        {/* Expiry + CVV */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="expiryDate" className="text-xs font-semibold text-foreground/80">Expiry Date</Label>
                                                <Input
                                                    id="expiryDate"
                                                    required
                                                    placeholder="MM/YY"
                                                    value={expiryDate}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                                                        setExpiryDate(val.length >= 2 ? val.substring(0, 2) + "/" + val.substring(2, 4) : val);
                                                    }}
                                                    maxLength={5}
                                                    className="h-11 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="cvv" className="text-xs font-semibold text-foreground/80">CVV</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="cvv"
                                                        required
                                                        placeholder="â€¢â€¢â€¢"
                                                        type="password"
                                                        value={cvv}
                                                        onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                                                        maxLength={3}
                                                        className="h-11 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary pr-9"
                                                    />
                                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cardholder Name */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cardholderName" className="text-xs font-semibold text-foreground/80">Cardholder Name</Label>
                                            <Input
                                                id="cardholderName"
                                                required
                                                placeholder="John Doe"
                                                value={cardholderName}
                                                onChange={(e) => setCardholderName(e.target.value)}
                                                className="h-11 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                            />
                                        </div>

                                        {/* Bottom total + CTA */}
                                        <div className="border-t border-border/60 pt-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Total */}
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Due</p>
                                                    <p className="text-xl font-extrabold text-foreground font-display tracking-tight mt-0.5">
                                                        {formatCurrency(ticket.quotationAmount)}
                                                    </p>
                                                </div>
                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => navigate("/merchant-dashboard")}
                                                        className="h-11 px-5 text-xs font-semibold rounded-xl cursor-pointer border-border hover:bg-secondary/60 flex-1 sm:flex-none"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={paymentLoading}
                                                        className="h-11 px-6 text-xs font-bold rounded-xl cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none min-w-[148px]"
                                                    >
                                                        {paymentLoading ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                Processingâ€¦
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5">
                                                                <Lock className="h-3.5 w-3.5" />
                                                                Pay {formatCurrency(ticket.quotationAmount)}
                                                            </span>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {/* Bottom trust line */}
                                <p className="text-center text-[10px] text-muted-foreground/50 mt-3 flex items-center justify-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                                    256-bit SSL encrypted &nbsp;Â·&nbsp; Simulated payment &nbsp;Â·&nbsp; No real charges
                                </p>
                            </div>

                        </div>
                    </motion.div>
                ) : null}
            </div>
        </MerchantLayout>
    );
};

export default MerchantPayTicket;
