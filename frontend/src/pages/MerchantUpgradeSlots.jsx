import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiRaiseTicket } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MerchantUpgradeSlots = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [requestedEvents, setRequestedEvents] = useState(5);
    const [requestedServices, setRequestedServices] = useState(5);
    const [ticketMessage, setTicketMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return;

        const reqEv = Number(requestedEvents) || 0;
        const reqSe = Number(requestedServices) || 0;

        if (reqEv < 0 || reqEv > 100 || reqSe < 0 || reqSe > 100) {
            toast.error("Requested slot increases must be between 0 and 100.");
            return;
        }
        if (reqEv === 0 && reqSe === 0) {
            toast.error("Please request at least one slot upgrade increase.");
            return;
        }
        if (ticketMessage.trim().length > 300) {
            toast.error("Explanation message cannot exceed 300 characters.");
            return;
        }

        setSubmitting(true);
        try {
            await apiRaiseTicket({
                requestedEvents: reqEv,
                requestedServices: reqSe,
                message: ticketMessage.trim()
            }, token);
            toast.success("Upgrade ticket request raised successfully!");
            navigate("/merchant-dashboard");
        } catch (err) {
            toast.error(err?.message || "Failed to submit upgrade request");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MerchantLayout>
            <div className="w-full min-w-0 pt-5 pb-12 font-sans">
                {/* Back to Dashboard Link */}
                <div className="max-w-[760px] mx-auto mb-5">
                    <button
                        onClick={() => navigate("/merchant-dashboard")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[760px] mx-auto"
                >
                    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                        {/* Header Banner */}
                        <div className="bg-muted/40 border-b border-border/70 p-5 sm:p-[22px_28px]">
                            <h1 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-indigo-500" /> Raise Upgrade Ticket
                            </h1>
                            <p className="text-xs text-muted-foreground mt-1.5">
                                Request additional slots for events and services from the platform administrator.
                            </p>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-5 sm:p-[24px_28px_26px] space-y-5 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reqEvents" className="text-xs font-semibold">Additional Event Slots</Label>
                                    <Input
                                        id="reqEvents"
                                        type="text"
                                        required
                                        value={requestedEvents}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setRequestedEvents(Number(val.slice(0, 3)));
                                        }}
                                        className="h-9 text-xs rounded-md"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1.5">Up to 100 slots</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reqServices" className="text-xs font-semibold">Additional Service Slots</Label>
                                    <Input
                                        id="reqServices"
                                        type="text"
                                        required
                                        value={requestedServices}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setRequestedServices(Number(val.slice(0, 3)));
                                        }}
                                        className="h-9 text-xs rounded-md"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1.5">Up to 100 slots</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-xs font-semibold">Explanation Message (Optional)</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Why do you need more slots? e.g. Scaling up, high season demand."
                                    maxLength={300}
                                    value={ticketMessage}
                                    onChange={(e) => setTicketMessage(e.target.value)}
                                    className="text-xs rounded-md min-h-[100px] h-[100px]"
                                />
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1.5">
                                    <span>Provide a short reason to help review your request.</span>
                                    <span>{ticketMessage.length}/300 characters</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/merchant-dashboard")}
                                    className="h-9 text-xs rounded-md cursor-pointer"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="h-9 text-xs font-semibold bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-md cursor-pointer"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-1">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                                        </span>
                                    ) : (
                                        "Submit Upgrade Request"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </MerchantLayout>
    );
};

export default MerchantUpgradeSlots;
