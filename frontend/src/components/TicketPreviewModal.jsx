import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { 
  Download, 
  Printer, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Ticket, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

const imgSrc = (image) => (!image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`);

const TicketPreviewModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  currentUser 
}) => {
  const printRef = useRef(null);
  if (!booking) return null;

  const ticketId = booking.ticketId || `TKT-${booking._id?.slice(-8).toUpperCase() || "PASS"}`;
  const eventTitle = booking.event?.title || booking.eventName || booking.serviceName || "Event Ticket";
  const locationText = booking.event?.location || booking.customerLocation?.address || "Venue TBA";
  const customerName = currentUser?.name || booking.user?.name || "Customer";
  const amountPaid = formatCurrency(booking.price || 0);
  const eventImage = booking.event?.image ? imgSrc(booking.event.image) : "";

  // Format Date & Time cleanly
  const formattedDate = (() => {
    if (booking.datetime) {
      const dt = new Date(booking.datetime);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      }
    }
    if (booking.date) {
      const d = new Date(booking.date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      }
      return booking.date;
    }
    return "Date TBA";
  })();

  const formattedTime = (() => {
    if (booking.datetime) {
      const dt = new Date(booking.datetime);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
      }
    }
    if (booking.time) {
      const parts = booking.time.split(":");
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? "PM" : "AM";
        const h12 = hours % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
      }
      return booking.time;
    }
    return "Time TBA";
  })();

  // Ticket Tiers
  const ticketTiers = (() => {
    if (booking.selectedTickets && Object.keys(booking.selectedTickets).length > 0) {
      return Object.entries(booking.selectedTickets)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([type, qty]) => `${type.charAt(0).toUpperCase() + type.slice(1)} Pass (×${qty})`)
        .join(", ");
    }
    if (booking.ticketType) {
      return `${booking.ticketType.charAt(0).toUpperCase() + booking.ticketType.slice(1)} Pass ${booking.quantity ? `(×${booking.quantity})` : ""}`;
    }
    return "Standard Entry Pass";
  })();

  const qrData = encodeURIComponent(`${ticketId}|${eventTitle}|${booking.price || 0}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

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
    .ticket { width: 100%; max-width: 480px; background: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    .ticket-header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 24px 20px; text-align: center; }
    .ticket-header h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; margin: 0; }
    .ticket-header p { font-size: 11px; opacity: 0.9; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    ${eventImage ? `.event-image { width: 100%; height: 160px; object-fit: cover; }` : ""}
    .ticket-body { padding: 24px; background: #1e293b; }
    .event-name { font-size: 22px; font-weight: 800; color: #f8fafc; margin-bottom: 16px; text-align: center; }
    .qr-container { background: white; width: 160px; height: 160px; margin: 0 auto 16px; padding: 8px; border-radius: 16px; display: flex; justify-content: center; align-items: center; }
    .qr-img { width: 144px; height: 144px; display: block; }
    .ticket-id { font-family: monospace; font-size: 12px; font-weight: 700; color: #cbd5e1; text-align: center; margin-bottom: 20px; letter-spacing: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .info-card { background: #334155/60; background: #263347; border-radius: 12px; padding: 10px 12px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px; }
    .info-value { font-size: 13px; color: #f8fafc; font-weight: 700; }
    .info-full { grid-column: span 2; }
    .badge { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 10px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .footer { background: #0f172a; padding: 16px; text-align: center; border-top: 1px dashed #334155; }
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
    const printContent = document.getElementById("ticket-print-area");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket - ${eventTitle}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
              .ticket { max-width: 480px; width: 100%; border: 1px solid #ddd; border-radius: 16px; padding: 24px; text-align: center; }
              .qr { width: 160px; height: 160px; margin: 16px auto; }
              .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
              .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; text-align: left; }
              .label { color: #666; }
              .val { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <h2 style="margin:0; color:#7c3aed;">EVENTOZA</h2>
              <p style="font-size:11px; color:#666; margin-top:2px;">OFFICIAL EVENT PASS</p>
              <div class="title">${eventTitle}</div>
              <img class="qr" src="${qrCodeUrl}" alt="QR"/>
              <p style="font-family:monospace; font-size:12px; color:#666; margin-top:0;">${ticketId}</p>
              <div class="row"><span class="label">Pass Type:</span><span class="val">${ticketTiers}</span></div>
              <div class="row"><span class="label">Date & Time:</span><span class="val">${formattedDate} at ${formattedTime}</span></div>
              <div class="row"><span class="label">Venue:</span><span class="val">${locationText}</span></div>
              <div class="row"><span class="label">Attendee:</span><span class="val">${customerName}</span></div>
              <div class="row"><span class="label">Amount Paid:</span><span class="val">${amountPaid}</span></div>
              <div class="row"><span class="label">Status:</span><span class="val" style="color:green;">CONFIRMED</span></div>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden bg-card border-border rounded-2xl shadow-xl">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-secondary/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <DialogTitle className="font-bold text-sm text-foreground">
              Digital Event Pass
            </DialogTitle>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Confirmed
          </span>
        </div>

        {/* Ticket Body: Digital Pass Container */}
        <div id="ticket-print-area" className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Top Brand & Event title */}
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              EVENTOZA PASS
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {eventTitle}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {ticketTiers}
            </p>
          </div>

          {/* QR Code Pass Centerpiece */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-border/80 shadow-xs max-w-[220px] mx-auto text-center">
            <img
              src={qrCodeUrl}
              alt="Ticket QR Code"
              className="w-36 h-36 object-contain rounded-lg"
            />
            <p className="mt-2 text-[10px] font-mono font-bold text-slate-700 tracking-wider">
              {ticketId}
            </p>
          </div>

          {/* Ticket Information Grid */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Date</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 text-primary" /> {formattedDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Time</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-primary" /> {formattedTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/60">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Attendee</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5 truncate">
                  <User className="h-3 w-3 text-primary shrink-0" /> {customerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Amount Paid</span>
                <span className="font-bold text-primary text-sm mt-0.5 block">
                  {amountPaid}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Venue</span>
              <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-primary shrink-0" /> {locationText}
              </span>
            </div>
          </div>

          {/* Verification note */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>Present this QR code on your mobile device or printed pass at the venue entrance.</span>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-secondary/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-semibold rounded-xl"
          >
            Close
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 sm:flex-none text-xs font-semibold rounded-xl gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print
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

      </DialogContent>
    </Dialog>
  );
};

export default TicketPreviewModal;
