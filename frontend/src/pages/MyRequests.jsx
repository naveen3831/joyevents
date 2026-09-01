import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Ticket, AlertCircle, Star, FileText, CreditCard, Sparkles, CheckCircle2, Clock, IndianRupee, MoreHorizontal } from "lucide-react";
import QRCode from "qrcode";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMyBookings, apiSubmitRating, apiRequestCancel, apiAcceptCancellationFee, apiGetMyCustomServiceRequests, apiPayCustomServiceQuote } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SimplePayment from "@/components/SimplePayment";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_BADGE = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    pending_approval: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    approved: "bg-green-500/15 text-green-400 border border-green-500/30",
    awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold",
    assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
    completed: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
    awaiting_final_payment: "bg-pink-500/15 text-pink-400 border border-pink-500/30 font-bold",
    cancellation_requested: "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold animate-pulse",
    cancellation_fee_proposed: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold animate-pulse",
    refund_pending: "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold",
    refunded: "bg-red-500/15 text-red-400 border border-red-500/30 font-bold",
};

const MyRequests = () => {
    const { token, user } = useAuth();
    const STATUS_CLASS = "w-[132px] min-w-[132px] h-[34px] px-3 justify-center text-center text-[11px] font-semibold whitespace-nowrap inline-flex items-center rounded-full border";
    const ACTION_BTN_CLASS = "h-[38px] min-h-[38px] text-[11px] font-bold rounded-full flex items-center justify-center whitespace-nowrap transition-all shadow-sm";
    const PRIMARY_ACTION_CLASS = `${ACTION_BTN_CLASS} w-[108px] min-w-[108px] px-0`;
    const MORE_ACTION_CLASS = `${ACTION_BTN_CLASS} w-[38px] min-w-[38px] p-0`;
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get("tab") === "custom" ? "custom" : "bookings";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [bookingSubFilter, setBookingSubFilter] = useState("all");
    const [items, setItems] = useState([]);
    const [customRequests, setCustomRequests] = useState([]);
    const [loadingCustom, setLoadingCustom] = useState(false);

    // Rating modal
    const [ratingModal, setRatingModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);

    // Payment modal for bookings
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);

    // Custom quote payment state
    const [selectedCustomForPay, setSelectedCustomForPay] = useState(null);
    const [showCustomPayModal, setShowCustomPayModal] = useState(false);

    const handleRequestCancel = async (bookingId) => {
        if (!window.confirm("Are you sure you want to request cancellation for this booking?"))
            return;
        setCancellingId(bookingId);
        try {
            await apiRequestCancel(bookingId, token);
            toast.success("Cancellation request submitted successfully!");
            load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to submit cancellation request");
        }
        finally {
            setCancellingId(null);
        }
    };

    const handleAcceptCancellationFee = async (bookingId) => {
        if (!window.confirm("Do you agree to the proposed cancellation fee and want to proceed to refund?"))
            return;
        setCancellingId(bookingId);
        try {
            await apiAcceptCancellationFee(bookingId, token);
            toast.success("Cancellation fee accepted! Refund processing initiated.");
            load();
        }
        catch (e) {
            toast.error(e?.message || "Failed to accept cancellation fee");
        }
        finally {
            setCancellingId(null);
        }
    };

    const load = async () => {
        if (!token)
            return;
        try {
            const res = await apiMyBookings(token);
            const sorted = (res.bookings || []).sort((a, b) => {
                const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
                const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
                return dateB - dateA;
            });
            setItems(sorted);
        } catch (e) {}
    };

    const loadCustom = async () => {
        if (!token)
            return;
        setLoadingCustom(true);
        try {
            const res = await apiGetMyCustomServiceRequests(token);
            setCustomRequests(res.requests || []);
        } catch (e) {
        } finally {
            setLoadingCustom(false);
        }
    };

    const filteredBookings = useMemo(() => {
        if (bookingSubFilter === "upcoming") {
            return items.filter(b => ["pending", "confirmed", "paid", "assigned", "pending_approval", "awaiting_payment", "cancellation_requested", "cancellation_fee_proposed"].includes(b.status));
        }
        if (bookingSubFilter === "history") {
            return items.filter(b => ["completed", "cancelled", "refunded"].includes(b.status));
        }
        return items;
    }, [items, bookingSubFilter]);

    useEffect(() => {
        load();
        loadCustom();
    }, [token]);

    useRealtimeEvent("realtime:booking-update", () => {
        load();
    });

    useRealtimeEvent("realtime:custom-service-update", () => {
        loadCustom();
        load();
    });

    const handlePaymentSuccess = async (updatedBooking) => {
        setShowPaymentModal(false);
        setPaymentBooking(null);
        load();
    };

    const handleCustomPaySuccess = async (paymentDetails) => {
        if (!selectedCustomForPay || !token) return;
        try {
            await apiPayCustomServiceQuote(
                selectedCustomForPay._id,
                {
                    paymentMethod: paymentDetails?.paymentMethod || "card",
                    paymentId: paymentDetails?.paymentId || `PAY-${Date.now()}`
                },
                token
            );
            toast.success("✨ Payment complete! Your custom service booking is confirmed.");
            setShowCustomPayModal(false);
            setSelectedCustomForPay(null);
            loadCustom();
            load();
        } catch (err) {
            toast.error(err?.message || "Payment processing failed.");
        }
    };

    const openPaymentModal = (booking) => {
        setPaymentBooking(booking);
        setShowPaymentModal(true);
    };

    const handleSubmitRating = async () => {
        if (!selectedBooking)
            return;
        setSubmittingRating(true);
        try {
            await apiSubmitRating(selectedBooking._id, ratingScore, ratingComment, token);
            toast.success("Rating submitted successfully!");
            setItems(items.map(item => item._id === selectedBooking._id
                ? { ...item, rating: { score: ratingScore, comment: ratingComment, ratedAt: new Date() } }
                : item));
            setRatingModal(false);
            setRatingScore(5);
            setRatingComment("");
            setSelectedBooking(null);
        }
        catch (error) {
            toast.error(error.message || "Failed to submit rating");
        }
        finally {
            setSubmittingRating(false);
        }
    };

    const openRatingModal = (booking) => {
        setSelectedBooking(booking);
        setRatingScore(booking.rating?.score || 5);
        setRatingComment(booking.rating?.comment || "");
        setRatingModal(true);
    };

    const downloadInvoice = (b) => {
        const customerName = user?.name || "Customer";
        const customerEmail = user?.email || "";
        const invoiceNo = `INV-${b._id?.slice(-8).toUpperCase()}`;
        const isEvent = !!b.event;
        const serviceName = b.event?.title || b.serviceName || "Service";
        const bookingDate = new Date(b.datetime).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
        const issuedDate = new Date(b.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
        
        const lineItems = [];
        lineItems.push({ desc: `${serviceName}`, qty: b.quantity || 1, unit: b.price });

        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoiceNo}</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .header { font-size: 24px; font-weight: bold; color: #667eea; }
    .box { border: 1px solid #ccc; padding: 15px; margin-top: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <div className="header">EVENTOZA INVOICE</div>
  <p>Invoice No: <strong>${invoiceNo}</strong></p>
  <p>Customer: ${customerName} (${customerEmail})</p>
  <p>Date: ${issuedDate}</p>
  <div className="box">
    <p>Service: <strong>${serviceName}</strong></p>
    <p>Amount Paid: <strong>${formatCurrency(b.price)}</strong></p>
    <p>Booking Date: ${bookingDate}</p>
  </div>
</body>
</html>`;
        const win = window.open("", "_blank");
        if (win) {
            win.document.write(invoiceHTML);
            win.document.close();
        }
    };

    const downloadTicket = (b) => {
        const ticketId = b.ticketId || `TKT-${b._id?.slice(-8).toUpperCase() || 'PASS'}`;
        const eventTitle = b.event?.title || b.eventName || b.serviceName || "Event Ticket";
        const eventDate = b.datetime ? new Date(b.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "N/A";
        const eventTime = b.datetime ? new Date(b.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "N/A";
        const location = b.event?.location || b.customerLocation?.address || "Venue TBA";
        const pricePaid = formatCurrency(b.price || 0);
        const customerName = user?.name || "Customer";
        const eventImage = b.event?.image ? (b.event.image.startsWith('http') ? b.event.image : `${API_URL}${b.event.image}`) : '';
        const qrData = encodeURIComponent(`${ticketId}|${eventTitle}|${b.price}`);

        const ticketHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${eventTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Roboto, sans-serif; background: #0f172a; padding: 20px; color: #fff; display: flex; justify-content: center; }
    .ticket { width: 100%; max-width: 500px; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .ticket-header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 20px; text-align: center; }
    .ticket-header h1 { font-size: 24px; font-weight: 800; letter-spacing: 1px; }
    .ticket-header p { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    ${eventImage ? `.event-image { width: 100%; height: 200px; object-fit: cover; }` : ''}
    .ticket-body { padding: 20px; }
    .event-name { font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #334155; border-radius: 10px; margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #94a3b8; }
    .info-value { color: #f8fafc; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 16px; background: #10b981; color: white; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
    .footer { background: #0f172a; padding: 20px; text-align: center; border-top: 2px dashed #334155; }
    .ticket-id { font-family: monospace; font-size: 18px; font-weight: 700; color: #a855f7; letter-spacing: 2px; margin-top: 6px; }
    .qr-img { width: 150px; height: 150px; border-radius: 12px; padding: 8px; background: white; margin: 12px auto; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 OFFICIAL EVENT TICKET</h1>
      <p>EVENTOZA CONFIRMED PASS</p>
    </div>
    ${eventImage ? `<img src="${eventImage}" class="event-image" alt="Event Cover"/>` : ''}
    <div class="ticket-body">
      <div class="event-name">${eventTitle}</div>
      <div class="info-row"><span class="info-label">👤 Attendee</span><span class="info-value">${customerName}</span></div>
      <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${eventDate}</span></div>
      <div class="info-row"><span class="info-label">⏰ Time</span><span class="info-value">${eventTime}</span></div>
      <div class="info-row"><span class="info-label">📍 Venue</span><span class="info-value">${location}</span></div>
      <div class="info-row"><span class="info-label">💳 Amount Paid</span><span class="info-value">${pricePaid}</span></div>
      <div style="text-align: center;">
        <span class="badge">✓ CONFIRMED PASS</span>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 11px; color: #94a3b8;">TICKET VERIFICATION CODE</div>
      <div class="ticket-id">${ticketId}</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}" class="qr-img" alt="QR Code"/>
      <p style="font-size: 11px; color: #64748b;">Show this QR code at event entry</p>
    </div>
  </div>
</body>
</html>`;
        const blob = new Blob([ticketHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ticket_${ticketId}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (<CustomerLayout>
      <section className="py-2 sm:py-6">
        <div className="w-full space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Ticket className="h-5 w-5"/>
                </div>
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    My <span className="text-gradient">Bookings & Enquiries</span>
                  </h1>
                  <p className="text-muted-foreground text-sm">View your booking requests, custom service enquiries, and quotations</p>
                </div>
              </div>

              <Button onClick={() => navigate("/customer-dashboard/request-custom-service")} className="bg-gradient-primary text-white font-semibold shadow-glow min-h-[42px] rounded-xl px-5">
                <Sparkles className="h-4 w-4 mr-2" /> Request Custom Service
              </Button>
            </div>

            {/* Level 1 Primary Tabs */}
            <div className="flex items-center gap-3 border-b border-border/70 pb-3 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("bookings")}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "bookings"
                    ? "bg-gradient-primary text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>Standard Bookings</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "bookings"
                      ? "bg-white/20 text-white"
                      : "bg-background/80 text-muted-foreground border border-border/50"
                  }`}
                >
                  {items.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "custom"
                    ? "bg-gradient-primary text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>✨ Custom Service Enquiries</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "custom"
                      ? "bg-white/20 text-white"
                      : "bg-background/80 text-muted-foreground border border-border/50"
                  }`}
                >
                  {customRequests.length}
                </span>
              </button>
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.1 }} className="mb-6 sm:mb-8 mt-3">
            {activeTab === "bookings" ? (
              <div className="space-y-3">
                {/* Level 2 Secondary Segmented Control */}
                {items.length > 0 && (
                  <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/60 gap-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setBookingSubFilter("all")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        bookingSubFilter === "all"
                          ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <span>All</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                          bookingSubFilter === "all"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {items.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingSubFilter("upcoming")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        bookingSubFilter === "upcoming"
                          ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <span>Upcoming</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                          bookingSubFilter === "upcoming"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {items.filter(b => ["pending", "confirmed", "paid", "assigned", "pending_approval", "awaiting_payment", "cancellation_requested", "cancellation_fee_proposed"].includes(b.status)).length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingSubFilter("history")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        bookingSubFilter === "history"
                          ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <span>History</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                          bookingSubFilter === "history"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {items.filter(b => ["completed", "cancelled", "refunded"].includes(b.status)).length}
                      </span>
                    </button>
                  </div>
                )}

                {filteredBookings.length === 0 ? (
                  <TableEmptyState title={`No ${bookingSubFilter} bookings found`} description="Your booking requests will appear here." colSpan={6} />
                ) : (
                  <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
                    <DataTable minWidth="100%">
                      <TableHeader>
                        <TableHeaderCell width="26%" className="pl-5 sm:pl-6 pr-3">BOOKING / SERVICE</TableHeaderCell>
                        <TableHeaderCell width="14%" className="px-3">AMOUNT</TableHeaderCell>
                        <TableHeaderCell width="18%" className="px-3">DATE & TIME</TableHeaderCell>
                        <TableHeaderCell width="18%" className="px-3">STATUS</TableHeaderCell>
                        <TableHeaderCell width="14%" className="px-3 text-center">TICKET</TableHeaderCell>
                        <TableHeaderCell width="10%" align="center" className="pr-5 sm:pr-6 pl-3">ACTIONS</TableHeaderCell>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((b) => {
                          const dateObj = b.datetime || b.createdAt ? new Date(b.datetime || b.createdAt) : null;
                          const formattedDate = dateObj && !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                            : "—";
                          const formattedTime = dateObj && !isNaN(dateObj.getTime()) && (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0)
                            ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                            : null;
                          const hasTicket = (b.event || b.ticketId || ["confirmed", "paid", "completed"].includes(b.status)) &&
                            b.status !== "awaiting_payment" && b.status !== "awaiting_final_payment" && b.status !== "cancelled";

                          return (
                            <TableRow key={b._id}>
                              {/* Booking / Service Column */}
                              <TableCell className="pl-5 sm:pl-6 pr-3 py-3.5 align-middle">
                                <div className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[210px]" title={b.event?.title || b.serviceName}>
                                  {b.event?.title || b.serviceName}
                                </div>
                                <div className="mt-0.5">
                                  {b.event ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                      Event
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                      Service
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Amount Column */}
                              <TableCell className="px-3 py-3.5 align-middle text-xs sm:text-sm font-bold text-foreground">
                                {formatCurrency(b.price || 0)}
                              </TableCell>

                              {/* Date & Time Column */}
                              <TableCell className="px-3 py-3.5 align-middle text-xs whitespace-nowrap">
                                <div className="font-semibold text-foreground">{formattedDate}</div>
                                {formattedTime && <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{formattedTime}</div>}
                              </TableCell>

                              {/* Status Badge Column */}
                              <TableCell className="px-3 py-3.5 align-middle">
                                <StatusBadge status={b.status} className="h-[28px] min-w-[96px] max-w-[120px] px-2.5 justify-center text-center text-[11px] font-semibold" />
                              </TableCell>

                              {/* Ticket Column */}
                              <TableCell className="px-3 py-3.5 align-middle text-center">
                                {hasTicket ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-[11px] font-semibold rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-1.5 flex items-center justify-center mx-auto cursor-pointer shadow-xs"
                                    onClick={() => navigate(`/customer-dashboard/bookings/${b._id}/ticket`, { state: { booking: b } })}
                                  >
                                    <Ticket className="h-3.5 w-3.5 shrink-0" /> Ticket
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-normal block text-center">—</span>
                                )}
                              </TableCell>

                              {/* Actions Column */}
                              <TableCell className="pr-5 sm:pr-6 pl-3 py-3.5 align-middle text-center">
                                <div className="flex items-center justify-center">
                                  {b.status === "awaiting_payment" || b.status === "awaiting_final_payment" ? (
                                    <Button
                                      size="sm"
                                      className="h-8 px-3 text-[11px] font-bold rounded-xl bg-gradient-primary text-white hover:opacity-90 gap-1.5 flex items-center justify-center shadow-xs animate-pulse cursor-pointer whitespace-nowrap"
                                      onClick={() => openPaymentModal(b)}
                                    >
                                      <CreditCard className="h-3.5 w-3.5 shrink-0" /> Pay Now
                                    </Button>
                                  ) : (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0 rounded-xl border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer flex items-center justify-center"
                                        >
                                          <MoreHorizontal className="h-4 w-4 shrink-0" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 text-xs font-semibold p-1">
                                        {b.status === "completed" && (
                                          <>
                                            <DropdownMenuItem
                                              className="cursor-pointer flex items-center gap-2"
                                              onClick={() => downloadInvoice(b)}
                                            >
                                              <FileText className="h-3.5 w-3.5" /> View Invoice
                                            </DropdownMenuItem>
                                            {!b.rating?.score && (
                                              <DropdownMenuItem
                                                className="cursor-pointer flex items-center gap-2 text-amber-500 hover:text-amber-600"
                                                onClick={() => openRatingModal(b)}
                                              >
                                                <Star className="h-3.5 w-3.5" /> Rate Experience
                                              </DropdownMenuItem>
                                            )}
                                          </>
                                        )}
                                        {b.status === "cancellation_fee_proposed" && (
                                          <DropdownMenuItem
                                            className="cursor-pointer flex items-center gap-2 text-indigo-500 font-bold"
                                            onClick={() => handleAcceptCancellationFee(b._id)}
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept Cancellation Fee
                                          </DropdownMenuItem>
                                        )}
                                        {["pending", "confirmed", "paid", "assigned"].includes(b.status) && (
                                          <DropdownMenuItem
                                            className="cursor-pointer flex items-center gap-2 text-red-500 hover:text-red-600"
                                            onClick={() => handleRequestCancel(b._id)}
                                          >
                                            <AlertCircle className="h-3.5 w-3.5" /> Request Cancel
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          className="cursor-pointer flex items-center gap-2"
                                          onClick={() => {
                                            const returnTo = "/customer-dashboard/bookings";
                                            const params = new URLSearchParams({
                                              title: b.event?.title || b.serviceName || "Booking Inquiry",
                                              bookingId: b._id,
                                              returnTo,
                                            });
                                            if (b.event?.createdBy?._id || b.merchantId) {
                                              params.set("merchantId", b.event?.createdBy?._id || b.merchantId);
                                            }
                                            navigate(`/customer-dashboard/contact-organiser?${params.toString()}`);
                                          }}
                                        >
                                          Contact Organiser
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </DataTable>
                    <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-border/70 text-xs text-muted-foreground">
                      <span>Showing {filteredBookings.length} of {items.length} bookings</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Custom Service Enquiries Tab */
              customRequests.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary opacity-40 animate-pulse"/>
                  <p className="font-medium text-lg text-foreground">No Custom Service Enquiries Yet</p>
                  <p className="text-sm mt-1 text-muted-foreground">Can't find a service on Eventoza? Submit a custom service request!</p>
                  <Button onClick={() => navigate("/customer-dashboard/request-custom-service")} className="mt-4 bg-gradient-primary text-white font-semibold">
                    <Sparkles className="h-4 w-4 mr-1.5" /> Submit Custom Service Request
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customRequests.map((r) => (
                    <div key={r._id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-display font-bold text-base text-foreground">{r.serviceTitle}</h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            r.status === "paid" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            r.status === "quoted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            r.status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 animate-pulse"
                          }`}>
                            {r.status === "paid" ? "Paid & Confirmed" :
                             r.status === "quoted" ? "Quotation Received" :
                             r.status === "rejected" ? "Declined" :
                             "Pending Review"}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-muted-foreground mb-3">
                          <p><strong>Category:</strong> {r.category}</p>
                          <p><strong>Event Date:</strong> 📅 {new Date(r.eventDate).toLocaleDateString()}</p>
                          <p><strong>Location:</strong> 📍 {r.location}</p>
                          <p><strong>Count / Quantity:</strong> 👥 {r.quantity || 1}</p>
                          {r.budget > 0 && <p><strong>Estimated Budget:</strong> {formatCurrency(r.budget)}</p>}
                          <p className="pt-1 italic">"{r.description}"</p>
                        </div>
                      </div>

                      {/* Quotation or Rejection Box */}
                      <div className="pt-3 border-t border-border mt-2">
                        {r.status === "pending" && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1.5">
                            <Clock className="h-4 w-4" /> Admin is reviewing your requirements and preparing a quotation.
                          </p>
                        )}

                        {r.status === "quoted" && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">Quotation Amount: {formatCurrency(r.quotationAmount)}</span>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomForPay(r);
                                  setShowCustomPayModal(true);
                                }}
                                className="w-full sm:w-auto min-h-[36px] bg-gradient-primary text-white font-bold shrink-0"
                              >
                                Accept & Pay Quote
                              </Button>
                            </div>
                            {r.quotationNote && (
                              <p className="text-muted-foreground italic border-t border-blue-500/20 pt-1.5">
                                💬 <strong>Admin Note:</strong> "{r.quotationNote}"
                              </p>
                            )}
                          </div>
                        )}

                        {r.status === "rejected" && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 space-y-1">
                            <p className="font-semibold">❌ Request Declined</p>
                            <p className="italic">"{r.rejectionReason || "Service cannot be fulfilled."}"</p>
                          </div>
                        )}

                        {r.status === "paid" && (
                          <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Quotation Accepted ({formatCurrency(r.quotationAmount)} Paid). Booking Confirmed!
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </motion.div>
        </div>

        {/* Rating Modal */}
        <Dialog open={ratingModal} onOpenChange={setRatingModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500"/>
                Rate Your Experience
              </DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Event/Service</p>
                  <p className="font-semibold">{selectedBooking.event?.title || selectedBooking.serviceName}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Rating</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRatingScore(star)}>
                        <Star className={`h-8 w-8 ${star <= ratingScore ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}/>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea placeholder="Share your experience..." value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}/>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setRatingModal(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1 bg-gradient-primary text-white">
                    {submittingRating ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Standard Booking Payment Modal */}
        {paymentBooking && (() => {
          const { amount, paymentType } = (() => {
            if (paymentBooking.status === "awaiting_final_payment") {
              return { amount: paymentBooking.remainingAmount || 0, paymentType: "remaining" };
            }
            if (paymentBooking.status === "awaiting_payment" && paymentBooking.paymentType === "advance" && !paymentBooking.isAdvancePaid) {
              return { amount: paymentBooking.advanceAmount || 0, paymentType: "advance" };
            }
            return { amount: paymentBooking.price || 0, paymentType: "full" };
          })();
          return (
            <Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
              <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display font-bold">Complete Payment</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <SimplePayment 
                    amount={amount} 
                    bookingId={paymentBooking._id} 
                    bookingData={{ paymentType }}
                    onSuccess={handlePaymentSuccess} 
                    onClose={() => setShowPaymentModal(false)}
                  />
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Custom Quote Payment Modal */}
        {selectedCustomForPay && (
          <Dialog open={showCustomPayModal} onOpenChange={setShowCustomPayModal}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Pay Custom Service Quotation
                </DialogTitle>
                <DialogDescription>
                  Confirm payment of {formatCurrency(selectedCustomForPay.quotationAmount)} for "{selectedCustomForPay.serviceTitle}".
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <SimplePayment
                  amount={selectedCustomForPay.quotationAmount}
                  isCustomPay={true}
                  onSuccess={handleCustomPaySuccess}
                  onClose={() => {
                    setShowCustomPayModal(false);
                    setSelectedCustomForPay(null);
                  }}
                  bookingData={{
                    serviceName: `Custom: ${selectedCustomForPay.serviceTitle}`,
                    date: new Date(selectedCustomForPay.eventDate).toISOString().split('T')[0],
                    time: "10:00",
                    paymentType: "full"
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </section>
    </CustomerLayout>);
};
export default MyRequests;
