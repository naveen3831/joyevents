import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, Loader2, CheckCircle2, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CustomerLayout from "@/components/CustomerLayout";
import PageHeader from "@/components/PageHeader";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import {
  sanitizeMessageInput,
  validateEmail,
  validateName,
  validateMessage,
  MESSAGE_MAX_LENGTH,
} from "@/lib/validation";

const ContactOrganiserPage = () => {
  const navigate = useNavigate();
  const goBack = useBackNavigation("/customer-dashboard");
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const itemTitle = searchParams.get("title") || "this event";
  const eventId = searchParams.get("eventId") || undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const merchantId = searchParams.get("merchantId") || undefined;
  const bookingId = searchParams.get("bookingId") || undefined;
  const returnTo = searchParams.get("returnTo") || "/customer-dashboard/browse-events";
  const eventImage = searchParams.get("image") || "";
  const eventDatetime = searchParams.get("datetime") || "";
  const eventLocation = searchParams.get("location") || "";

  const imgSrc = (img) => (!img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`);

  const name = user?.name || "Customer";
  const email = user?.email || "";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const nameErr = validateName(name);
    if (nameErr) { toast.error(nameErr); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { toast.error(emailErr); return; }
    const messageErr = validateMessage(message);
    if (messageErr) { toast.error(messageErr); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/contact/merchant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: name,
          senderEmail: email,
          message,
          eventId,
          serviceId,
          merchantId,
          bookingId,
          customerId: user?._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSent(true);
      toast.success("Message sent to the organiser!");
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const detailLink = eventId
    ? `/customer-dashboard/events/${eventId}`
    : serviceId
      ? `/customer-dashboard/services/${serviceId}`
      : bookingId
        ? `/customer-dashboard/bookings/${bookingId}/ticket`
        : returnTo;

  const formattedDate = eventDatetime
    ? new Date(eventDatetime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const formattedTime = eventDatetime
    ? new Date(eventDatetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";

  const shortBookingId = bookingId ? (bookingId.length > 8 ? bookingId.slice(-8).toUpperCase() : bookingId) : "";

  const formatCleanLocation = (loc) => {
    if (!loc) return "";
    const parts = loc.split(",").map((p) => p.trim());
    if (parts.length > 1) {
      const mainLoc = parts.find((p) => !p.toLowerCase().includes("ward") && !p.toLowerCase().includes("mandal")) || parts[0];
      const city = parts[parts.length - 1];
      if (mainLoc && city && mainLoc.toLowerCase() !== city.toLowerCase()) {
        return `${mainLoc}, ${city}`;
      }
      return mainLoc || parts[0];
    }
    return loc;
  };

  const displayLocation = formatCleanLocation(eventLocation);

  return (
    <CustomerLayout>
      <div className="w-full font-sans max-w-[880px] mx-auto text-slate-900">

        {/* Back Navigation */}
        <PageHeader title="Contact Organiser" onBack={goBack} />

        {/* Sub-title */}
        <div className="mb-5 -mt-2">
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Message the organiser about <span className="font-semibold text-slate-700">{itemTitle}</span>
          </p>
        </div>

        {sent ? (
          /* Success State */
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-7 text-center space-y-4 max-w-md mx-auto shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Message Sent!</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The organiser has received your inquiry and will respond via email or platform messages.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                onClick={() => navigate(returnTo)}
                variant="outline"
                className="rounded-xl h-9 text-xs font-semibold px-4 border-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Booking
              </Button>
              <Button
                onClick={() => navigate("/customer-dashboard/messages")}
                className="bg-gradient-primary text-white hover:opacity-90 rounded-xl h-9 text-xs font-semibold px-4"
              >
                View Messages
              </Button>
            </div>
          </div>
        ) : (
          /* Single Main Composer Workspace Container */
          <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 sm:p-6 shadow-xs">

            {/* Simple Inline Event Header */}
            <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200/70">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* 56x56 Thumbnail */}
                <div className="relative w-14 h-14 rounded-[10px] overflow-hidden bg-slate-100 shrink-0 border border-slate-200/70">
                  {eventImage && imgSrc(eventImage) ? (
                    <img src={imgSrc(eventImage)} alt={itemTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {itemTitle}
                    </h3>
                    {shortBookingId && (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Booking #{shortBookingId}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-0.5 truncate" title={eventLocation}>
                    {[
                      formattedDate && formattedTime ? `${formattedDate} • ${formattedTime}` : formattedDate || formattedTime,
                      displayLocation,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(detailLink)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors shrink-0 cursor-pointer"
              >
                <span>View Booking</span>
                <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>

            {/* Composer Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Sender Line */}
              <div className="text-xs text-slate-500 py-1 flex items-center gap-2">
                <span className="text-slate-400 font-medium">From</span>
                <span className="font-semibold text-slate-800">{name}</span>
                {email && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{email}</span>
                  </>
                )}
              </div>

              {/* Textarea Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Message</Label>
                  <span className="text-[11px] font-medium text-slate-400">
                    {message.length} / {MESSAGE_MAX_LENGTH}
                  </span>
                </div>

                <textarea
                  value={message}
                  maxLength={MESSAGE_MAX_LENGTH}
                  onChange={(e) => setMessage(sanitizeMessageInput(e.target.value))}
                  placeholder="Write a message to the organiser..."
                  required
                  className="w-full px-3.5 py-3 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y min-h-[130px] h-[140px] max-h-[180px] bg-white leading-relaxed text-slate-800"
                />

                {/* Single Subtle Tip */}
                <p className="text-[12px] text-slate-400 mt-1.5">
                  Tip: Mention any important booking details.
                </p>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(returnTo)}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-5 text-xs font-semibold rounded-xl bg-gradient-primary text-white hover:opacity-90 transition-opacity gap-1.5 shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default ContactOrganiserPage;
