import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Megaphone,
  Ticket,
  Share2,
  Send,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Loader2,
  AlertCircle,
  Sparkles,
  Gift,
  Clock,
  ArrowRight
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  apiGetPromoCodes,
  apiDeletePromoCode,
  apiListMyEvents,
  apiListMyServices,
  apiGetMarketingStats,
  apiListCategories
} from "@/lib/api";
import { useGsapStagger, useGsapCardHover } from "@/lib/gsapAnimations";

const PromoCard = ({ promo, onEdit, onDelete }) => {
  const ref = useGsapCardHover({ lift: -4, scale: 1.01 });
  return (
    <Card ref={ref} className="will-change-transform">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <code className="bg-secondary px-3 py-1 rounded font-mono font-bold text-primary">
                {promo.code}
              </code>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  promo.isActive ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                }`}
              >
                {promo.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{promo.description}</p>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                {promo.discountType === "percentage"
                  ? `${promo.discountValue}%`
                  : `${formatCurrency(promo.discountValue)}`}{" "}
                off
              </span>
              <span>
                Used: {promo.currentUses}/{promo.maxUses || "∞"}
              </span>
              {promo.minBookingAmount > 0 && <span>Min. {formatCurrency(promo.minBookingAmount)}</span>}
              {promo.applicableCategories &&
                promo.applicableCategories.length > 0 &&
                promo.applicableCategories[0] !== "all" && (
                  <span className="capitalize">Cat: {promo.applicableCategories[0]}</span>
                )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(promo)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(promo._id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EventShareCard = ({ event, onCopy }) => {
  const ref = useGsapCardHover({ lift: -4, scale: 1.01 });
  return (
    <Card ref={ref} className="will-change-transform">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{event.description?.substring(0, 100)}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => onCopy(`${window.location.origin}/events/${event._id}`)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MarketingTools = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("promo");
  const [promoCodes, setPromoCodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("createPromo") === "true" || location.state?.openCreatePromo) {
      navigate("/merchant-dashboard/marketing/promo/new");
    }
  }, [location.search, location.state]);

  // Smooth real-time updates
  useEffect(() => {
    if (!token) return;
    const pollInterval = setInterval(async () => {
      try {
        const promoRes = await apiGetPromoCodes(token);
        setPromoCodes((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(promoRes.promoCodes)) {
            return promoRes.promoCodes || [];
          }
          return prev;
        });
      } catch {
        // silently ignore polling errors
      }
    }, 5000);

    const handleMarketingUpdate = () => {
      loadData();
    };

    window.addEventListener("marketingUpdated", handleMarketingUpdate);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("marketingUpdated", handleMarketingUpdate);
    };
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promoRes, eventsRes, servicesRes, statsRes] = await Promise.all([
        apiGetPromoCodes(token).catch(() => ({ promoCodes: [] })),
        apiListMyEvents(token).catch(() => ({ events: [] })),
        apiListMyServices(token).catch(() => ({ services: [] })),
        apiGetMarketingStats(token).catch(() => null)
      ]);
      setPromoCodes(promoRes.promoCodes || []);
      setEvents(eventsRes.events || []);
      setServices(servicesRes.services || []);
      setStats(statsRes);
    } catch {
      toast.error("Failed to load marketing data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromo = (promo) => {
    navigate(`/merchant-dashboard/marketing/promo/${promo._id}/edit`);
  };

  const handleDeletePromo = async (id) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    try {
      await apiDeletePromoCode(id, token);
      toast.success("Promo code deleted");
      window.dispatchEvent(new CustomEvent("marketingUpdated"));
      loadData();
    } catch (error) {
      toast.error(error.message || "Failed to delete promo code");
    }
  };

  const promoGridRef = useGsapStagger([promoCodes]);
  const eventGridRef = useGsapStagger([events]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <MerchantLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading marketing tools…
          </div>
        </section>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="w-full min-w-0 space-y-5 font-sans">
        <PageHeader
          title="Marketing Tools"
          subtitle="Create promo codes, manage discounts, and broadcast notifications directly to customers."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Growth" },
            { label: "Marketing Tools" }
          ]}
        />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-wrap gap-2"
        >
          <button
            onClick={() => setActiveTab("promo")}
            className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "promo"
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ticket className="h-4 w-4 inline mr-2" />
            Promo Codes
          </button>
          <button
            onClick={() => setActiveTab("share")}
            className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "share"
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-4 w-4 inline mr-2" />
            Share Links
          </button>
          <button
            onClick={() => setActiveTab("notify")}
            className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "notify"
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="h-4 w-4 inline mr-2" />
            Send Notifications
          </button>
        </motion.div>

        {/* Promo Codes Tab */}
        {activeTab === "promo" && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Promo Codes</h2>
                <p className="text-muted-foreground text-sm mt-1">Create and manage discount codes</p>
              </div>
              <Button
                onClick={() => navigate("/merchant-dashboard/marketing/promo/new")}
                className="bg-gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </div>

            {promoCodes.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="text-muted-foreground">No promo codes yet. Create one to get started!</p>
              </div>
            ) : (
              <div ref={promoGridRef} className="grid gap-4">
                {promoCodes.map((promo) => (
                  <PromoCard
                    key={promo._id}
                    promo={promo}
                    onEdit={handleEditPromo}
                    onDelete={handleDeletePromo}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Share Links Tab */}
        {activeTab === "share" && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            className="space-y-6"
          >
            <div>
              <h2 className="font-display text-2xl font-bold">Share Event Links</h2>
              <p className="text-muted-foreground text-sm mt-1">Generate shareable links for your events</p>
            </div>

            {events.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="text-muted-foreground">No events to share. Create an event first!</p>
              </div>
            ) : (
              <div ref={eventGridRef} className="grid gap-4">
                {events.map((event) => (
                  <EventShareCard key={event._id} event={event} onCopy={copyToClipboard} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Send Notifications Tab */}
        {activeTab === "notify" && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Send Notifications</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Notify customers about new events, special offers, and schedule reminders
                </p>
              </div>
              <Button
                onClick={() => navigate("/merchant-dashboard/marketing/notification/new")}
                className="bg-gradient-primary"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </div>

            {/* Notification Templates Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Notification Templates</CardTitle>
                <CardDescription className="text-xs">
                  Click any template to customize copy and broadcast to your audience
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => navigate("/merchant-dashboard/marketing/notification/new?template=announcement")}
                  className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Use <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">New Event Announcement</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Notify customers about your latest events and performances
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => navigate("/merchant-dashboard/marketing/notification/new?template=offer")}
                  className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Gift className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-medium text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Use <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">Special Offer & Discount</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Promote a limited-time coupon or flash discount
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => navigate("/merchant-dashboard/marketing/notification/new?template=reminder")}
                  className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Use <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">Event Reminder</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Remind attendees about upcoming dates and schedules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Info Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-primary" />
                      Customer Broadcast Messaging
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Deliver instant notifications directly to the inboxes and notification bells of customers who have booked your events and services.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/merchant-dashboard/marketing/notification/new")}
                    className="bg-gradient-primary shrink-0"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Open Notification Composer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MerchantLayout>
  );
};

export default MarketingTools;
