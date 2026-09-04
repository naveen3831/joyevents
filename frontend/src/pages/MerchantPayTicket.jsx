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

    // Field-level errors
    const [errors, setErrors] = useState({});

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

    const validate = () => {
        const newErrors = {};
        const rawCard = cardNumber.replace(/\s/g, "");
        if (!rawCard || rawCard.length !== 16) {
            newErrors.cardNumber = "Enter a valid 16-digit card number.";
        }
        if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
            newErrors.expiryDate = "Enter expiry in MM/YY format.";
        }
        if (!cvv || cvv.length < 3 || cvv.length > 4) {
            newErrors.cvv = "Enter a valid 3 or 4-digit CVV.";
        }
        if (!cardholderName.trim()) {
            newErrors.cardholderName = "Cardholder name is required.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token || !ticket) return;
        if (!validate()) return;

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

    const handleCardNumberChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
        const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
        setCardNumber(formatted);
        if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: undefined }));
    };

    const handleExpiryChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
        const formatted = raw.length >= 3 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
        setExpiryDate(formatted);
        if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: undefined }));
    };

    const handleCvvChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
        setCvv(raw);
        if (errors.cvv) setErrors((prev) => ({ ...prev, cvv: undefined }));
    };

    return (
        <MerchantLayout>
            <div className="w-full min-w-0 py-5 px-3 sm:px-5 font-sans">

                {/* Back nav */}
                <div className="max-w-[1100px] mx-auto mb-5">
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
                        <p className="text-xs text-muted-foreground">Loading payment details...</p>
                    </div>
                ) : ticket ? (
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        className="w-full max-w-[1100px] mx-auto"
                    >
                        {/* Two-column checkout layout */}
                        <div className="flex flex-col lg:flex-row gap-6 items-start">

                            {/* ── LEFT: Upgrade Summary ── */}
                            <div className="w-full lg:w-[35%] lg:max-w-[360px] lg:shrink-0">
                                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

                                    {/* Card header */}
                                    <div className="px-5 pt-5 pb-4 border-b border-border/60">
                                        <div className="flex items-center gap-2 mb-3">
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
                                            <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
                                                +{ticket.requestedEvents} Events
                                            </span>
                                            <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
                                                +{ticket.requestedServices} Services
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dashed divider */}
                                    <div className="mx-5 border-t border-dashed border-border/70" />

                                    {/* Amount due */}
                                    <div className="px-5 py-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Amount Due</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">One-time setup fee</p>
                                            <p className="text-[22px] font-extrabold text-primary tracking-tight leading-none">
                                                {formatCurrency(ticket.quotationAmount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Security note */}
                                    <div className="mx-5 mb-5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 px-3.5 py-3 flex items-start gap-2.5">
                                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-semibold text-emerald-700">Secure demo payment</p>
                                            <p className="text-[10px] text-emerald-600/80 mt-0.5 leading-relaxed">
                                                No real charges will be made. This is a simulated transaction.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── RIGHT: Payment Form ── */}
                            <div className="w-full flex-1 min-w-0">
                                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

                                    {/* Form header */}
                                    <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Payment Details</p>
                                            <p className="text-[11px] text-muted-foreground">Enter your card information below</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>

                                        {/* Card Number */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cardNumber" className="text-xs font-semibold text-foreground/80">
                                                Card Number
                                            </Label>
                                            <Input
                                                id="cardNumber"
                                                required
                                                placeholder="1111 2222 3333 4444"
                                                value={cardNumber}
                                                onChange={handleCardNumberChange}
                                                inputMode="numeric"
                                                maxLength={19}
                                                autoComplete="cc-number"
                                                className="h-12 text-sm rounded-xl font-mono tracking-widest border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                            />
                                            {errors.cardNumber && (
                                                <p className="text-[11px] text-destructive">{errors.cardNumber}</p>
                                            )}
                                        </div>

                                        {/* Expiry + CVV — side by side */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="expiryDate" className="text-xs font-semibold text-foreground/80">
                                                    Expiry Date
                                                </Label>
                                                <Input
                                                    id="expiryDate"
                                                    required
                                                    placeholder="MM/YY"
                                                    value={expiryDate}
                                                    onChange={handleExpiryChange}
                                                    inputMode="numeric"
                                                    maxLength={5}
                                                    autoComplete="cc-exp"
                                                    className="h-12 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                                />
                                                {errors.expiryDate && (
                                                    <p className="text-[11px] text-destructive">{errors.expiryDate}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="cvv" className="text-xs font-semibold text-foreground/80">
                                                    CVV
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="cvv"
                                                        required
                                                        placeholder="123"
                                                        type="password"
                                                        inputMode="numeric"
                                                        value={cvv}
                                                        onChange={handleCvvChange}
                                                        maxLength={4}
                                                        autoComplete="cc-csc"
                                                        className="h-12 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary pr-9"
                                                    />
                                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                                                </div>
                                                {errors.cvv && (
                                                    <p className="text-[11px] text-destructive">{errors.cvv}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cardholder Name */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cardholderName" className="text-xs font-semibold text-foreground/80">
                                                Cardholder Name
                                            </Label>
                                            <Input
                                                id="cardholderName"
                                                required
                                                placeholder="John Doe"
                                                value={cardholderName}
                                                onChange={(e) => {
                                                    setCardholderName(e.target.value);
                                                    if (errors.cardholderName) setErrors((prev) => ({ ...prev, cardholderName: undefined }));
                                                }}
                                                autoComplete="cc-name"
                                                className="h-12 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                                            />
                                            {errors.cardholderName && (
                                                <p className="text-[11px] text-destructive">{errors.cardholderName}</p>
                                            )}
                                        </div>

                                        {/* Footer: Total + Buttons */}
                                        <div className="border-t border-border/60 pt-4 mt-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Total */}
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Due</p>
                                                    <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">
                                                        {formatCurrency(ticket.quotationAmount)}
                                                    </p>
                                                </div>
                                                {/* Buttons */}
                                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => navigate("/merchant-dashboard")}
                                                        className="h-10 px-5 text-xs font-semibold rounded-xl cursor-pointer border-border hover:bg-secondary/60 flex-1 sm:flex-none"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={paymentLoading}
                                                        className="h-10 px-6 text-xs font-bold rounded-xl cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none min-w-[148px]"
                                                    >
                                                        {paymentLoading ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                Processing...
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

                                {/* Security trust line — clean text, no special characters */}
                                <p className="text-center text-[10px] text-muted-foreground/50 mt-3 flex items-center justify-center gap-2 flex-wrap">
                                    <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                                    <span>256-bit SSL encrypted</span>
                                    <span className="opacity-40">&bull;</span>
                                    <span>Simulated payment</span>
                                    <span className="opacity-40">&bull;</span>
                                    <span>No real charges</span>
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
