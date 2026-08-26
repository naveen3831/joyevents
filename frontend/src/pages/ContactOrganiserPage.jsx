import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Send, Loader2, CheckCircle2, CalendarDays, MapPin, Tag, Clock, ExternalLink, ShieldCheck, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CustomerLayout from "@/components/CustomerLayout";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizeMessageInput,
  validateEmail,
  validateName,
  validateMessage,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NAME_HINT,
  MESSAGE_HINT,
} from "@/lib/validation";

const ContactOrganiserPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const itemTitle = searchParams.get("title") || "this event";
  const eventId = searchParams.get("eventId") || undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const merchantId = searchParams.get("merchantId") || undefined;
  const returnTo = searchParams.get("returnTo") || "/customer-dashboard/browse-events";
  const eventImage = searchParams.get("image") || "";
  const eventCategory = searchParams.get("category") || "";
  const eventDatetime = searchParams.get("datetime") || "";
  const eventLocation = searchParams.get("location") || "";

  const imgSrc = (img) => (!img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
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
          customerId: user?._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
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
      : returnTo;

  const formattedDate = eventDatetime
    ? new Date(eventDatetime).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : "";
  const formattedTime = eventDatetime
    ? new Date(eventDatetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <CustomerLayout>
      <div className="w-full pb-10 font-sans" style={{ color: "#0F172A" }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5" style={{ fontSize: "14px", color: "#64748B", marginBottom: "16px" }}>
          <button onClick={() => navigate(returnTo)} className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ color: "#0F172A" }}>Contact Organiser</span>
        </div>

        {/* Page header */}
        <div className="flex items-center gap-3" style={{ marginBottom: "20px" }}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#F5F3FF", color: "#7C3AED" }}>
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", lineHeight: "34px" }}>
              Contact Organiser
            </h1>
            <p style={{ fontSize: "15px", color: "#64748B", marginTop: "2px" }}>
              Reach out about{" "}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{ background: "#F5F3FF", color: "#7C3AED", fontWeight: 600, fontSize: "13px", border: "1px solid rgba(124,58,237,0.15)" }}>
                {itemTitle}
              </span>
            </p>
          </div>
        </div>

        {sent ? (
          /* ── Success State ── */
          <div className="rounded-2xl p-8 text-center space-y-4"
            style={{ border: "1px solid #BBF7D0", background: "#F0FDF4", maxWidth: "520px" }}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#DCFCE7" }}>
              <CheckCircle2 className="h-7 w-7" style={{ color: "#16A34A" }} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>Message Sent!</h2>
            <p style={{ fontSize: "14px", color: "#64748B", lineHeight: "22px" }}>
              The organiser will reply to your email directly.<br />
              You can also check your messages in the dashboard.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => navigate(returnTo)}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl h-10 px-5"
                style={{ fontSize: "13px", fontWeight: 600 }}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Go Back
              </Button>
              <Button variant="outline" onClick={() => navigate("/customer-dashboard/messages")}
                className="rounded-xl h-10 px-5" style={{ fontSize: "13px", fontWeight: 600 }}>
                View Messages
              </Button>
            </div>
          </div>
        ) : (
          /* ── Two-column layout ── */
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)", gap: "24px", alignItems: "start" }}
            className="contact-grid">

            {/* ─── LEFT: Contact Form Card ─── */}
            <div className="rounded-2xl" style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
            }}>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0F172A", marginBottom: "18px" }}>
                Send your message
              </h2>

              <form onSubmit={handleSubmit}>
                {/* Name + Email row */}
                <div className="contact-name-email-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                  {/* Name */}
                  <div>
                    <Label style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", display: "block", marginBottom: "7px" }}>
                      Your Name
                    </Label>
                    <Input
                      value={name}
                      maxLength={NAME_MAX_LENGTH}
                      onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                      placeholder="Your name"
                      style={{ height: "46px", fontSize: "14px", borderColor: "#E2E8F0", borderRadius: "10px" }}
                      required
                    />
                    <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "5px" }}>{NAME_HINT}</p>
                  </div>

                  {/* Email */}
                  <div>
                    <Label style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", display: "block", marginBottom: "7px" }}>
                      Your Email
                    </Label>
                    <Input
                      type="text"
                      inputMode="email"
                      maxLength={EMAIL_MAX_LENGTH}
                      value={email}
                      onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                      placeholder="name@example.com"
                      style={{ height: "46px", fontSize: "14px", borderColor: "#E2E8F0", borderRadius: "10px" }}
                      required
                    />
                    <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "5px" }}>
                      Enter a valid email address, e.g. name@example.com
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: "20px" }}>
                  <Label style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", display: "block", marginBottom: "7px" }}>
                    Message
                  </Label>
                  <textarea
                    value={message}
                    maxLength={MESSAGE_MAX_LENGTH}
                    onChange={(e) => setMessage(sanitizeMessageInput(e.target.value))}
                    placeholder="Ask anything about this event or service..."
                    required
                    className="w-full px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
                    style={{
                      height: "150px",
                      minHeight: "150px",
                      maxHeight: "180px",
                      fontSize: "14px",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      background: "#FFFFFF",
                      lineHeight: "22px",
                    }}
                  />
                  <div className="flex items-center justify-between" style={{ marginTop: "5px" }}>
                    <p style={{ fontSize: "12px", color: "#94A3B8" }}>{MESSAGE_HINT}</p>
                    <p style={{ fontSize: "12px", color: "#94A3B8" }}>{message.length}/{MESSAGE_MAX_LENGTH}</p>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center justify-end gap-3" style={{ paddingTop: "4px", borderTop: "1px solid #F1F5F9" }}>
                  <Button type="button" variant="outline" onClick={() => navigate(returnTo)}
                    className="rounded-xl"
                    style={{ height: "44px", fontSize: "13px", fontWeight: 600, padding: "0 20px", borderColor: "#E2E8F0" }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="rounded-xl hover:opacity-90"
                    style={{
                      height: "44px",
                      fontSize: "13px",
                      fontWeight: 600,
                      padding: "0 24px",
                      background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                      color: "#FFFFFF",
                      border: "none",
                    }}>
                    {loading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      : <><Send className="h-4 w-4 mr-2" /> Send Message</>
                    }
                  </Button>
                </div>
              </form>
            </div>

            {/* ─── RIGHT: Context Cards ─── */}
            <div className="space-y-4">

              {/* Event/Service summary card */}
              <div className="rounded-2xl overflow-hidden" style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
              }}>
                {/* Image or placeholder */}
                <div className="relative w-full overflow-hidden" style={{ height: "140px", background: "#F1F5F9" }}>
                  {eventImage && imgSrc(eventImage)
                    ? <img src={imgSrc(eventImage)} alt={itemTitle} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <CalendarDays className="h-10 w-10" style={{ color: "#CBD5E1" }} />
                      </div>
                  }
                  {eventCategory && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full"
                      style={{ fontSize: "11px", fontWeight: 600, background: "rgba(124,58,237,0.9)", color: "#FFFFFF" }}>
                      {eventCategory}
                    </span>
                  )}
                </div>

                <div style={{ padding: "16px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    You're contacting about
                  </p>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", lineHeight: "22px", marginBottom: "12px" }}>
                    {itemTitle}
                  </h3>

                  {/* Meta rows */}
                  <div className="space-y-2">
                    {eventCategory && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7C3AED" }} />
                        <span style={{ fontSize: "13px", color: "#64748B" }}>{eventCategory}</span>
                      </div>
                    )}
                    {formattedDate && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7C3AED" }} />
                        <span style={{ fontSize: "13px", color: "#64748B" }}>{formattedDate}</span>
                      </div>
                    )}
                    {formattedTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7C3AED" }} />
                        <span style={{ fontSize: "13px", color: "#64748B" }}>{formattedTime}</span>
                      </div>
                    )}
                    {eventLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7C3AED" }} />
                        <span style={{ fontSize: "13px", color: "#64748B" }} className="line-clamp-1">{eventLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* View details link */}
                  <button onClick={() => navigate(detailLink)}
                    className="flex items-center gap-1 mt-3 transition-opacity hover:opacity-70"
                    style={{ fontSize: "13px", fontWeight: 600, color: "#7C3AED" }}>
                    <ExternalLink className="h-3.5 w-3.5" /> View Details
                  </button>
                </div>
              </div>

              {/* Contact guidance card */}
              <div className="rounded-2xl" style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "18px",
                boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
              }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "14px" }}>
                  Before you send
                </h4>
                <div className="space-y-3">
                  {[
                    { icon: MessageCircle, text: "Ask about availability, pricing, or custom requirements." },
                    { icon: Lock, text: "Never share passwords, OTPs, or payment credentials." },
                    { icon: ShieldCheck, text: "The organiser can reply through your registered contact details or platform messages." },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                        <Icon style={{ width: "14px", height: "14px" }} />
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748B", lineHeight: "19px" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .contact-name-email-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </CustomerLayout>
  );
};

export default ContactOrganiserPage;
