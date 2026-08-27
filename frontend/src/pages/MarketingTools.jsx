import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Megaphone, Ticket, Share2, Send, Plus, Edit2, Trash2, Copy, Loader2, AlertCircle } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiCreatePromoCode, apiGetPromoCodes, apiUpdatePromoCode, apiDeletePromoCode, apiSendNotification, apiListMyEvents, apiListMyServices, apiGetMarketingStats, apiListCategories } from "@/lib/api";
import { useGsapStagger, useGsapCardHover } from "@/lib/gsapAnimations";

const PromoCard = ({ promo, onEdit, onDelete }) => {
    const ref = useGsapCardHover({ lift: -4, scale: 1.01 });
    return (<Card ref={ref} className="will-change-transform">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <code className="bg-secondary px-3 py-1 rounded font-mono font-bold text-primary">
                  {promo.code}
                </code>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${promo.isActive ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"}`}>
                  {promo.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{promo.description}</p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{promo.discountType === "percentage" ? `${promo.discountValue}%` : `${formatCurrency(promo.discountValue)}`} off</span>
                <span>Used: {promo.currentUses}/{promo.maxUses || "∞"}</span>
                {promo.minBookingAmount > 0 && (<span>Min. {formatCurrency(promo.minBookingAmount)}</span>)}
                {promo.applicableCategories && promo.applicableCategories.length > 0 && promo.applicableCategories[0] !== "all" && (<span className="capitalize">Cat: {promo.applicableCategories[0]}</span>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(promo)}>
                <Edit2 className="h-4 w-4"/>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(promo._id)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>);
};

const EventShareCard = ({ event, onCopy }) => {
    const ref = useGsapCardHover({ lift: -4, scale: 1.01 });
    return (<Card ref={ref} className="will-change-transform">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{event.description?.substring(0, 100)}</p>
            </div>
            <Button variant="outline" onClick={() => onCopy(`${window.location.origin}/events/${event._id}`)}>
              <Copy className="h-4 w-4 mr-2"/>
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>);
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
    const [categories, setCategories] = useState([]);
    const [eventCategories, setEventCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [ticketedEventCategories, setTicketedEventCategories] = useState([]);
    const [fullServiceEventCategories, setFullServiceEventCategories] = useState([]);
    const [stats, setStats] = useState(null);
    // Promo code dialog
    const [promoDialogOpen, setPromoDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [promoForm, setPromoForm] = useState({
        code: "",
        description: "",
        appliesTo: "all",
        applicableCategories: ["all"],
        discountType: "percentage",
        discountValue: 0,
        maxUses: "",
        expiryDate: "",
        minBookingAmount: 0,
        maxDiscount: ""
    });
    // Notification dialog
    const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
    const [notifyForm, setNotifyForm] = useState({
        title: "",
        message: "",
        eventId: ""
    });
    const [submitting, setSubmitting] = useState(false);
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
        if (!token)
            return;
        const pollInterval = setInterval(async () => {
            try {
                const promoRes = await apiGetPromoCodes(token);
                setPromoCodes(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(promoRes.promoCodes)) {
                        return promoRes.promoCodes || [];
                    }
                    return prev;
                });
            }
            catch {
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
            const [promoRes, eventsRes, servicesRes, statsRes, eventCatsRes, serviceCatsRes] = await Promise.all([
                apiGetPromoCodes(token).catch(() => ({ promoCodes: [] })),
                apiListMyEvents(token).catch(() => ({ events: [] })),
                apiListMyServices(token).catch(() => ({ services: [] })),
                apiGetMarketingStats(token).catch(() => null),
                apiListCategories("event").catch(() => ({ categories: [] })),
                apiListCategories("service").catch(() => ({ categories: [] }))
            ]);
            setPromoCodes(promoRes.promoCodes || []);
            setEvents(eventsRes.events || []);
            setServices(servicesRes.services || []);
            setStats(statsRes);
            const eCats = (eventCatsRes.categories || []).map((c) => c.name);
            const sCats = (serviceCatsRes.categories || []).map((c) => c.name);
            const eventItemCats = (eventsRes.events || []).map((e) => e.category).filter(Boolean);
            const serviceItemCats = (servicesRes.services || []).map((s) => s.category).filter(Boolean);
            const ticketedItemCats = (eventsRes.events || [])
                .filter((e) => e?.eventType === "ticketed")
                .map((e) => e.category)
                .filter(Boolean);
            const fullServiceItemCats = (eventsRes.events || [])
                .filter((e) => e?.eventType === "fullService")
                .map((e) => e.category)
                .filter(Boolean);
            const allCats = Array.from(new Set([...eCats, ...sCats, ...eventItemCats, ...serviceItemCats])).sort();
            setCategories(allCats);
            const allEventCats = Array.from(new Set([...eCats, ...eventItemCats])).sort();
            const allServiceCats = Array.from(new Set([...sCats, ...serviceItemCats])).sort();
            const ticketedCats = Array.from(new Set([...ticketedItemCats])).sort();
            const fullServiceCats = Array.from(new Set([...fullServiceItemCats])).sort();
            setEventCategories(allEventCats);
            setServiceCategories(allServiceCats);
            setTicketedEventCategories(ticketedCats);
            setFullServiceEventCategories(fullServiceCats);
        }
        catch (error) {
            toast.error("Failed to load marketing data");
        }
        finally {
            setLoading(false);
        }
    };
    const handleEditPromo = (promo) => {
        navigate(`/merchant-dashboard/marketing/promo/${promo._id}/edit`);
    };
    const getCategoryOptions = (appliesTo) => {
        if (appliesTo === "services")
            return serviceCategories;
        if (appliesTo === "ticketedEvents")
            return ticketedEventCategories.length > 0 ? ticketedEventCategories : eventCategories;
        if (appliesTo === "fullServiceEvents")
            return fullServiceEventCategories.length > 0 ? fullServiceEventCategories : eventCategories;
        return categories;
    };
    const handleCreatePromo = async () => {
        if (!promoForm.code || promoForm.discountValue <= 0) {
            toast.error("Please fill in all required fields");
            return;
        }
        const codeRegex = /^[A-Z0-9]{3,15}$/;
        if (!codeRegex.test(promoForm.code)) {
            toast.error("Coupon code must be between 3 and 15 alphanumeric uppercase characters (e.g. SAVE20)");
            return;
        }
        if (promoForm.description && promoForm.description.length > 150) {
            toast.error("Description cannot exceed 150 characters");
            return;
        }
        if (promoForm.discountType === "percentage" && (promoForm.discountValue < 1 || promoForm.discountValue > 100)) {
            toast.error("Percentage discount must be between 1% and 100%");
            return;
        }
        if (promoForm.discountType === "fixed" && promoForm.discountValue < 1) {
            toast.error("Fixed discount value must be at least ₹1");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                code: promoForm.code,
                description: promoForm.description,
                appliesTo: promoForm.appliesTo,
                applicableCategories: promoForm.applicableCategories,
                discountType: promoForm.discountType,
                discountValue: promoForm.discountValue,
                maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : null,
                expiryDate: promoForm.expiryDate || null,
                minBookingAmount: promoForm.minBookingAmount,
                maxDiscount: promoForm.maxDiscount ? parseFloat(promoForm.maxDiscount) : null
            };
            if (editingPromo) {
                await apiUpdatePromoCode(editingPromo._id, payload, token);
                toast.success("Promo code updated successfully");
            }
            else {
                await apiCreatePromoCode(payload, token);
                toast.success("Promo code created successfully");
            }
            window.dispatchEvent(new CustomEvent("marketingUpdated"));
            setPromoDialogOpen(false);
            setEditingPromo(null);
            setPromoForm({
                code: "",
                description: "",
                appliesTo: "all",
                applicableCategories: ["all"],
                discountType: "percentage",
                discountValue: 0,
                maxUses: "",
                expiryDate: "",
                minBookingAmount: 0,
                maxDiscount: ""
            });
            await loadData();
        }
        catch (error) {
            toast.error(error.message || "Failed to save promo code");
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDeletePromo = async (id) => {
        if (!confirm("Are you sure you want to delete this promo code?"))
            return;
        try {
            await apiDeletePromoCode(id, token);
            toast.success("Promo code deleted");
            window.dispatchEvent(new CustomEvent("marketingUpdated"));
            loadData();
        }
        catch (error) {
            toast.error(error.message || "Failed to delete promo code");
        }
    };
    const handleSendNotification = async () => {
        if (!notifyForm.title || !notifyForm.message) {
            toast.error("Please fill in title and message");
            return;
        }
        if (notifyForm.title.length > 50) {
            toast.error("Notification title cannot exceed 50 characters");
            return;
        }
        if (notifyForm.message.length > 250) {
            toast.error("Notification message cannot exceed 250 characters");
            return;
        }
        setSubmitting(true);
        try {
            const result = await apiSendNotification(notifyForm, token);
            toast.success(`Notification sent to ${result.notificationsSent} customer(s)`);
            setNotifyDialogOpen(false);
            setNotifyForm({ title: "", message: "", eventId: "" });
        }
        catch (error) {
            toast.error(error.message || "Failed to send notification");
        }
        finally {
            setSubmitting(false);
        }
    };
    const promoGridRef = useGsapStagger([promoCodes]);
    const eventGridRef = useGsapStagger([events]);
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };
    if (loading) {
        return (<MerchantLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading marketing tools…
          </div>
        </section>
      </MerchantLayout>);
    }
    return (<MerchantLayout>
      <div className="w-full min-w-0 space-y-5 font-sans">
        <PageHeader
          title="Marketing Tools"
          subtitle="Create promo codes, manage discounts, and send broadcast notifications to customers."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Growth" },
            { label: "Marketing Tools" },
          ]}
        />

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.1 }} className="mb-8 flex flex-wrap gap-2">
          <button onClick={() => setActiveTab("promo")} className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${activeTab === "promo"
            ? "bg-gradient-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Ticket className="h-4 w-4 inline mr-2"/>
            Promo Codes
          </button>
          <button onClick={() => setActiveTab("share")} className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${activeTab === "share"
            ? "bg-gradient-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Share2 className="h-4 w-4 inline mr-2"/>
            Share Links
          </button>
          <button onClick={() => setActiveTab("notify")} className={`min-h-[44px] px-4 py-2 rounded-full font-medium text-sm transition-all ${activeTab === "notify"
            ? "bg-gradient-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Send className="h-4 w-4 inline mr-2"/>
            Send Notifications
          </button>
        </motion.div>

        {/* Promo Codes Tab */}
        {activeTab === "promo" && (<motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Promo Codes</h2>
                <p className="text-muted-foreground text-sm mt-1">Create and manage discount codes</p>
              </div>
              <Button onClick={() => navigate("/merchant-dashboard/marketing/promo/new")} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2"/>
                Create Promo Code
              </Button>
            </div>

            {promoCodes.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30"/>
                  <p className="text-muted-foreground">No promo codes yet. Create one to get started!</p>
                </div>) : (<div ref={promoGridRef} className="grid gap-4">
                {promoCodes.map((promo) => (<PromoCard key={promo._id} promo={promo} onEdit={handleEditPromo} onDelete={handleDeletePromo}/>))}
              </div>)}
          </motion.div>)}

        {/* Share Links Tab */}
        {activeTab === "share" && (<motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold">Share Event Links</h2>
              <p className="text-muted-foreground text-sm mt-1">Generate shareable links for your events</p>
            </div>

            {events.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30"/>
                  <p className="text-muted-foreground">No events to share. Create an event first!</p>
                </div>) : (<div ref={eventGridRef} className="grid gap-4">
                {events.map((event) => (<EventShareCard key={event._id} event={event} onCopy={copyToClipboard}/>))}
              </div>)}
          </motion.div>)}

        {/* Send Notifications Tab */}
        {activeTab === "notify" && (<motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-bold">Send Notifications</h2>
                <p className="text-muted-foreground text-sm mt-1">Notify customers about new events and offers</p>
              </div>
              <Button onClick={() => setNotifyDialogOpen(true)} className="bg-gradient-primary">
                <Send className="h-4 w-4 mr-2"/>
                Send Notification
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="font-medium text-sm">New Event Announcement</p>
                  <p className="text-xs text-muted-foreground mt-1">Notify customers about your latest event</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="font-medium text-sm">Special Offer</p>
                  <p className="text-xs text-muted-foreground mt-1">Promote a limited-time discount or offer</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="font-medium text-sm">Event Reminder</p>
                  <p className="text-xs text-muted-foreground mt-1">Remind customers about upcoming events</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>)}



        {/* Notification Dialog */}
        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>Send a notification to your customers</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-600 font-semibold">ℹ️ How it works</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Notifications will be sent to all customers who have booked your events or services.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label>Title</Label>
                  <span className="text-[10px] text-muted-foreground">{(notifyForm.title || "").length}/50</span>
                </div>
                <Input placeholder="e.g., New Event Available" value={notifyForm.title} maxLength={50} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}/>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label>Message</Label>
                  <span className="text-[10px] text-muted-foreground">{(notifyForm.message || "").length}/250</span>
                </div>
                <Textarea placeholder="Your message here..." value={notifyForm.message} maxLength={250} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} rows={4}/>
              </div>

              <div>
                <Label>Related Event (Optional)</Label>
                <Select value={notifyForm.eventId} onValueChange={(value) => setNotifyForm({ ...notifyForm, eventId: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an event"/>
                  </SelectTrigger>
                  <SelectContent>
                    {events.length === 0 ? (<div className="p-2 text-xs text-muted-foreground">No events available</div>) : (events.map((event) => (<SelectItem key={event._id} value={event._id}>
                          {event.title}
                        </SelectItem>)))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendNotification} disabled={submitting} className="bg-gradient-primary">
                {submitting ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MerchantLayout>);
};
export default MarketingTools;
