import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetBookingById } from "@/lib/api";
import { formatCurrency, formatTime12, formatEventSchedule } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Ticket, 
  ShieldCheck, 
  CheckCircle2,
  Loader2,
  Tag,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

const imgSrc = (image) => (!image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`);

const CustomerTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!booking && id) {
      setLoading(true);
      apiGetBookingById(id, token)
        .then((res) => {
          if (res?.booking) {
            setBooking(res.booking);
          }
        })
        .catch((err) => {
          toast.error(err?.message || "Failed to load ticket pass");
        })
        .finally(() => setLoading(false));
    }
  }, [id, token, booking, navigate]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your digital pass...</p>
        </div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Ticket className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Ticket Not Found</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't retrieve the pass details for this booking ID.
          </p>
          <Button onClick={() => navigate("/customer-dashboard/bookings")} className="rounded-xl">
            Return to Bookings
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const ticketId = String(booking.ticketId || `TKT-${String(booking._id || "").slice(-8).toUpperCase() || "PASS"}`);
  const eventTitle = String((typeof booking.event?.title === "string" ? booking.event.title : "") || (typeof booking.eventName === "string" ? booking.eventName : "") || (typeof booking.serviceName === "string" ? booking.serviceName : "") || "Event Ticket");
  const locationText = String((typeof booking.event?.location === "string" ? booking.event.location : "") || (typeof booking.customerLocation === "object" ? booking.customerLocation?.address : "") || (typeof booking.customerLocation === "string" ? booking.customerLocation : "") || "Venue TBA");
  const customerName = String((typeof user?.name === "string" ? user.name : "") || (typeof booking.user?.name === "string" ? booking.user.name : "") || (typeof booking.customer?.name === "string" ? booking.customer.name : "") || "Customer");
  const amountPaid = formatCurrency(Number(booking.price) || 0);
  const eventImage = typeof booking.event?.image === "string" ? imgSrc(booking.event.image) : "";

  // Dynamic Date & Schedule
  const scheduleInfo = (booking.event && typeof booking.event === "object") ? formatEventSchedule(booking.event) : null;

  const formattedDate = (() => {
    if (scheduleInfo?.dateText) return scheduleInfo.dateText;
    if (booking.datetime) {
      const dt = new Date(booking.datetime);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      }
    }
    if (booking.date) {
      const d = new Date(String(booking.date) + "T00:00:00");
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      }
      return String(booking.date);
    }
    return "Date TBA";
  })();

  const formattedTime = (() => {
    if (booking.event?.startTime && booking.event?.endTime) {
      return `${formatTime12(String(booking.event.startTime))} – ${formatTime12(String(booking.event.endTime))}`;
    }
    if (scheduleInfo?.timeText) return scheduleInfo.timeText;
    if (booking.datetime) {
      const dt = new Date(booking.datetime);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
      }
    }
    if (booking.time) {
      return formatTime12(String(booking.time));
    }
    return "Time TBA";
  })();

  // Ticket Pass Types & Quantity
  const { ticketTiers, totalQuantity } = (() => {
    try {
      if (booking.selectedTickets) {
        let entries = [];
        if (booking.selectedTickets instanceof Map) {
          entries = Array.from(booking.selectedTickets.entries());
        } else if (typeof booking.selectedTickets === "object") {
          entries = Object.entries(booking.selectedTickets);
        }
        entries = entries.filter(([_, qty]) => Number(qty) > 0);
        if (entries.length > 0) {
          const total = entries.reduce((acc, [_, qty]) => acc + Number(qty), 0);
          const names = entries.map(([type, qty]) => {
            const tStr = String(type || "");
            return `${tStr.charAt(0).toUpperCase() + tStr.slice(1)} Pass (×${qty})`;
          }).join(", ");
          return { ticketTiers: names, totalQuantity: total };
        }
      }
      if (booking.ticketType) {
        const count = Number(booking.quantity) || 1;
        const tStr = String(booking.ticketType || "");
        return { 
          ticketTiers: `${tStr.charAt(0).toUpperCase() + tStr.slice(1)} Pass`, 
          totalQuantity: count 
        };
      }
    } catch (e) {}
    return { ticketTiers: "Standard Entry Pass", totalQuantity: 1 };
  })();

  const qrData = encodeURIComponent(`${ticketId}|${eventTitle}|${Number(booking.price) || 0}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;

  // Download Ticket HTML Action
  const handleDownload = () => {
    try {
      const ticketHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${eventTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background: #0f172a; padding: 24px; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .ticket { width: 100%; max-width: 500px; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    .ticket-header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 20px; text-align: center; }
    .ticket-header h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; margin: 0; }
    .ticket-header p { font-size: 11px; opacity: 0.9; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    ${eventImage ? `.event-image { width: 100%; height: 160px; object-fit: cover; }` : ""}
    .ticket-body { padding: 20px; background: #1e293b; }
    .event-name { font-size: 20px; font-weight: 800; color: #f8fafc; margin-bottom: 14px; text-align: center; }
    .qr-container { background: white; width: 160px; height: 160px; margin: 0 auto 12px; padding: 8px; border-radius: 14px; display: flex; justify-content: center; align-items: center; }
    .qr-img { width: 144px; height: 144px; display: block; }
    .ticket-id { font-family: monospace; font-size: 12px; font-weight: 700; color: #cbd5e1; text-align: center; margin-bottom: 16px; letter-spacing: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .info-card { background: #263347; border-radius: 10px; padding: 8px 12px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px; }
    .info-value { font-size: 13px; color: #f8fafc; font-weight: 700; }
    .info-full { grid-column: span 2; }
    .badge { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .footer { background: #0f172a; padding: 14px; text-align: center; border-top: 1px dashed #334155; }
    .footer p { font-size: 11px; color: #64748b; margin: 0; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>EVENTOZA</h1>
      <p>Official Digital Event Pass</p>
    </div>
    ${eventImage ? `<img src="${eventImage}" class="event-image" alt="Cover"/>` : ""}
    <div class="ticket-body">
      <div class="event-name">${eventTitle}</div>
      <div class="qr-container">
        <img src="${qrCodeUrl}" class="qr-img" alt="QR Code"/>
      </div>
      <div class="ticket-id">${ticketId}</div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Pass Type</div>
          <div class="info-value">${ticketTiers}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Amount Paid</div>
          <div class="info-value">${amountPaid}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Date</div>
          <div class="info-value">${formattedDate}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Time</div>
          <div class="info-value">${formattedTime}</div>
        </div>
        <div class="info-card info-full">
          <div class="info-label">Venue</div>
          <div class="info-value">${locationText}</div>
        </div>
        <div class="info-card info-full">
          <div class="info-label">Attendee</div>
          <div class="info-value">${customerName}</div>
        </div>
      </div>

      <div class="badge">
        ✓ Confirmed Digital Pass
      </div>
    </div>
    <div class="footer">
      <p>Show this digital QR pass at the entrance gate for verified entry.</p>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([ticketHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ticket_${ticketId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Ticket downloaded successfully!");
    } catch (e) {
      toast.error("Failed to download ticket");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <CustomerLayout>
      <div className="w-full max-w-[750px] mx-auto pt-1 pb-10 px-2 sm:px-4 space-y-4">
        
        {/* Compact Back Navigation */}
        <div>
          <button
            onClick={() => navigate("/customer-dashboard/bookings")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to My Bookings
          </button>
        </div>

        {/* Premium Digital Event Pass (Compact 2-Column Desktop Layout) */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          
          {/* Compact Pass Header with Integrated Confirmed Badge */}
          <div className="px-5 py-4 bg-gradient-to-r from-purple-800 via-primary to-indigo-700 text-white flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200">
                EVENTOZA DIGITAL PASS
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">
                {eventTitle}
              </h1>
              <p className="text-xs text-purple-100 font-medium truncate">
                {ticketTiers} • {totalQuantity} {totalQuantity === 1 ? "Ticket" : "Tickets"}
              </p>
            </div>
            
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-black/25 backdrop-blur-xs px-3 py-1.5 rounded-full border border-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Confirmed
              </span>
            </div>
          </div>

          {/* Pass Body: 2-Column Desktop Layout */}
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Left Column: QR Section (~5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <img
                src={qrCodeUrl}
                alt="Ticket QR Code"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
              />
              <p className="mt-2 text-xs font-mono font-bold text-slate-800 tracking-wider">
                {ticketId}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                Present this QR code at the venue entrance
              </p>
            </div>

            {/* Right Column: Event Information (~7 cols) */}
            <div className="md:col-span-7 space-y-2.5">
              
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2.5 text-xs">
                
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-border/60">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Event Date
                    </span>
                    <span className="font-bold text-foreground flex items-center gap-1 mt-0.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" /> {formattedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Time
                    </span>
                    <span className="font-bold text-foreground flex items-center gap-1 mt-0.5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" /> {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Venue */}
                <div className="pb-2.5 border-b border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Venue
                  </span>
                  <span className="font-bold text-foreground flex items-start gap-1 mt-0.5 text-xs leading-snug">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {locationText}
                  </span>
                </div>

                {/* Pass & Attendee & Amount */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Pass Type
                    </span>
                    <span className="font-bold text-foreground flex items-center gap-1 mt-0.5 text-xs truncate">
                      <Tag className="h-3.5 w-3.5 text-primary shrink-0" /> {ticketTiers}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Amount Paid
                    </span>
                    <span className="font-display font-black text-primary text-sm mt-0.5 block">
                      {amountPaid}
                    </span>
                  </div>
                </div>

                {/* Attendee */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" /> Attendee:
                  </span>
                  <span className="font-bold text-foreground">{customerName}</span>
                </div>

              </div>

              {/* Verified Entry Reassurance */}
              <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Verified digital entry pass with secure scannable code.</span>
              </div>

            </div>

          </div>

          {/* Action Footer Bar */}
          <div className="px-5 py-3.5 bg-secondary/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/customer-dashboard/bookings")}
              className="w-full sm:w-auto text-xs font-semibold rounded-xl"
            >
              Back to My Bookings
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex-1 sm:flex-none text-xs font-semibold rounded-xl gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print Pass
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDownload}
                className="flex-1 sm:flex-none bg-gradient-primary hover:opacity-90 text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download Ticket
              </Button>
            </div>
          </div>

        </div>

      </div>
    </CustomerLayout>
  );
};

export default CustomerTicketDetail;
