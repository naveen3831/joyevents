import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  apiCreatePromoCode,
  apiGetPromoCodes,
  apiUpdatePromoCode,
  apiListMyEvents,
  apiListMyServices,
  apiListCategories
} from "@/lib/api";

const MerchantPromoForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [ticketedEventCategories, setTicketedEventCategories] = useState([]);
  const [fullServiceEventCategories, setFullServiceEventCategories] = useState([]);

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

  useEffect(() => {
    loadCategoriesAndEvents();
  }, [token]);

  useEffect(() => {
    if (isEdit && token) {
      loadPromoCode();
    }
  }, [id, token]);

  const loadCategoriesAndEvents = async () => {
    try {
      const [eventsRes, servicesRes, eventCatsRes, serviceCatsRes] = await Promise.all([
        apiListMyEvents(token).catch(() => ({ events: [] })),
        apiListMyServices(token).catch(() => ({ services: [] })),
        apiListCategories("event").catch(() => ({ categories: [] })),
        apiListCategories("service").catch(() => ({ categories: [] }))
      ]);

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
      setEventCategories(Array.from(new Set([...eCats, ...eventItemCats])).sort());
      setServiceCategories(Array.from(new Set([...sCats, ...serviceItemCats])).sort());
      setTicketedEventCategories(Array.from(new Set([...ticketedItemCats])).sort());
      setFullServiceEventCategories(Array.from(new Set([...fullServiceItemCats])).sort());
    } catch {
      toast.error("Failed to load category information");
    }
  };

  const loadPromoCode = async () => {
    try {
      setLoading(true);
      const res = await apiGetPromoCodes(token);
      const existing = (res.promoCodes || []).find((p) => p._id === id);
      if (existing) {
        setPromoForm({
          code: existing.code || "",
          description: existing.description || "",
          appliesTo: existing.appliesTo || "all",
          applicableCategories: existing.applicableCategories?.length > 0 ? existing.applicableCategories : ["all"],
          discountType: existing.discountType || "percentage",
          discountValue: existing.discountValue || 0,
          maxUses: existing.maxUses != null ? String(existing.maxUses) : "",
          expiryDate: existing.expiryDate ? existing.expiryDate.split("T")[0] : "",
          minBookingAmount: existing.minBookingAmount || 0,
          maxDiscount: existing.maxDiscount != null ? String(existing.maxDiscount) : ""
        });
      } else {
        toast.error("Promo code not found");
        navigate("/merchant-dashboard/marketing");
      }
    } catch (err) {
      toast.error(err.message || "Failed to load promo code details");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryOptions = (appliesTo) => {
    if (appliesTo === "services") return serviceCategories;
    if (appliesTo === "ticketedEvents")
      return ticketedEventCategories.length > 0 ? ticketedEventCategories : eventCategories;
    if (appliesTo === "fullServiceEvents")
      return fullServiceEventCategories.length > 0 ? fullServiceEventCategories : eventCategories;
    return categories;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      if (isEdit) {
        await apiUpdatePromoCode(id, payload, token);
        toast.success("Promo code updated successfully");
      } else {
        await apiCreatePromoCode(payload, token);
        toast.success("Promo code created successfully");
      }
      window.dispatchEvent(new CustomEvent("marketingUpdated"));
      navigate("/merchant-dashboard/marketing");
    } catch (error) {
      toast.error(error.message || "Failed to save promo code");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading promo code details…
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="w-full max-w-4xl mx-auto space-y-6 font-sans py-4">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/merchant-dashboard/marketing")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Marketing Tools
          </button>
        </div>

        <PageHeader
          title={isEdit ? "Edit Promo Code" : "Create Promo Code"}
          subtitle={
            isEdit
              ? "Update discount code details and settings for your customers."
              : "Create a new discount code for your customers."
          }
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Marketing Tools", to: "/merchant-dashboard/marketing" },
            { label: isEdit ? "Edit Code" : "New Code" }
          ]}
        />

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Promo Code Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Code */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">
                      Promo Code <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{(promoForm.code || "").length}/15</span>
                  </div>
                  <Input
                    placeholder="e.g., SUMMER20"
                    value={promoForm.code}
                    maxLength={15}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      })
                    }
                    className="h-10 text-sm font-mono tracking-wide"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">3–15 uppercase alphanumeric characters</p>
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold">Description</Label>
                    <span className="text-[10px] text-muted-foreground">{(promoForm.description || "").length}/150</span>
                  </div>
                  <Input
                    placeholder="e.g., Summer discount"
                    value={promoForm.description}
                    maxLength={150}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Applies To */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Applies To</Label>
                  <Select
                    value={promoForm.appliesTo}
                    onValueChange={(value) => {
                      setPromoForm({
                        ...promoForm,
                        appliesTo: value,
                        applicableCategories: ["all"]
                      });
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All (Events + Services)</SelectItem>
                      <SelectItem value="ticketedEvents">Ticketed Events</SelectItem>
                      <SelectItem value="fullServiceEvents">Single Ticket Events</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Applicable Categories */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Applicable Categories</Label>
                  <Select
                    key={promoForm.appliesTo}
                    value={promoForm.applicableCategories?.[0] || "all"}
                    onValueChange={(value) => setPromoForm({ ...promoForm, applicableCategories: [value] })}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(getCategoryOptions(promoForm.appliesTo) || []).map((cat, idx) => (
                        <SelectItem key={idx} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Discount Type */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Discount Type</Label>
                  <Select
                    value={promoForm.discountType}
                    onValueChange={(value) => setPromoForm({ ...promoForm, discountType: value })}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Discount Value */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Discount Value ({promoForm.discountType === "percentage" ? "%" : "₹"}) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={1}
                    max={promoForm.discountType === "percentage" ? 100 : undefined}
                    value={promoForm.discountValue || ""}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: parseFloat(e.target.value) || 0 })}
                    className="h-10 text-sm"
                    required
                  />
                </div>

                {/* Minimum Booking Amount */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Minimum Booking Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={promoForm.minBookingAmount || ""}
                    onChange={(e) => setPromoForm({ ...promoForm, minBookingAmount: Number(e.target.value || 0) })}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Max Uses */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Max Uses (Leave empty for unlimited)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={promoForm.maxUses}
                    onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Expiry Date */}
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">Expiry Date</Label>
                  <Input
                    type="date"
                    value={promoForm.expiryDate}
                    onChange={(e) => setPromoForm({ ...promoForm, expiryDate: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/merchant-dashboard/marketing")}
                  className="px-5"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-gradient-primary px-6">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "Saving..." : "Creating..."}
                    </>
                  ) : isEdit ? (
                    "Save Changes"
                  ) : (
                    "Create Code"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantPromoForm;
