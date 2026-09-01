import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Ticket,
  Sparkles,
  Calendar,
  Tag,
  Users,
  CheckCircle2,
  RefreshCw,
  Percent,
  IndianRupee,
  ShieldCheck,
  X
} from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  apiCreatePromoCode,
  apiGetPromoCodes,
  apiUpdatePromoCode,
  apiListMyEvents,
  apiListMyServices,
  apiListCategories
} from "@/lib/api";

const getAppliesToLabel = (val) => {
  switch (val) {
    case "ticketedEvents":
      return "Ticketed Events";
    case "fullServiceEvents":
      return "Single Ticket Events";
    case "services":
      return "Services";
    case "all":
    default:
      return "All Events & Services";
  }
};

const formatPreviewExpiry = (dateStr) => {
  if (!dateStr) return "No expiration date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "No expiration date";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

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

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoForm((prev) => ({ ...prev, code: res }));
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
        maxDiscount: promoForm.maxDiscount ? parseFloat(promoForm.maxDiscount) : null,
        isActive: true
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

  const categoryOptions = getCategoryOptions(promoForm.appliesTo) || [];
  const selectedCategoryLabel =
    promoForm.applicableCategories?.[0] === "all" || !promoForm.applicableCategories?.[0]
      ? "All Categories"
      : promoForm.applicableCategories[0];

  return (
    <MerchantLayout>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-5 space-y-5 font-sans">
        {/* Simple Page Header */}
        <div>
          <button
            onClick={() => navigate("/merchant-dashboard/marketing")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Marketing Tools
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
              {isEdit ? "Edit Promo Code" : "Create Promo Code"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build a discount offer for your customers.
            </p>
          </div>
        </div>

        {/* Two-Column Promo Builder Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* LEFT: Primary Configuration Form */}
          <div className="rounded-[14px] border border-border/70 bg-card shadow-xs p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: PROMO DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                  <Ticket className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Promo Details
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Promo Code Input with Generate Button */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Promo Code <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {(promoForm.code || "").length} / 15
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="e.g. SUMMER20"
                          value={promoForm.code}
                          maxLength={15}
                          onChange={(e) =>
                            setPromoForm({
                              ...promoForm,
                              code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                            })
                          }
                          className="h-10 text-sm font-mono tracking-widest uppercase font-semibold pl-3 pr-8 bg-background border-border/80 focus-visible:ring-primary/40 rounded-xl"
                          required
                        />
                        {promoForm.code && (
                          <button
                            type="button"
                            onClick={() => setPromoForm({ ...promoForm, code: "" })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomCode}
                        className="h-10 px-3.5 rounded-xl text-xs font-medium border-border/80 hover:bg-secondary shrink-0 cursor-pointer"
                        title="Generate random coupon code"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-primary" /> Generate
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      3–15 uppercase alphanumeric characters (e.g. SAVE20, FESTIVAL50)
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label className="text-xs font-semibold text-foreground">Description</Label>
                      <span className="text-[10px] text-muted-foreground">
                        {(promoForm.description || "").length} / 150
                      </span>
                    </div>
                    <Input
                      placeholder="e.g. Summer discount for selected bookings"
                      value={promoForm.description}
                      maxLength={150}
                      onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                      className="h-10 text-sm bg-background border-border/80 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: OFFER SETTINGS */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Offer Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Applies To */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Applies To
                    </Label>
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
                      <SelectTrigger className="h-10 text-xs bg-background border-border/80 rounded-xl">
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
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Category Scope
                    </Label>
                    <Select
                      key={promoForm.appliesTo}
                      value={promoForm.applicableCategories?.[0] || "all"}
                      onValueChange={(value) =>
                        setPromoForm({ ...promoForm, applicableCategories: [value] })
                      }
                    >
                      <SelectTrigger className="h-10 text-xs bg-background border-border/80 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoryOptions.map((cat, idx) => (
                          <SelectItem key={idx} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discount Type */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Discount Type
                    </Label>
                    <Select
                      value={promoForm.discountType}
                      onValueChange={(value) =>
                        setPromoForm({ ...promoForm, discountType: value })
                      }
                    >
                      <SelectTrigger className="h-10 text-xs bg-background border-border/80 rounded-xl">
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
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Discount Value <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        min={1}
                        max={promoForm.discountType === "percentage" ? 100 : undefined}
                        value={promoForm.discountValue || ""}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            discountValue: parseFloat(e.target.value) || 0
                          })
                        }
                        className={`h-10 text-sm font-semibold bg-background border-border/80 rounded-xl ${
                          promoForm.discountType === "percentage" ? "pr-8" : "pl-8"
                        }`}
                        required
                      />
                      {promoForm.discountType === "percentage" ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          %
                        </span>
                      ) : (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          ₹
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: USAGE & VALIDITY */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Usage & Validity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Minimum Booking Amount */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Minimum Booking Amount (₹)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        value={promoForm.minBookingAmount || ""}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            minBookingAmount: Number(e.target.value || 0)
                          })
                        }
                        className="h-10 text-sm pl-8 bg-background border-border/80 rounded-xl"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        ₹
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave 0 for no minimum spend requirement
                    </p>
                  </div>

                  {/* Max Uses */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Max Uses Limit
                    </Label>
                    <Input
                      type="number"
                      placeholder="Unlimited (or enter number)"
                      min={1}
                      value={promoForm.maxUses}
                      onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                      className="h-10 text-sm bg-background border-border/80 rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave blank for unlimited coupon redemptions
                    </p>
                  </div>

                  {/* Expiry Date */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Expiry Date
                    </Label>
                    <div className="relative">
                      <Input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={promoForm.expiryDate}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, expiryDate: e.target.value })
                        }
                        className="h-10 text-sm bg-background border-border/80 rounded-xl"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave empty if the promotion should never expire
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/merchant-dashboard/marketing")}
                  className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-10 bg-gradient-primary text-primary-foreground px-6 rounded-xl text-xs font-semibold shadow-xs hover:opacity-90 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "Saving..." : "Creating..."}
                    </>
                  ) : isEdit ? (
                    "Save Changes"
                  ) : (
                    "Create Promo Code"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* RIGHT: Live Promo Preview / Customer Summary */}
          <div className="sticky top-20 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Promo Preview
              </span>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Preview
              </span>
            </div>

            {/* Voucher Preview Card */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-card via-card to-secondary/30 p-5 shadow-xs relative overflow-hidden space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  Special Offer
                </span>
                <Ticket className="h-4 w-4 text-primary/60" />
              </div>

              {/* Promo Code Box */}
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                  Coupon Code
                </span>
                <span className="font-mono font-extrabold text-lg sm:text-xl text-primary tracking-widest block">
                  {promoForm.code ? promoForm.code : "YOUR CODE"}
                </span>
              </div>

              {/* Discount Value Display */}
              <div className="text-center space-y-0.5 py-1">
                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                  {promoForm.discountValue > 0 ? (
                    promoForm.discountType === "percentage" ? (
                      `${promoForm.discountValue}% OFF`
                    ) : (
                      `${formatCurrency(promoForm.discountValue)} OFF`
                    )
                  ) : (
                    "— % OFF"
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 px-2">
                  {promoForm.description
                    ? promoForm.description
                    : "Configure your promotion details to preview the customer offer."}
                </p>
              </div>

              {/* Terms & Conditions Summary Checklist */}
              <div className="rounded-xl bg-secondary/60 border border-border/60 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    Scope: <span className="font-semibold text-foreground">{getAppliesToLabel(promoForm.appliesTo)}</span>
                  </span>
                </div>

                {selectedCategoryLabel !== "All Categories" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      Category: <span className="font-semibold text-foreground">{selectedCategoryLabel}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    Min Booking:{" "}
                    <span className="font-semibold text-foreground">
                      {promoForm.minBookingAmount > 0
                        ? formatCurrency(promoForm.minBookingAmount)
                        : "No minimum"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    Valid:{" "}
                    <span className="font-semibold text-foreground">
                      {formatPreviewExpiry(promoForm.expiryDate)}
                    </span>
                  </span>
                </div>

                {promoForm.maxUses && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      Limit:{" "}
                      <span className="font-semibold text-foreground">
                        {promoForm.maxUses} total redemptions
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="text-center pt-1">
                <span className="text-[10px] text-muted-foreground">
                  Customers can apply this promo at checkout
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantPromoForm;
