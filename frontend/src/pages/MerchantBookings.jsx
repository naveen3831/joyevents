import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Calendar, AlertCircle, MapPin, ExternalLink, Check, X, Loader2, CreditCard, Star } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiAssignedBookings, apiUpdateBookingStatus, apiRejectBooking, apiApproveCancel, apiRejectCancel, apiProcessRefund } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
const STATUS_BADGE = {
    assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    pending_approval: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    approved: "bg-green-500/15 text-green-400 border border-green-500/30",
    awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    accepted: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    processing: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
    paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold",
    awaiting_final_payment: "bg-pink-500/15 text-pink-400 border border-pink-500/30 font-bold",
    cancellation_requested: "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold animate-pulse",
    cancellation_fee_proposed: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold",
    refund_pending: "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold animate-pulse",
    refunded: "bg-red-500/15 text-red-400 border border-red-500/30 font-bold",
};
const MerchantBookings = ({ layout = "merchant" } = {}) => {
    const PageLayout = layout === "admin" ? AdminLayout : MerchantLayout;
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("active");
    const [approving, setApproving] = useState(null);
    const [approvalOptions, setApprovalOptions] = useState({ id: "", show: false });
    const [customAdvance, setCustomAdvance] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    // Cancellation and Refund handling states
    const [cancellationModal, setCancellationModal] = useState(false);
    const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
    const [cancelFeeOption, setCancelFeeOption] = useState("preset");
    const [customCancelFee, setCustomCancelFee] = useState("");
    const [submittingCancelAction, setSubmittingCancelAction] = useState(false);
    const load = async () => {
        if (!token)
            return;
        setLoading(true);
        try {
            const res = await apiAssignedBookings(token);
            setItems(res.bookings || []);
        }
        catch (e) {
            toast.error("Failed to load bookings");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, [token]);
    const sortLatestBookingsFirst = (list) => {
        return [...list].sort((a, b) => new Date(b.createdAt || b.datetime || 0).getTime() - new Date(a.createdAt || a.datetime || 0).getTime());
    };
    const activeItems = sortLatestBookingsFirst(items.filter(b => !["completed", "cancelled", "rejected"].includes(b.status)));
    const historyItems = sortLatestBookingsFirst(items.filter(b => ["completed", "cancelled"].includes(b.status)));
    const displayItems = tab === "active" ? activeItems : historyItems;
    const handleUpdateStatus = async (id, status) => {
        try {
            await apiUpdateBookingStatus(id, status, token);
            toast.success(`Status updated to ${status}`);
            load();
        }
        catch (e) {
            toast.error(e.message || "Failed to update status");
        }
    };
    const handleApprove = async (id, paymentType = "full", customAdvanceAmount) => {
        setApproving(id);
        try {
            const body = { paymentType };
            if (paymentType === "advance" && customAdvanceAmount) {
                body.customAdvanceAmount = customAdvanceAmount;
            }
            const res = await fetch(`${API_URL}/api/bookings/${id}/approve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok)
                throw new Error("Failed to approve booking");
            toast.success(paymentType === "advance"
                ? `Booking approved with advance payment of ${formatCurrency(customAdvanceAmount || "30%")}!`
                : "Booking approved with full payment requirement!");
            setApprovalOptions({ id: "", show: false });
            setCustomAdvance("");
            setShowCustomInput(false);
            load();
        }
        catch (e) {
            toast.error(e.message || "Failed to approve booking");
        }
        finally {
            setApproving(null);
        }
    };
    const handleReject = async (id) => {
        try {
            await apiRejectBooking(id, "Rejected by merchant", token);
            toast.success("Booking rejected");
            load();
        }
        catch (e) {
            toast.error(e.message || "Failed to reject booking");
        }
    };
    const handleApproveCancelSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCancelBooking)
            return;
        let fee = 0;
        if (cancelFeeOption === "preset") {
            fee = Math.round((selectedCancelBooking.price || 0) * 0.3);
        }
        else {
            const parsed = Number(customCancelFee);
            if (isNaN(parsed) || parsed < 0 || parsed > (selectedCancelBooking.price || 0)) {
                toast.error("Please enter a valid cancellation fee (cannot exceed booking price)");
                return;
            }
            fee = parsed;
        }
        setSubmittingCancelAction(true);
        try {
            await apiApproveCancel(selectedCancelBooking._id, fee, token);
            toast.success("Cancellation approved and fee proposed successfully!");
            setCancellationModal(false);
            setSelectedCancelBooking(null);
            setCustomCancelFee("");
            setCancelFeeOption("preset");
            load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to approve cancellation");
        }
        finally {
            setSubmittingCancelAction(false);
        }
    };
    const handleRejectCancel = async (bookingId) => {
        if (!window.confirm("Are you sure you want to reject this cancellation request? The booking status will be restored."))
            return;
        setSubmittingCancelAction(true);
        try {
            await apiRejectCancel(bookingId, token);
            toast.success("Cancellation request rejected successfully!");
            load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to reject cancellation request");
        }
        finally {
            setSubmittingCancelAction(false);
        }
    };
    const handleProcessRefund = async (bookingId) => {
        if (!window.confirm("Are you sure you want to process the refund? This will deposit the remaining amount into the user's wallet."))
            return;
        setSubmittingCancelAction(true);
        try {
            await apiProcessRefund(bookingId, token);
            toast.success("Refund processed successfully!");
            load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to process refund");
        }
        finally {
            setSubmittingCancelAction(false);
        }
    };
    return (<PageLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          {/* Header with Back Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link to="/merchant-dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2"/> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Calendar className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Assigned <span className="text-gradient">Bookings</span>
                </h1>
                <p className="text-muted-foreground text-sm">Manage your assigned bookings and track performance history</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mt-8 mb-4">
              <button onClick={() => setTab("active")} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === "active" ? "bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                Active ({activeItems.length})
              </button>
              <button onClick={() => setTab("history")} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === "history" ? "bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                History ({historyItems.length})
              </button>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
            {loading ? (<div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>) : displayItems.length === 0 ? (<div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-40"/>
                <p className="font-medium text-lg">No {tab} bookings</p>
                <p className="text-sm mt-2">Your {tab} bookings will appear here</p>
              </div>) : (<div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Service / Event</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Date/Time</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Rating</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((b) => (<tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-2 py-2.5 font-medium">
                          <div>
                            <div className="text-xs font-medium">{b.service?.name || b.event?.title || b.serviceName}</div>
                            <div className="mt-0.5">
                              {b.service ? (<span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Service</span>) : b.event ? (<span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">Event</span>) : null}
                            </div>
                            {b.service?.category && (<div className="text-[10px] text-muted-foreground mt-0.5">{b.service.category}</div>)}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <div>
                            <div className="font-medium text-xs">{b.customer?.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{b.customer?.email}</div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 max-w-[200px]">
                          {b.customerLocation && b.customerLocation.address ? (<div className="space-y-1">
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0"/>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium leading-relaxed line-clamp-2">{b.customerLocation.address}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <a href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap">
                                      Maps <ExternalLink className="h-2 w-2"/>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>) : b.event?.location ? (<div className="flex items-start gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0"/>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium leading-relaxed line-clamp-2">{b.event.location}</p>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap mt-0.5">
                                  Maps <ExternalLink className="h-2 w-2"/>
                                </a>
                              </div>
                            </div>) : (<span className="text-[10px] text-muted-foreground">No location</span>)}
                        </td>
                        <td className="px-2 py-2.5 text-muted-foreground text-[10px]">
                          <div>{new Date(b.datetime).toLocaleDateString()}</div>
                          <div>{new Date(b.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-secondary text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          {b.rating?.score ? (<div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`h-3 w-3 ${star <= b.rating.score
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground/30 fill-none"}`}/>))}
                              </div>
                              <span className="text-[10px] font-semibold">{b.rating.score}/5</span>
                            </div>) : (<span className="text-[10px] text-muted-foreground">No rating</span>)}
                          {b.rating?.comment && (<p className="text-[9px] text-muted-foreground mt-0.5 italic line-clamp-1">"{b.rating.comment}"</p>)}
                        </td>
                        <td className="px-2 py-2.5">
                          {b.status === "cancellation_requested" ? (<div className="flex items-center gap-2">
                              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 h-8 px-3 text-xs font-semibold" onClick={() => {
                        setSelectedCancelBooking(b);
                        setCancellationModal(true);
                    }}>
                                Approve Cancel
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10 h-8 px-3 text-xs font-semibold" onClick={() => handleRejectCancel(b._id)}>
                                Reject Cancel
                              </Button>
                            </div>) : b.status === "refund_pending" ? (<Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700 h-8 px-3 text-xs font-semibold" onClick={() => handleProcessRefund(b._id)}>
                              Process Refund ({formatCurrency(b.price - (b.cancellationFee || 0))})
                            </Button>) : b.status === "cancellation_fee_proposed" ? (<span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 italic">
                              Fee proposed, awaiting customer...
                            </span>) : b.status === "refunded" ? (<span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 italic">
                              Refunded {formatCurrency(b.refundAmount || 0)}
                            </span>) : b.service && b.status === "pending_approval" ? (<div className="flex items-center gap-2">
                              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 h-8 px-3" onClick={() => setApprovalOptions({ id: b._id, show: true })} disabled={approving === b._id}>
                                <Check className="h-4 w-4 mr-1"/> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => handleReject(b._id)}>
                                <X className="h-4 w-4 mr-1"/> Reject
                              </Button>
                            </div>) : b.status !== "completed" && b.status !== "cancelled" && b.service ? (<DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8">Update Status</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(() => {
                        const options = [];
                        // If not paid, show pre-payment options
                        if (b.status !== "paid" && b.status !== "processing" && b.status !== "completed") {
                            options.push({ status: "pending_approval", label: "Pending Approval", color: "text-orange-500" }, { status: "approved", label: "Approved", color: "text-blue-500" }, { status: "awaiting_payment", label: "Awaiting Payment", color: "text-indigo-500" });
                        }
                        // Always show post-payment/general options if not completed
                        options.push({ status: "paid", label: "Paid", color: "text-emerald-500" }, { status: "accepted", label: "Accepted", color: "text-cyan-500" }, { status: "processing", label: "Processing", color: "text-orange-500" }, { status: "completed", label: "Completed", color: "text-green-500" }, { status: "cancelled", label: "Cancelled", color: "text-red-500" });
                        return options.map(({ status, label, color }) => (<DropdownMenuItem key={status} className={`${color} cursor-pointer font-medium`} onClick={() => handleUpdateStatus(b._id, status)} disabled={b.status === status}>
                                      {label}
                                    </DropdownMenuItem>));
                    })()}
                              </DropdownMenuContent>
                            </DropdownMenu>) : (<span className="text-xs text-muted-foreground italic capitalize">{b.status}</span>)}
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>)}
          </motion.div>
        </div>
      </section>

      {/* Approval Options Modal */}
      {approvalOptions.show && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-xl font-bold mb-4 text-center">Approve Service</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Choose the payment requirement for this service booking:
            </p>
            
            <div className="space-y-3">
              {/* 30% Advance */}
              <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all duration-200 group" onClick={() => { setShowCustomInput(false); handleApprove(approvalOptions.id, "advance"); }} disabled={approving === approvalOptions.id}>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                  <CreditCard className="w-5 h-5 text-orange-400"/>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-orange-400">Require 30% Advance</p>
                  <p className="text-xs text-orange-400/70">Customer pays 30% now to confirm, remaining 70% after service.</p>
                </div>
              </button>

              {/* Custom Advance Amount */}
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 overflow-hidden">
                <button className="w-full flex items-center gap-4 p-4 hover:bg-yellow-500/20 transition-all duration-200 group" onClick={() => { setShowCustomInput(!showCustomInput); setCustomAdvance(""); }} disabled={approving === approvalOptions.id}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                    <CreditCard className="w-5 h-5 text-yellow-400"/>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-yellow-400">Custom Advance Amount</p>
                    <p className="text-xs text-yellow-400/70">Set a specific advance amount for the customer to pay.</p>
                  </div>
                  <span className="text-yellow-400 text-lg">{showCustomInput ? "▲" : "▼"}</span>
                </button>
                {showCustomInput && (<div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold text-lg">₹</span>
                      <input type="number" min="1" placeholder="Enter advance amount" value={customAdvance} onChange={(e) => setCustomAdvance(e.target.value)} className="flex-1 bg-background border border-yellow-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"/>
                    </div>
                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" disabled={!customAdvance || Number(customAdvance) <= 0 || approving === approvalOptions.id} onClick={() => handleApprove(approvalOptions.id, "advance", Number(customAdvance))}>
                      Confirm {formatCurrency(customAdvance || "0")} Advance
                    </Button>
                  </div>)}
              </div>

              {/* Full Payment */}
              <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all duration-200 group" onClick={() => { setShowCustomInput(false); handleApprove(approvalOptions.id, "full"); }} disabled={approving === approvalOptions.id}>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                  <Check className="w-5 h-5 text-green-400"/>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-green-400">Require Full Payment</p>
                  <p className="text-xs text-green-400/70">Customer pays 100% now to confirm the booking.</p>
                </div>
              </button>
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={() => { setApprovalOptions({ id: "", show: false }); setShowCustomInput(false); setCustomAdvance(""); }} disabled={approving === approvalOptions.id}>
                Cancel
              </Button>
            </div>
          </div>
        </div>)}
      {/* Approve Cancellation Modal */}
      {cancellationModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-xl font-bold mb-2 text-center text-amber-500">Approve Cancellation</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Specify a cancellation fee for this booking. The remaining amount will be refunded to the customer once they accept.
            </p>
            <form onSubmit={handleApproveCancelSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Booking Price: <span className="font-bold text-foreground">{formatCurrency(selectedCancelBooking?.price || 0)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Cancellation Fee Policy</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="cancelFeeOption" checked={cancelFeeOption === "preset"} onChange={() => setCancelFeeOption("preset")} className="accent-primary"/>
                    Standard 30% Fee ({formatCurrency(Math.round((selectedCancelBooking?.price || 0) * 0.3))})
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="cancelFeeOption" checked={cancelFeeOption === "custom"} onChange={() => setCancelFeeOption("custom")} className="accent-primary"/>
                    Custom Cancellation Fee
                  </label>
                </div>
              </div>

              {cancelFeeOption === "custom" && (<div>
                  <label className="text-xs font-semibold block mb-1">Custom Fee Amount</label>
                  <input type="number" min="0" max={selectedCancelBooking?.price || 0} step="any" placeholder="Enter fee amount..." value={customCancelFee} onChange={e => setCustomCancelFee(e.target.value)} required className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"/>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cannot exceed the booking price.
                  </p>
                </div>)}

              <div className="p-3 bg-secondary rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Original Price:</span>
                  <span>{formatCurrency(selectedCancelBooking?.price || 0)}</span>
                </div>
                <div className="flex justify-between font-medium text-red-500">
                  <span>Cancellation Fee:</span>
                  <span>
                    {formatCurrency(cancelFeeOption === "preset"
                ? Math.round((selectedCancelBooking?.price || 0) * 0.3)
                : Number(customCancelFee) || 0)}
                  </span>
                </div>
                <div className="border-t border-border my-1"/>
                <div className="flex justify-between font-bold text-green-500">
                  <span>Estimated Customer Refund:</span>
                  <span>
                    {formatCurrency(Math.max(0, (selectedCancelBooking?.price || 0) -
                (cancelFeeOption === "preset"
                    ? Math.round((selectedCancelBooking?.price || 0) * 0.3)
                    : Number(customCancelFee) || 0)))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <Button type="button" variant="outline" onClick={() => setCancellationModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCancelAction} className="bg-gradient-primary text-white">
                  {submittingCancelAction ? "Approving..." : "Approve Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>)}
    </PageLayout>);
};
export default MerchantBookings;
