import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, IndianRupee, Loader2, CheckCircle2, Zap } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetTickets, apiSendTicketQuotation } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

const AdminSendTicketQuote = () => {
    const { ticketId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(true);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchTicket = async () => {
            if (!token) return;
            setLoadingTicket(true);
            try {
                const res = await apiGetTickets(token);
                const found = (res.tickets || []).find((t) => t._id === ticketId);
                if (!found) {
                    toast.error("Ticket not found.");
                    navigate("/admin-dashboard/users?tab=tickets");
                    return;
                }
                if (found.status !== "pending") {
                    toast.error("This ticket does not require a quotation.");
                    navigate("/admin-dashboard/users?tab=tickets");
                    return;
                }
                setTicket(found);
            } catch (err) {
                toast.error(err?.message || "Failed to load ticket details.");
                navigate("/admin-dashboard/users?tab=tickets");
            } finally {
                setLoadingTicket(false);
            }
        };
        fetchTicket();
    }, [token, ticketId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token || !ticket) return;
        const amt = Number(quoteAmount);
        if (isNaN(amt) || amt < 1 || amt > 1000000) {
            toast.error("Quotation amount must be a number between 1 and 1,000,000.");
            return;
        }
        setSending(true);
        try {
            await apiSendTicketQuotation(ticket._id, amt, token);
            toast.success("Limit upgrade quotation sent to merchant!");
            navigate("/admin-dashboard/users?tab=tickets");
        } catch (err) {
            toast.error(err?.message || "Failed to send ticket quotation");
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminLayout>
            <div className="w-full max-w-[820px] mx-auto">
                <PageHeader
                    title="Send Limit Upgrade Quotation"
                    subtitle="Set the quotation fee for this merchant slot upgrade request."
                    breadcrumbs={[
                        { label: "Admin Portal", to: "/admin-dashboard" },
                        { label: "User Management", to: "/admin-dashboard/users" },
                        { label: "Slot Upgrades", to: "/admin-dashboard/users?tab=tickets" },
                        { label: "Send Quotation" },
                    ]}
                    className="!mb-5"
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/admin-dashboard/users?tab=tickets")}
                            className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Tickets
                        </Button>
                    }
                />

                {loadingTicket ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Loading ticket details…</p>
                    </div>
                ) : ticket ? (
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.26, ease: "easeOut" }}
                        className="flex flex-col lg:flex-row gap-5 items-start"
                    >
                        {/* LEFT: Ticket Summary */}
                        <div className="w-full lg:w-[280px] lg:shrink-0">
                            <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                                <div className="px-5 pt-5 pb-4 border-b border-border/60">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Slot Upgrade Request</span>
                                    </div>
                                    <h2 className="text-[15px] font-bold text-foreground leading-snug">
                                        {ticket.merchant?.name || "Merchant"}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {ticket.merchant?.email}
                                    </p>
                                </div>

                                <div className="px-5 py-4 space-y-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requested Slots</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/8 border border-primary/20 text-[11px] font-semibold text-primary">
                                            +{ticket.requestedEvents} Events
                                        </span>
                                        <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-primary/8 border border-primary/20 text-[11px] font-semibold text-primary">
                                            +{ticket.requestedServices} Services
                                        </span>
                                    </div>
                                </div>

                                {ticket.message && (
                                    <>
                                        <div className="mx-5 border-t border-dashed border-border/70" />
                                        <div className="px-5 py-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Merchant Message</p>
                                            <p className="text-xs text-foreground/80 leading-relaxed italic">"{ticket.message}"</p>
                                        </div>
                                    </>
                                )}

                                <div className="mx-5 mb-5 rounded-xl bg-amber-50/70 border border-amber-200/60 px-3.5 py-3 flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-semibold text-amber-700">Pending Review</p>
                                        <p className="text-[10px] text-amber-600/80 mt-0.5 leading-relaxed">
                                            Requested on {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Quotation Form */}
                        <div className="w-full flex-1 min-w-0">
                            <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                                <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <IndianRupee className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Set Quotation Amount</p>
                                        <p className="text-[11px] text-muted-foreground">Enter the fee the merchant must pay to activate the slot upgrade.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="quoteAmount" className="text-xs font-semibold text-foreground/80">
                                            Quotation Amount (in ₹) <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">₹</span>
                                            <Input
                                                id="quoteAmount"
                                                type="text"
                                                required
                                                placeholder="e.g. 5000"
                                                value={quoteAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                                    setQuoteAmount(val.slice(0, 7));
                                                }}
                                                className="h-11 pl-8 text-sm rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary font-mono"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Enter a positive number between ₹1 and ₹10,00,000</p>
                                    </div>

                                    {quoteAmount && Number(quoteAmount) >= 1 && (
                                        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground font-medium">Quotation to be sent</p>
                                            <p className="text-lg font-extrabold text-primary font-display tracking-tight">
                                                {formatCurrency(Number(quoteAmount))}
                                            </p>
                                        </div>
                                    )}

                                    <div className="border-t border-border/60 pt-4">
                                        <div className="flex items-center justify-end gap-2.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => navigate("/admin-dashboard/users?tab=tickets")}
                                                className="h-11 px-5 text-xs font-semibold rounded-xl cursor-pointer border-border hover:bg-secondary/60"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={sending}
                                                className="h-11 px-6 text-xs font-bold rounded-xl cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all min-w-[140px]"
                                            >
                                                {sending ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Sending…
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5">
                                                        <IndianRupee className="h-3.5 w-3.5" />
                                                        Send Quote
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </div>
        </AdminLayout>
    );
};

export default AdminSendTicketQuote;
