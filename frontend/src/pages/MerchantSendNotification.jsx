import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Send,
  Sparkles,
  Bell,
  Calendar,
  Tag,
  Users,
  CheckCircle2,
  Info,
  Radio,
  Zap,
  Clock,
  Gift,
  Megaphone
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiSendNotification, apiListMyEvents } from "@/lib/api";

const NOTIFICATION_TEMPLATES = [
  {
    id: "announcement",
    name: "New Event Announcement",
    icon: Sparkles,
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    title: "🎉 New Event Just Announced!",
    message: "We're excited to announce our newest event! Check out the details and reserve your tickets before they sell out."
  },
  {
    id: "offer",
    name: "Special Discount / Offer",
    icon: Gift,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    title: "⚡ Exclusive Limited-Time Offer",
    message: "Enjoy a special discount on your next booking with us! Use our exclusive promo code at checkout today."
  },
  {
    id: "reminder",
    name: "Event Reminder",
    icon: Clock,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    title: "⏰ Upcoming Event Reminder",
    message: "Get ready! Our upcoming event is right around the corner. We look forward to seeing you there."
  },
  {
    id: "custom",
    name: "Custom Broadcast",
    icon: Megaphone,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    title: "",
    message: ""
  }
];

const MerchantSendNotification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("custom");

  const [form, setForm] = useState({
    title: "",
    message: "",
    eventId: "none"
  });

  useEffect(() => {
    loadEvents();
  }, [token]);

  useEffect(() => {
    const templateParam = searchParams.get("template") || location.state?.template;
    const eventIdParam = searchParams.get("eventId") || location.state?.eventId;

    if (templateParam) {
      const found = NOTIFICATION_TEMPLATES.find((t) => t.id === templateParam);
      if (found) {
        setSelectedTemplate(found.id);
        setForm((prev) => ({
          ...prev,
          title: found.title,
          message: found.message
        }));
      }
    }

    if (eventIdParam) {
      setForm((prev) => ({ ...prev, eventId: eventIdParam }));
    }
  }, [searchParams, location.state]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await apiListMyEvents(token).catch(() => ({ events: [] }));
      setEvents(res.events || []);
    } catch {
      toast.error("Failed to load events list");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (template) => {
    setSelectedTemplate(template.id);
    if (template.id === "custom") {
      setForm((prev) => ({
        ...prev,
        title: "",
        message: ""
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        title: template.title,
        message: template.message
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    if (form.title.trim().length > 50) {
      toast.error("Notification title cannot exceed 50 characters");
      return;
    }

    if (form.message.trim().length > 250) {
      toast.error("Notification message cannot exceed 250 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        eventId: form.eventId && form.eventId !== "none" ? form.eventId : ""
      };

      const result = await apiSendNotification(payload, token);
      toast.success(
        result?.notificationsSent != null
          ? `Notification sent successfully to ${result.notificationsSent} customer(s)!`
          : "Notification sent successfully!"
      );

      window.dispatchEvent(new CustomEvent("marketingUpdated"));
      navigate("/merchant-dashboard/marketing");
    } catch (error) {
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEvent = events.find((e) => e._id === form.eventId);

  return (
    <MerchantLayout>
      <div className="w-full min-w-0 space-y-6 pb-16 font-sans">
        {/* Top Header & Breadcrumbs */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/merchant-dashboard/marketing")}
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing Tools
          </Button>

          <PageHeader
            title="Send Customer Notification"
            subtitle="Broadcast real-time announcements, special offers, and event updates directly to your customer base."
            breadcrumbs={[
              { label: "Merchant Portal", to: "/merchant-dashboard" },
              { label: "Marketing", to: "/merchant-dashboard/marketing" },
              { label: "Send Notification" }
            ]}
          />
        </div>

        {/* Audience Info Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Broadcast Audience Targeting
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live In-App
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your notification will instantly appear in the inbox and notification bells of all customers who have booked or registered for your events and services.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Form (Left) + Live Preview & Tips (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Templates Selector */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Quick Templates
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Choose a template to quickly pre-fill your notification
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NOTIFICATION_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            : "border-border bg-card/50 hover:bg-secondary/60 hover:border-border"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${tmpl.badgeColor}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{tmpl.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {tmpl.id === "custom" ? "Start from a clean slate" : tmpl.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notification Form Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Notification Content
                </CardTitle>
                <CardDescription className="text-xs">
                  Craft your broadcast headline and detailed message
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="notify-title" className="text-sm font-medium">
                        Notification Title <span className="text-destructive">*</span>
                      </Label>
                      <span
                        className={`text-xs font-mono ${
                          form.title.length > 45
                            ? "text-amber-500 font-bold"
                            : form.title.length === 50
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {form.title.length} / 50
                      </span>
                    </div>
                    <Input
                      id="notify-title"
                      placeholder="e.g., 🎉 Grand Summer Concert Tickets Out Now!"
                      value={form.title}
                      maxLength={50}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="h-11 font-medium focus-visible:ring-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Catchy, concise title that will appear at the top of the push and inbox alert.
                    </p>
                  </div>

                  {/* Message Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="notify-message" className="text-sm font-medium">
                        Message Body <span className="text-destructive">*</span>
                      </Label>
                      <span
                        className={`text-xs font-mono ${
                          form.message.length > 230
                            ? "text-amber-500 font-bold"
                            : form.message.length === 250
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {form.message.length} / 250
                      </span>
                    </div>
                    <Textarea
                      id="notify-message"
                      placeholder="Write your announcement, offer code, or update here..."
                      value={form.message}
                      maxLength={250}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={4}
                      className="resize-y focus-visible:ring-primary text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Clearly communicate key details or calls to action to maximize engagement.
                    </p>
                  </div>

                  {/* Related Event Selection */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label htmlFor="notify-event" className="text-sm font-medium flex items-center justify-between">
                      <span>Related Event (Optional)</span>
                      <span className="text-xs text-muted-foreground font-normal">Adds a direct link to ticket page</span>
                    </Label>
                    <Select
                      value={form.eventId}
                      onValueChange={(value) => setForm({ ...form, eventId: value })}
                    >
                      <SelectTrigger id="notify-event" className="h-11">
                        <SelectValue placeholder="Select an event to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground font-normal">— None (General Announcement) —</span>
                        </SelectItem>
                        {events.map((event) => (
                          <SelectItem key={event._id} value={event._id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{event.title}</span>
                              {event.category && (
                                <span className="text-xs text-muted-foreground capitalize">({event.category})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/merchant-dashboard/marketing")}
                      disabled={submitting}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !form.title.trim() || !form.message.trim()}
                      className="w-full sm:w-auto min-h-[44px] bg-gradient-primary gap-2 text-white shadow-glow hover:opacity-95"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Broadcast…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Notification Now
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Preview & Best Practices */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            {/* Live Customer Preview Card */}
            <Card className="border-border shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-border/60 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                    Live Customer Preview
                  </CardTitle>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    In-App Notification
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Mock Notification Popup / Card */}
                <div className="relative rounded-2xl border border-border bg-gradient-to-b from-card to-secondary/30 p-4 shadow-lg transition-all duration-300">
                  {/* Top Notification Meta */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {user?.name || "Your Business / Organization"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Notification Alert</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      Just now
                    </span>
                  </div>

                  {/* Title & Body */}
                  <div className="space-y-1.5 pl-10">
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {form.title.trim() || (
                        <span className="text-muted-foreground/60 italic font-normal">
                          Notification Title appears here...
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {form.message.trim() || (
                        <span className="text-muted-foreground/50 italic">
                          Your notification message content will be displayed here for the customer.
                        </span>
                      )}
                    </p>

                    {/* Linked Event Tag */}
                    {selectedEvent && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs bg-secondary/60 -ml-2 -mr-2 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate text-xs">
                            {selectedEvent.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-primary shrink-0">
                          View Event →
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                  Customers will also receive a badge alert on their navigation bar.
                </p>
              </CardContent>
            </Card>

            {/* Notification Best Practices Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  Tips for Maximum Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground font-medium">Keep it punchy:</strong> Titles under 40 characters get 25% higher open rates.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground font-medium">Attach an event:</strong> Linking an event allows recipients to view tickets with one tap.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground font-medium">Include promo codes:</strong> Mention any active discount code to increase conversions.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSendNotification;
