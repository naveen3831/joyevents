import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Search, CheckCircle2, XCircle, Loader2, QrCode } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiMarkTicketAsUsed } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { useGsapStagger } from "@/lib/gsapAnimations";
const TicketValidation = () => {
    const { token } = useAuth();
    const [ticketId, setTicketId] = useState("");
    const [loading, setLoading] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [markingAsUsed, setMarkingAsUsed] = useState(false);
    const [markUsedDialogOpen, setMarkUsedDialogOpen] = useState(false);
    const [showAllValidations, setShowAllValidations] = useState(false);
    const historyRef = useGsapStagger([searchHistory, showAllValidations], { y: 10, stagger: 0.03 });
    const loadRecentValidations = async () => {
        if (!token)
            return;
        setHistoryLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/bookings/validate/recent`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchHistory(data.recentValidations || []);
            }
        }
        catch (err) {
            console.error("Failed to load validation history:", err);
        }
        finally {
            setHistoryLoading(false);
        }
    };
    useEffect(() => {
        loadRecentValidations();
    }, [token]);
    const validateTicket = async () => {
        const cleanTicketId = ticketId.trim();
        if (!cleanTicketId) {
            toast.error("Please enter a ticket ID");
            return;
        }
        if (!/^TKT-\d+-[A-Z0-9]+$/i.test(cleanTicketId)) {
            toast.error("Invalid Ticket ID format. Expected format: TKT-XXXXXXXXXXXXX-YYYYYYYY");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/bookings/validate/${cleanTicketId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.alreadyValidated) {
                    setValidationResult({
                        valid: false,
                        alreadyValidated: true,
                        booking: data.booking,
                        validatedAt: data.validatedAt,
                        validatedBy: data.validatedBy,
                        message: "This ticket has already been used"
                    });
                    toast.error("❌ Ticket already used! Cannot accept this ticket again.");
                }
                else if (response.status === 403) {
                    setValidationResult({
                        valid: false,
                        alreadyValidated: false,
                        notAuthorized: true,
                        message: data.error || "Not authorized to validate this ticket"
                    });
                    toast.error("⛔ This ticket does not belong to your events.");
                }
                else {
                    setValidationResult({
                        valid: false,
                        alreadyValidated: false,
                        message: data.error || "Ticket not found"
                    });
                    toast.error(data.error || "Ticket not found");
                }
                return;
            }
            setValidationResult({
                valid: true,
                alreadyValidated: false,
                booking: data.booking
            });
            toast.success("✅ Ticket is valid! Ready to mark as used.");
        }
        catch (error) {
            setValidationResult({
                valid: false,
                alreadyValidated: false,
                message: error.message || "Error validating ticket"
            });
            toast.error(error.message || "Error validating ticket");
        }
        finally {
            setLoading(false);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            validateTicket();
        }
    };
    const handleMarkAsUsed = async () => {
        if (!validationResult?.booking?.ticketId)
            return;
        setMarkingAsUsed(true);
        try {
            const result = await apiMarkTicketAsUsed(validationResult.booking.ticketId, token);
            toast.success("✅ Ticket marked as used successfully! Customer admitted.");
            setMarkUsedDialogOpen(false);
            // Clear the validation result and input
            setValidationResult(null);
            setTicketId("");
            // Refresh validation history from database
            loadRecentValidations();
        }
        catch (error) {
            toast.error(error.message || "Failed to mark ticket as used");
        }
        finally {
            setMarkingAsUsed(false);
        }
    };
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
                <QrCode className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  Ticket <span className="text-gradient">Validation</span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Verify and validate customer tickets at event entrance</p>
              </div>
            </div>
          </motion.div>

          {/* Validation Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.1 }} className="grid gap-8 lg:grid-cols-3">
            {/* Search Panel */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Search Ticket</h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-muted-foreground block">Ticket ID</label>
                      <span className="text-[10px] text-muted-foreground">{(ticketId || "").length}/30</span>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Enter Ticket ID (e.g., TKT-1773396713958-FDDMIBBK)" maxLength={30} value={ticketId} onChange={(e) => setTicketId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} onKeyPress={handleKeyPress} className="flex-1 font-mono uppercase border-border bg-background rounded-lg min-h-[44px]"/>
                      <Button onClick={validateTicket} disabled={loading} className="bg-gradient-primary text-primary-foreground hover:opacity-90 min-h-[44px]">
                        {loading ? (<>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            Validating...
                          </>) : (<>
                            <Search className="mr-2 h-4 w-4"/>
                            Validate
                          </>)}
                      </Button>
                    </div>
                  </div>

                  {/* Validation Result */}
                  {validationResult && (<motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className={`p-6 rounded-lg border-2 ${validationResult.valid
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"}`}>
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {validationResult.valid ? (<CheckCircle2 className="h-6 w-6 text-green-500"/>) : (<XCircle className="h-6 w-6 text-red-500"/>)}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold text-lg ${validationResult.valid ? "text-green-600" : "text-red-600"}`}>
                            {validationResult.valid
                ? "✓ Valid Ticket"
                : validationResult.alreadyValidated
                    ? "✗ Ticket Already Used - REJECTED"
                    : validationResult.notAuthorized
                        ? "⛔ Not Your Event"
                        : "✗ Invalid Ticket"}
                          </h3>
                          
                          {validationResult.notAuthorized ? (<div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                              <p className="text-sm font-semibold text-orange-600">This ticket belongs to a different merchant's event. You can only validate tickets for your own events.</p>
                            </div>) : validationResult.booking ? (<div className="mt-4 space-y-3">
                              {validationResult.alreadyValidated && (<div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                                  <p className="text-sm font-semibold text-red-700 mb-2">🚫 This ticket has already been used and cannot be accepted again</p>
                                  <div className="text-xs text-red-600 space-y-1">
                                    <p><strong>Used At:</strong> {new Date(validationResult.validatedAt).toLocaleString()}</p>
                                    <p><strong>Used By:</strong> {validationResult.validatedBy?.name || "Unknown"}</p>
                                  </div>
                                </div>)}

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Customer Name</p>
                                  <p className="font-semibold text-foreground">{validationResult.booking.customer?.name || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Email</p>
                                  <p className="font-semibold text-foreground text-sm">{validationResult.booking.customer?.email || "N/A"}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Event/Service</p>
                                  <p className="font-semibold text-foreground">{validationResult.booking.eventName || validationResult.booking.serviceName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Booking Status</p>
                                  <p className={`font-semibold text-sm capitalize ${validationResult.booking.status === 'confirmed' ? 'text-green-600' :
                    validationResult.booking.status === 'completed' ? 'text-blue-600' :
                        'text-yellow-600'}`}>
                                    {validationResult.booking.status}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Date & Time</p>
                                  <p className="font-semibold text-foreground text-sm">
                                    {new Date(validationResult.booking.datetime).toLocaleDateString()} {new Date(validationResult.booking.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Price Paid</p>
                                  <p className="font-semibold text-foreground">{formatCurrency(validationResult.booking.price)}</p>
                                </div>
                              </div>

                              {/* Ticket Breakdown */}
                              {(validationResult.booking.selectedTickets || validationResult.booking.ticketType) && (<div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">🎫 Tickets:</p>
                                  {validationResult.booking.selectedTickets && Object.keys(validationResult.booking.selectedTickets).length > 0 ? (<div className="space-y-1">
                                      {Object.entries(validationResult.booking.selectedTickets).map(([type, qty]) => (<div key={type} className="flex justify-between text-sm">
                                          <span className="capitalize text-foreground">{type === 'silver' ? '🥈 Silver' : type === 'gold' ? '🥇 Gold' : type === 'diamond' ? '💎 Diamond' : type}</span>
                                          <span className="font-semibold text-primary">{Number(qty)} Ticket{Number(qty) > 1 ? 's' : ''}</span>
                                        </div>))}
                                    </div>) : (<div className="flex justify-between text-sm">
                                      <span className="capitalize text-foreground">{validationResult.booking.ticketType}</span>
                                      <span className="font-semibold text-primary">{validationResult.booking.quantity || 1} Ticket{(validationResult.booking.quantity || 1) > 1 ? 's' : ''}</span>
                                    </div>)}
                                </div>)}

                              {validationResult.valid ? (<div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                  <p className="text-sm font-semibold text-green-600 mb-3">✓ Ticket is valid and can be admitted</p>
                                  <Button onClick={() => setMarkUsedDialogOpen(true)} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                    <CheckCircle2 className="h-4 w-4 mr-2"/>
                                    Mark as Used
                                  </Button>
                                </div>) : validationResult.alreadyValidated ? (<div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                  <p className="text-sm font-semibold text-red-600">🚫 DO NOT ACCEPT - This ticket cannot be used again</p>
                                </div>) : null}
                            </div>) : (<p className="mt-2 text-sm text-muted-foreground">{validationResult.message}</p>)}
                        </div>
                      </div>
                    </motion.div>)}
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display font-semibold mb-4">How to Use</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">1</div>
                    <p>Ask customer for their ticket ID or scan the QR code</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">2</div>
                    <p>Enter the ticket ID in the search box</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">3</div>
                    <p>Click "Validate" or press Enter</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">4</div>
                    <p>Check the ticket details and admit if valid</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display font-semibold mb-4">Recent Validations</h3>
                {historyLoading ? (<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin"/> Loading history...
                  </div>) : searchHistory.length === 0 ? (<p className="text-sm text-muted-foreground">No validations yet</p>) : (<div className="space-y-2">
                    {(showAllValidations ? searchHistory : searchHistory.slice(0, 5)).map((item, idx) => (<div key={idx} className="p-3 rounded bg-secondary/50 text-xs space-y-1 border border-border/50">
                        <div className="flex justify-between items-center">
                          <p className="font-mono text-primary font-bold truncate flex-1 mr-2">{item.ticketId}</p>
                          <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0">Validated</span>
                        </div>
                        {item.customerName && (<p className="text-[11px] text-foreground/80 font-medium">Customer: {item.customerName}</p>)}
                        {item.eventTitle && (<p className="text-[10px] text-muted-foreground truncate">Event: {item.eventTitle}</p>)}
                        <p className="text-muted-foreground text-[10px] pt-1 border-t border-border/20">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>))}
                    {searchHistory.length > 5 && (<div className="text-center pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowAllValidations(!showAllValidations)} className="text-primary hover:text-primary/80 text-xs font-semibold h-8">
                          {showAllValidations ? "Show Less" : `View All (${searchHistory.length})`}
                        </Button>
                      </div>)}
                  </div>)}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mark as Used Dialog */}
      <Dialog open={markUsedDialogOpen} onOpenChange={setMarkUsedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Ticket as Used</DialogTitle>
            <DialogDescription>
              Confirm that this ticket has been used and the customer has been admitted
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-600">
                <strong>Ticket ID:</strong> {validationResult?.booking?.ticketId}
              </p>
              <p className="text-sm text-blue-600 mt-2">
                <strong>Customer:</strong> {validationResult?.booking?.customer?.name}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkUsedDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsUsed} disabled={markingAsUsed} className="bg-green-600 hover:bg-green-700">
              {markingAsUsed ? "Marking..." : "Confirm & Mark as Used"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantLayout>);
};
export default TicketValidation;
