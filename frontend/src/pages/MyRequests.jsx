import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Ticket, AlertCircle, Star, FileText, CreditCard } from "lucide-react";
import QRCode from "qrcode";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMyBookings, apiSubmitRating, apiRequestCancel, apiAcceptCancellationFee } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SimplePayment from "@/components/SimplePayment";
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
    const [items, setItems] = useState([]);
    const [ratingModal, setRatingModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);
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
        const res = await apiMyBookings(token);
        const sorted = (res.bookings || []).sort((a, b) => {
            const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
            const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
            return dateB - dateA;
        });
        setItems(sorted);
    };
    useEffect(() => {
        load();
    }, [token]);
    const handlePaymentSuccess = async (updatedBooking) => {
        setShowPaymentModal(false);
        setPaymentBooking(null);
        load();
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
            // Update the booking in the list
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
        const bookingTime = new Date(b.datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const issuedDate = new Date(b.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
        const completedDate = b.completedAt ? new Date(b.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
        const merchantName = b.assignedTo?.name || "Eventoza Team";
        const merchantEmail = b.assignedTo?.email || "";
        const location = b.event?.location || b.customerLocation?.address || "—";
        const paymentMethod = b.paymentMethod === "upi" ? `UPI${b.upiId ? ` (${b.upiId})` : ""}` : b.paymentMethod === "card" ? `Card${b.cardLast4 ? ` ····${b.cardLast4}` : ""}${b.cardholderName ? ` · ${b.cardholderName}` : ""}` : "CARD";
        const paymentId = b.paymentId || "—";
        const ticketId = b.ticketId || "";
        const session = b.selectedSession ? `${b.selectedSession.charAt(0).toUpperCase() + b.selectedSession.slice(1)} Session` : "";
        const category = b.event?.category || b.service?.category || "";
        const rating = b.rating?.score ? `${b.rating.score}/5 ⭐${b.rating.comment ? ` — "${b.rating.comment}"` : ""}` : "";
        // Build line items: base service/event
        const lineItems = [];
        if (isEvent && b.selectedTickets && Object.keys(b.selectedTickets).length > 0) {
            for (const [type, qty] of Object.entries(b.selectedTickets)) {
                if (Number(qty) > 0) {
                    const ticket = b.event?.tickets?.find((t) => t.type === type);
                    const unitPrice = ticket?.price || 0;
                    const emoji = type === "silver" ? "🥈" : type === "gold" ? "🥇" : type === "diamond" ? "💎" : "🎫";
                    lineItems.push({ desc: `${serviceName}${session ? ` (${session})` : ""} — ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`, qty: Number(qty), unit: unitPrice });
                }
            }
        }
        else {
            lineItems.push({ desc: `${serviceName}${session ? ` (${session})` : ""}`, qty: b.quantity || 1, unit: 0, note: "base" });
        }
        // Add-ons as separate line items
        const addOns = b.addOns || [];
        for (const addon of addOns) {
            lineItems.push({ desc: `  ↳ Add-on: ${addon.name}`, qty: 1, unit: Number(addon.price) });
        }
        // Calculate subtotal from ticket lines + addons
        const addOnTotal = addOns.reduce((s, a) => s + Number(a.price), 0);
        const discount = b.promoCode?.discountAmount || 0;
        // Calculate actual amount paid (handle advance payment scenarios)
        let total = b.price;
        let paidNote = "";
        if (b.paymentType === "advance") {
            if (b.isRemainingPaid) {
                total = b.price; // fully paid
                paidNote = `Full payment (Advance ${formatCurrency(b.advanceAmount)} + Remaining ${formatCurrency(b.remainingAmount)})`;
            }
            else if (b.isAdvancePaid) {
                total = b.advanceAmount || b.price; // only advance paid
                paidNote = `Advance payment only (Remaining ${formatCurrency(b.remainingAmount)} due)`;
            }
            else {
                total = b.price;
            }
        }
        // For base-only (non-ticketed), derive base price
        const basePrice = total + discount - addOnTotal;
        // Fix the base line item unit price
        if (lineItems[0]?.note === "base") {
            lineItems[0].unit = basePrice / (lineItems[0].qty || 1);
            delete lineItems[0].note;
        }
        const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unit, 0);
        const rowsHTML = lineItems.map((l, i) => `
      <tr style="${i % 2 === 0 ? "background:#fafafa;" : ""}">
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;${l.desc.startsWith("  ↳") ? "color:#7c3aed;font-style:italic;padding-left:28px;" : "font-weight:500;"}">${l.desc.replace("  ↳", "↳")}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${l.qty}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency(l.unit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatCurrency((l.qty * l.unit), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`).join("");
        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Poppins',sans-serif;background:#f4f6f9;padding:30px;color:#333;}
  .page{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12);}
  .header{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:36px 40px;display:flex;justify-content:space-between;align-items:flex-start;}
  .brand{font-size:28px;font-weight:800;letter-spacing:-0.5px;}
  .brand span{font-size:13px;font-weight:400;opacity:.8;display:block;margin-top:4px;}
  .inv-meta{text-align:right;}
  .inv-meta h2{font-size:22px;font-weight:700;letter-spacing:1px;}
  .inv-meta p{font-size:12px;opacity:.85;margin-top:3px;}
  .status-pill{display:inline-block;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.4);border-radius:20px;padding:3px 14px;font-size:11px;font-weight:700;text-transform:uppercase;margin-top:8px;letter-spacing:.5px;}
  .body{padding:36px 40px;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #f0f0f0;}
  .party h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px;}
  .party .name{font-weight:700;font-size:15px;color:#111;margin-bottom:3px;}
  .party p{font-size:13px;line-height:1.6;color:#6b7280;}
  .section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px;margin-top:24px;}
  .booking-info{background:#f9fafb;border-radius:8px;padding:16px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .info-item label{font-size:10px;color:#9ca3af;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px;}
  .info-item span{font-size:13px;font-weight:600;color:#111;word-break:break-all;}
  table{width:100%;border-collapse:collapse;margin-top:10px;}
  thead tr{background:#f3f4f6;}
  thead th{padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600;}
  thead th:nth-child(2){text-align:center;}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right;}
  .totals{margin-left:auto;width:280px;margin-top:16px;}
  .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#374151;border-bottom:1px solid #f5f5f5;}
  .totals-row.addon{color:#7c3aed;font-size:13px;}
  .totals-row.discount{color:#10b981;}
  .totals-row.total{border-top:2px solid #7c3aed;border-bottom:none;margin-top:8px;padding-top:12px;font-weight:800;font-size:17px;color:#7c3aed;}
  .payment-box{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px 20px;margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .payment-box .label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
  .payment-box .value{font-size:13px;font-weight:600;color:#111;word-break:break-all;}
  .rating-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px;color:#92400e;}
  .footer{background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;font-size:11px;color:#9ca3af;line-height:1.9;}
  @media print{body{background:#fff;padding:0;}.page{box-shadow:none;border-radius:0;}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">🎉 Eventoza<span>Premium Event Services Platform</span></div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <p>${invoiceNo}</p>
      <p>Issued: ${issuedDate}</p>
      ${completedDate !== "—" ? `<p>Completed: ${completedDate}</p>` : ""}
      <div class="status-pill">✓ ${b.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="body">
    <div class="parties">
      <div class="party">
        <h4>Billed To</h4>
        <div class="name">${customerName}</div>
        ${customerEmail ? `<p>${customerEmail}</p>` : ""}
      </div>
      <div class="party">
        <h4>Service Provider</h4>
        <div class="name">${merchantName}</div>
        ${merchantEmail ? `<p>${merchantEmail}</p>` : ""}
        <p>Eventoza Platform</p>
      </div>
    </div>

    <div class="section-title">Booking Details</div>
    <div class="booking-info">
      <div class="info-item"><label>Date</label><span>${bookingDate}</span></div>
      <div class="info-item"><label>Time</label><span>${bookingTime}</span></div>
      <div class="info-item"><label>Type</label><span>${isEvent ? "Event Booking" : "Service Booking"}</span></div>
      <div class="info-item"><label>Location</label><span>${location}</span></div>
      <div class="info-item"><label>Payment Method</label><span>${paymentMethod}</span></div>
      ${ticketId ? `<div class="info-item"><label>Ticket ID</label><span style="font-family:monospace;font-size:11px;">${ticketId}</span></div>` : `<div class="info-item"><label>Booking ID</label><span style="font-family:monospace;font-size:11px;">${b._id?.slice(-10).toUpperCase()}</span></div>`}
      ${category ? `<div class="info-item"><label>Category</label><span>${category}</span></div>` : ""}
      ${session ? `<div class="info-item"><label>Session</label><span>${session}</span></div>` : ""}
      ${b.event?.location ? `<div class="info-item"><label>Venue</label><span>${b.event.location}</span></div>` : ""}
    </div>

    <div class="section-title">Items & Add-ons</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      ${addOnTotal > 0 ? `<div class="totals-row addon"><span>Add-ons Total</span><span>+${formatCurrency(addOnTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
      ${discount > 0 ? `<div class="totals-row discount"><span>Promo Discount${b.promoCode?.code ? ` (${b.promoCode.code})` : ""}</span><span>−${formatCurrency(discount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ""}
      <div class="totals-row total"><span>Total Paid</span><span>${formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    </div>

    <div class="payment-box">
      <div><div class="label">Payment Reference</div><div class="value">${paymentId}</div></div>
      <div><div class="label">Payment Status</div><div class="value" style="color:#10b981;">✓ Paid</div></div>
      <div><div class="label">Amount Paid</div><div class="value" style="color:#7c3aed;font-size:16px;font-weight:800;">${formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
    </div>
    ${paidNote ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;margin-top:12px;font-size:12px;color:#92400e;">ℹ️ ${paidNote}</div>` : ""}

    ${rating ? `<div class="rating-box">⭐ Your Rating: ${rating}</div>` : ""}
  </div>

  <div class="footer">
    Thank you for choosing Eventoza! &nbsp;·&nbsp; This is a computer-generated invoice — no signature required.<br>
    For support: support@eventoza.com &nbsp;·&nbsp; www.eventoza.com
  </div>
</div>
</body>
</html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceNo}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Invoice downloaded — open in browser and print as PDF.");
    };
    return (<CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          {/* Header with Back Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link to="/customer-dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2"/> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Ticket className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  My <span className="text-gradient">Bookings</span>
                </h1>
                <p className="text-muted-foreground text-sm">View all your booking requests and their status</p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} className="mb-6 sm:mb-8 mt-6 sm:mt-8">
            {items.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-30"/>
                <p className="font-medium text-lg text-muted-foreground">No bookings yet</p>
                <p className="text-sm mt-2 text-muted-foreground">Your booking requests will appear here</p>
            </div>) : (<div className="rounded-xl border border-border bg-card overflow-x-auto w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Service/Event</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Price</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Date/Time</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b) => (<tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-2 py-2.5 font-medium">
                          <div className="text-xs font-semibold">{b.event?.title || b.serviceName}</div>
                          {b.event && (<span className="block text-[10px] text-primary mt-0.5">🎫 Event</span>)}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="text-xs font-semibold">{formatCurrency(b.price)}</div>
                          {b.paymentType === "advance" && (<div className="mt-0.5 space-y-0.5 text-[10px]">
                              {b.isAdvancePaid ? (<div className="text-emerald-400">✓ Adv paid: {formatCurrency(b.advanceAmount)}</div>) : (<div className="text-orange-400">Adv due: {formatCurrency(b.advanceAmount)}</div>)}
                              {b.isAdvancePaid && !b.isRemainingPaid && (<div className="text-pink-400">Rem: {formatCurrency(b.remainingAmount)}</div>)}
                              {b.isRemainingPaid && (<div className="text-emerald-400">✓ Fully paid</div>)}
                            </div>)}
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
                          <div className="flex gap-1.5 flex-wrap items-center">
                            {/* 1. Invoice */}
                            {((b.event && (b.status === "confirmed" || b.status === "paid" || b.status === "completed")) ||
                    (!b.event && b.status === "completed")) && (<Button size="sm" variant="outline" className="gap-1 border-purple-500/40 text-purple-400 hover:bg-purple-500/10" onClick={() => downloadInvoice(b)}>
                                <FileText className="h-3.5 w-3.5"/> Invoice
                              </Button>)}

                            {/* 2. Ticket */}
                            {(b.status === "paid" || b.status === "confirmed" || b.status === "completed") && b.ticketId && b.event && (<Button size="sm" variant="outline" className="gap-1 border-primary/40 text-primary hover:bg-primary/10" onClick={async () => {
                        try {
                            const eventImage = b.event?.image ?
                                (b.event.image.startsWith('http') ? b.event.image : `${API_URL}${b.event.image}`) :
                                '';
                            // Generate QR code as inline SVG (no canvas needed, works in all browsers)
                            const qrSvg = await QRCode.toString(b.ticketId, {
                                type: "svg",
                                width: 180,
                                margin: 2,
                                color: { dark: "#667eea", light: "#ffffff" }
                            });
                            // Get customer name from user object
                            const customerName = user?.name || 'Guest';
                            // Calculate total quantity and breakdown of tickets
                            // selectedTickets may come back as a plain object or Mongoose Map
                            const rawTickets = b.selectedTickets;
                            const ticketsObj = rawTickets && typeof rawTickets === 'object'
                                ? (rawTickets instanceof Map
                                    ? Object.fromEntries(rawTickets)
                                    : rawTickets)
                                : {};
                            // Filter out zero-quantity entries
                            const filteredTickets = Object.fromEntries(Object.entries(ticketsObj).filter(([, qty]) => Number(qty) > 0));
                            let totalQuantity = b.quantity || 1;
                            let ticketBreakdown = {};
                            if (Object.keys(filteredTickets).length > 0) {
                                totalQuantity = Object.values(filteredTickets).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
                                ticketBreakdown = filteredTickets;
                            }
                            else if (b.ticketType) {
                                ticketBreakdown = { [b.ticketType]: b.quantity || 1 };
                            }
                            // Ensure totalQuantity is never 0
                            if (totalQuantity === 0)
                                totalQuantity = b.quantity || 1;
                            // Generate ticket breakdown HTML with seat numbers
                            const seatNumbers = b.selectedSeatNumbers || [];
                            const ticketBreakdownHTML = Object.entries(ticketBreakdown).length > 0 ? `
                                      <div style="margin-top: 15px; padding: 15px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #667eea;">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 14px;">🎫 Ticket Breakdown:</div>
                                        ${Object.entries(ticketBreakdown).map(([type, qty]) => {
                                const tierSeats = seatNumbers.filter(s => s.startsWith(type + '-') || s.startsWith('seat-')).map(s => s.split('-')[1]);
                                const emoji = type === 'silver' ? '🥈' : type === 'gold' ? '🥇' : type === 'diamond' ? '💎' : '🎫';
                                return `
                                          <div style="margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                              <span style="color: #333; font-size: 13px; font-weight: bold; text-transform: capitalize;">${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                              <span style="color: #667eea; font-weight: bold; font-size: 13px;">${qty} Ticket${Number(qty) > 1 ? 's' : ''}</span>
                                            </div>
                                            ${tierSeats.length > 0 ? `<div style="font-size: 11px; color: #667eea; margin-top: 3px;">Seats: <strong>${tierSeats.join(', ')}</strong></div>` : ''}
                                          </div>`;
                            }).join('')}
                                        ${seatNumbers.filter(s => s.startsWith('seat-')).length > 0 ? `
                                          <div style="font-size: 12px; color: #555; margin-top: 6px;">
                                            🪑 Seat Numbers: <strong style="color:#667eea;">${seatNumbers.filter(s => s.startsWith('seat-')).map(s => s.split('-')[1]).join(', ')}</strong>
                                          </div>` : ''}
                                      </div>
                                    ` : '';
                            const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; background: #f5f5f5; padding: 20px; }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .ticket-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
     color: white;
      padding: 30px;
      text-align: center;
    }
    .ticket-header h1 { font-size: 28px; margin-bottom: 10px; }
    .ticket-header p { font-size: 14px; opacity: 0.9; }
    .event-image {
      width: 100%;
     height: 250px;
      object-fit: cover;
      background: #f0f0f0;
    }
    .ticket-body { padding: 30px; }
    .event-name {
      font-size: 24px;
      font-weight: bold;
     color: #333;
      margin-bottom: 20px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .detail-label {
      font-weight: bold;
     color: #667eea;
      font-size: 14px;
    }
    .detail-value {
     color: #333;
      font-size: 14px;
      font-weight: 500;
    }
    .ticket-footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      border-top: 2px dashed #ddd;
    }
    .ticket-id {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
     color: #764ba2;
      letter-spacing: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      background: #10b981;
     color: white;
      border-radius:20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      text-transform: uppercase;
    }
    .qr-section {
      margin-top: 20px;
      padding: 24px 20px;
      background: linear-gradient(135deg, #f0f4ff, #f5f3ff);
      border: 2px solid #667eea;
      border-radius: 12px;
      text-align: center;
    }
    .qr-code {
      width: 180px;
      height: 180px;
      margin: 0 auto 12px;
      display: block;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(102,126,234,0.25);
    }
    .qr-code svg {
      width: 180px;
      height: 180px;
      border-radius: 8px;
    }
    .qr-text {
      color: #555;
      font-size: 12px;
      margin-top: 10px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 EVENT TICKET</h1>
      <p>Eventoza</p>
    </div>
    ${eventImage ? `<img src="${eventImage}" alt="Event" class="event-image" onerror="this.style.display='none'">` : ''}
    <div class="ticket-body">
      <div class="event-name">${b.event?.title || b.serviceName}</div>
      
      <div class="detail-row">
        <span class="detail-label">👤 Customer Name</span>
        <span class="detail-value">${customerName}</span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">🎫 Tickets Booked</span>
        <span class="detail-value">${totalQuantity} Ticket${totalQuantity > 1 ? 's' : ''}</span>
      </div>
      
      ${ticketBreakdownHTML}
      
      <div class="detail-row">
        <span class="detail-label">📅 Date</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">🕐 Time</span>
        <span class="detail-value">${new Date(b.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      
      ${b.event?.location ? `
      <div class="detail-row">
        <span class="detail-label">📍 Location</span>
        <span class="detail-value">${b.event.location}</span>
      </div>
      ` : ''}
      
      <div class="detail-row">
        <span class="detail-label">💰 Price Paid</span>
        <span class="detail-value">${formatCurrency(b.price)}</span>
      </div>
      
      ${seatNumbers.length > 0 ? `
      <div class="detail-row">
        <span class="detail-label">🪑 Seat Numbers</span>
        <span class="detail-value" style="font-family:monospace; font-size:12px; color:#667eea; font-weight:bold;">
          ${seatNumbers.map(s => {
                                const parts = s.split('-');
                                const tier = parts[0];
                                const seat = parts[1];
                                const emoji = tier === 'diamond' ? '💎' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🪑';
                                return `${emoji}${seat}`;
                            }).join('  ')}
        </span>
      </div>` : ''}
      
      <div class="detail-row">
        <span class="detail-label">👤 Merchant</span>
        <span class="detail-value">${b.assignedTo?.name || 'TBA'}</span>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <span class="status-badge">✓ ${b.status.toUpperCase()}</span>
      </div>
      
      ${b.event?.category ? `
      <div style="margin-top: 15px; padding: 10px; background: #eef2ff; border-radius: 8px; text-align: center;">
        <span style="color: #667eea; font-size: 12px; font-weight: bold;">🎭 ${b.event.category}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="ticket-footer">
      <div class="qr-section">
        <div style="font-size: 13px; font-weight: bold; color: #667eea; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px;">📱 Scan to Verify Entry</div>
        <div class="qr-code">${qrSvg}</div>
        <div class="qr-text">
          Show this QR code at the event entrance<br>
          <strong style="color:#667eea;">${b.ticketId}</strong>
        </div>
      </div>
      
      <div style="margin-top: 15px; font-size: 11px; color: #999; text-align: center;">
        This is a digitally generated ticket. No signature required.
      </div>
    </div>
  </div>
</body>
</html>
                                    `;
                            // Create blob and download
                            const blob = new Blob([ticketHTML], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ticket-${b.ticketId}.html`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success("Ticket downloaded! Open the HTML file to view your beautiful ticket.");
                        }
                        catch (error) {
                            toast.error("Failed to generate ticket");
                        }
                    }}>
                                🎫 Ticket
                              </Button>)}

                            {/* 3. Rate — only after completion */}
                            {b.status === "completed" && (<Button size="sm" variant={b.rating?.score ? "default" : "outline"} className={`gap-1 ${b.rating?.score ? "bg-gradient-primary text-primary-foreground" : "border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"}`} onClick={() => openRatingModal(b)}>
                                ⭐ {b.rating?.score ? `${b.rating.score}/5` : "Rate"}
                              </Button>)}

                            {/* 4. Map */}
                            {b.event?.location && (<Button size="sm" variant="ghost" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.event.location)}`, '_blank')}>
                                📍 Map
                              </Button>)}

                            {/* 5. Pay Now */}
                            {b.status === "awaiting_payment" && (<Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold gap-1" onClick={() => openPaymentModal(b)}>
                                <CreditCard className="h-3.5 w-3.5"/>
                                {b.paymentType === "advance" ? `Pay ${formatCurrency(b.advanceAmount)}` : "Pay Now"}
                              </Button>)}

                            {/* 6. Pay Remaining */}
                            {b.status === "awaiting_final_payment" && (<Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1" onClick={() => openPaymentModal(b)}>
                                <CreditCard className="h-3.5 w-3.5"/> Pay {formatCurrency(b.remainingAmount)}
                              </Button>)}

                            {/* 7. Request Cancellation */}
                            {!["completed", "cancelled", "rejected", "refunded", "cancellation_requested", "cancellation_fee_proposed", "refund_pending"].includes(b.status) && (<Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => handleRequestCancel(b._id)} disabled={cancellingId === b._id}>
                                {cancellingId === b._id ? "Processing..." : "Request Cancel"}
                              </Button>)}

                            {/* 8. Accept proposed fee */}
                            {b.status === "cancellation_fee_proposed" && (<div className="flex flex-col gap-1.5 p-2 border border-indigo-500/20 bg-indigo-500/5 rounded-lg w-full mt-1">
                                <p className="text-xs font-semibold text-indigo-400">
                                  Proposed Fee: {formatCurrency(b.cancellationFee || 0)}
                                </p>
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => handleAcceptCancellationFee(b._id)} disabled={cancellingId === b._id}>
                                  {cancellingId === b._id ? "Processing..." : "Accept Fee"}
                                </Button>
                              </div>)}

                            {/* Status guide text */}
                            {b.status === "cancellation_requested" && (<span className="text-xs font-medium text-amber-500 italic">
                                Waiting for merchant response...
                              </span>)}
                            {b.status === "refund_pending" && (<span className="text-xs font-medium text-purple-400 italic">
                                Fee accepted. Refund pending...
                              </span>)}
                            {b.status === "refunded" && (<span className="text-xs font-medium text-emerald-500 italic">
                                Refunded {formatCurrency(b.refundAmount || 0)} to Wallet
                              </span>)}
                          </div>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>)}
          </motion.div>
        </div>
      </section>

      {/* Rating Modal */}
      <Dialog open={ratingModal} onOpenChange={setRatingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500"/>
              Rate Your Experience
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (<div className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Event/Service</p>
                <p className="font-semibold">{selectedBooking.event?.title || selectedBooking.serviceName}</p>
              </div>

              {/* Star Rating */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Rating</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRatingScore(star)} className="transition-transform hover:scale-110">
                      <Star className={`h-8 w-8 ${star <= ratingScore
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"}`}/>
                    </button>))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {ratingScore} out of 5 stars
                </p>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold">Comment (Optional)</label>
                  <span className="text-[10px] text-muted-foreground">{(ratingComment || "").length}/500</span>
                </div>
                <Textarea placeholder="Share your experience with this event/service..." value={ratingComment} maxLength={500} onChange={(e) => setRatingComment(e.target.value)} className="min-h-24"/>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRatingModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {submittingRating ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            </div>)}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {paymentBooking && (<Dialog open={showPaymentModal} onOpenChange={(open) => !open && setShowPaymentModal(false)}>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-bold">Complete Payment</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <SimplePayment amount={paymentBooking.status === "awaiting_final_payment" ? paymentBooking.remainingAmount : (paymentBooking.paymentType === "advance" ? paymentBooking.advanceAmount : paymentBooking.price)} bookingId={paymentBooking._id} onSuccess={handlePaymentSuccess} onError={(err) => toast.error(err)} onClose={() => {
                setShowPaymentModal(false);
                setPaymentBooking(null);
            }} bookingData={{
                serviceName: paymentBooking.serviceName || paymentBooking.event?.title,
                date: new Date(paymentBooking.datetime).toISOString().split('T')[0],
                time: new Date(paymentBooking.datetime).toTimeString().split(' ')[0].slice(0, 5),
                paymentType: paymentBooking.status === "awaiting_final_payment" ? "remaining" : (paymentBooking.paymentType === "advance" ? "advance" : "full")
            }}/>
            </div>
          </DialogContent>
        </Dialog>)}
    </CustomerLayout>);
};
export default MyRequests;
