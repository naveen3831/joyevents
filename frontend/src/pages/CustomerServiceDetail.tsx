import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, MapPin, X, Loader2, Star, CheckCircle2, Images } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { apiListServices, apiValidatePromoCode, apiGetPublicReviews } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { savePendingServiceBooking, getPendingServiceBooking, clearPendingServiceBooking } from "@/lib/bookingState";
import LocationPicker from "@/components/LocationPicker";
import SimplePayment from "@/components/SimplePayment";
import AvailablePromoCodes from "@/components/AvailablePromoCodes";

const CustomerServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn, token } = useAuth() as any;
  const navigate = useNavigate();

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedServices, setRelatedServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGetPublicReviews()
      .then((res: any) => {
        const allReviews = res.reviews || [];
        const filtered = allReviews.filter((r: any) => r.serviceId === id);
        setReviews(filtered);
      })
      .catch((err) => console.error("Failed to load reviews:", err));
  }, [id]);

  // Booking form state
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiListServices();
        const allServices = res.services || [];
        const found = allServices.find((s: any) => s._id === id);
        if (!found) { toast.error("Service not found"); navigate("/customer-dashboard/browse-services"); return; }
        setService(found);

        // Filter related services
        const related = allServices.filter((s: any) => 
          s._id !== id && 
          (s.category === found.category || s.createdBy?._id === found.createdBy?._id)
        );
        if (related.length < 3) {
          const other = allServices.filter((s: any) => 
            s._id !== id && 
            !related.some((r: any) => r._id === s._id)
          );
          related.push(...other.slice(0, 3 - related.length));
        }
        setRelatedServices(related.slice(0, 4));

        // Restore pending booking if returning from login
        const pending = getPendingServiceBooking();
        if (pending && pending.serviceId === id) {
          setDate(pending.date || "");
          setTime(pending.time || "");
          setSelectedAddOns(pending.selectedAddOns || {});
          setCustomerAddress(pending.customerAddress || "");
          setCustomerLocation(pending.customerLocation || null);
          setPromoCode(pending.promoCode || "");
          clearPendingServiceBooking();
          
          // Auto-open payment modal if date and time are selected
          if (pending.date && pending.time && pending.customerLocation) {
            setShowPaymentModal(true);
          }

          // Re-apply promo code if present
          if (pending.promoCode) {
            applyPromoByCode(pending.promoCode);
          }
        }
      } catch {
        toast.error("Failed to load service");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const imgSrc = (image: string) => image?.startsWith("http") ? image : image ? `${API_URL}${image}` : "";

  const getFinalPrice = () => {
    if (!service) return 0;
    const addOnTotal = (service.addOns || [])
      .reduce((sum: number, a: any) => sum + (Number(a.price) * (selectedAddOns[a.name] || 0)), 0);
    const base = service.price + addOnTotal;
    if (!appliedPromo) return base;
    const discount = appliedPromo.discountType === "percentage"
      ? Math.min((base * appliedPromo.discountValue) / 100, appliedPromo.maxDiscount || Infinity)
      : appliedPromo.discountValue;
    return Math.max(0, base - discount);
  };

  const applyPromoCode = async () => {
    await applyPromoByCode(promoCode);
  };

  const applyPromoByCode = async (code: string) => {
    if (!code.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }
    setPromoCode(code);
    setPromoError("");
    try {
      setAppliedPromo(null);
      
      if (!service) return;
      const addOnTotal = (service.addOns || [])
        .reduce((sum: number, a: any) => sum + (Number(a.price) * (selectedAddOns[a.name] || 0)), 0);
      const basePrice = service.price + addOnTotal;

      const data = await apiValidatePromoCode(code.toUpperCase(), basePrice, undefined, service?._id, token || undefined);
      setAppliedPromo(data.promo);
      toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
    } catch (error: any) {
      setPromoError(error?.message || "Failed to apply promo code");
      setAppliedPromo(null);
      toast.error(error?.message || "Failed to apply promo code");
    }
  };

  const handleBookNow = async () => {
    if (!isLoggedIn || !token) {
      const returnUrl = `/customer-dashboard/services/${service._id}`;
      savePendingServiceBooking({
        serviceId: service._id, serviceName: service.name, servicePrice: service.price,
        date, time, selectedAddOns, customerAddress, customerLocation, promoCode,
        returnTo: returnUrl,
      });
      localStorage.setItem("authReturnTo", returnUrl);
      toast.error("Please sign in to book");
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!date || !time) { toast.error("Please select date and time"); return; }
    if (!customerLocation || !customerAddress) { toast.error("Please provide your location"); return; }
    
    // Updated flow: Submit for approval instead of opening payment modal
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: service._id,
          serviceName: service.name,
          price: getFinalPrice(),
          date,
          time,
          addOns: (service.addOns || [])
            .filter((a: any) => (selectedAddOns[a.name] || 0) > 0)
            .map((a: any) => ({ name: a.name, price: a.price, quantity: selectedAddOns[a.name] || 1 })),
          promoCode: appliedPromo,
          customerLocation: { address: customerAddress, latitude: customerLocation.lat, longitude: customerLocation.lng }
        })
      });

      if (res.ok) {
        toast.success("Booking request submitted! Waiting for merchant approval.");
        clearPendingServiceBooking();
        navigate("/customer-dashboard/bookings");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit booking");
      }
    } catch (error) {
      toast.error("An error occurred while submitting booking");
    }
  };

  if (loading) return (
    <CustomerLayout>
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading service…
      </div>
    </CustomerLayout>
  );

  if (!service) return null;

  return (
    <CustomerLayout>
      <div className="min-h-screen">
        {/* Back button */}
        <div className="px-3 sm:px-6 lg:px-12 pt-4 sm:pt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/customer-dashboard/browse-services")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Services
          </Button>
        </div>

        {/* Split layout */}
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] px-3 sm:px-6 lg:px-12 gap-4 sm:gap-8 pb-8 sm:pb-12 mt-4 sm:mt-6">

          {/* LEFT — Image + Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2 bg-card rounded-2xl border border-border overflow-hidden flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary shrink-0">
              {imgSrc(service.image) ? (
                <img src={imgSrc(service.image)} alt={service.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Briefcase className="h-24 w-24 opacity-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Overlay text */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                {service.category && (
                  <span className="inline-block rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-xs font-semibold text-primary mb-3">
                    {service.category}
                  </span>
                )}
                <h1 className="font-display text-4xl font-bold text-white leading-tight">{service.name}</h1>
                {/* Rating display */}
                {service.averageRating && service.averageRating > 0 ? (
                  <div className="flex items-center gap-1.5 mt-2 text-white">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
                    <span className="text-sm font-semibold">
                      {service.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-white/70">
                      ({service.ratingCount || 0} reviews)
                    </span>
                  </div>
                ) : null}
                <p className="mt-2 text-white/70 text-sm">
                  Starting from <span className="text-white font-bold text-lg">{formatCurrency(service.price)}</span>
                </p>
              </div>
            </div>

            {/* Info below image */}
            <div className="border-t border-border p-8 flex-1">
              {service.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> About This Service
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                </div>
              )}

              {service.highlights?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" /> Highlights
                  </h3>
                  <ul className="space-y-2">
                    {service.highlights.map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary font-bold mt-0.5">✓</span>{h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {service.addOns?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" /> Available Add-ons
                  </h3>
                  <div className="space-y-2">
                    {service.addOns.map((addon: any) => (
                      <div key={addon.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                        <span className="text-sm font-medium">{addon.name}</span>
                        <span className="text-sm font-semibold text-primary">+{formatCurrency(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {service.createdBy && (
                <div className="rounded-lg bg-card border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Service Provider</p>
                  <p className="font-semibold text-sm">{service.createdBy.name || service.createdBy.email}</p>
                  {service.createdBy.email && (
                    <a href={`mailto:${service.createdBy.email}`} className="text-xs text-primary hover:underline mt-1 block">
                      📧 {service.createdBy.email}
                    </a>
                  )}
                </div>
              )}

              {/* Gallery */}
              {service.gallery?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Images className="h-4 w-4 text-primary" /> Gallery ({service.gallery.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 font-semibold"
                      onClick={() => setShowGallery(!showGallery)}
                    >
                      {showGallery ? "Hide Gallery" : "View Gallery"}
                    </Button>
                  </div>
                  {showGallery && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {service.gallery.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity"
                        >
                          <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Section */}
              <div className="mt-8 border-t border-border pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Customer Reviews ({reviews.length})
                  </h3>
                  {reviews.length > 2 && (
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowAllReviewsModal(true)}>
                      View All
                    </Button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No reviews yet for this service.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 2).map((review) => (
                      <div key={review._id} className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                              {review.customerName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{review.customerName}</p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.ratedAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        {review.comment ? (
                          <p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Booking Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2 bg-card rounded-2xl border border-border"
          >
            <div className="p-8 max-w-lg mx-auto">
              <h2 className="font-display text-2xl font-bold mb-1">Book This Service</h2>
              <p className="text-muted-foreground text-sm mb-8">Fill in the details below to confirm your booking</p>

              <div className="space-y-6">
                {/* Date & Time */}
                <div>
                  <p className="text-sm font-semibold mb-3">Date & Time</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Select Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Select Time</label>
                      <input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                {service.addOns?.length > 0 && (
                  <div className="border-t border-border pt-6">
                    <p className="text-sm font-semibold mb-3">Optional Add-ons</p>
                    <div className="space-y-2">
                      {service.addOns.map((addon: any) => {
                        const minQty = addon.minQuantity || 1;
                        const maxQty = addon.maxQuantity || 1;
                        const label = addon.guestLabel || "guests";
                        const qty = selectedAddOns[addon.name] || 0;

                        // No guest count — simple toggle (checkbox style)
                        if (!addon.showGuestCount) {
                          return (
                            <div key={addon.name}
                              onClick={() => setSelectedAddOns(p => { const n = {...p}; if (n[addon.name]) delete n[addon.name]; else n[addon.name] = 1; return n; })}
                              className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                                qty > 0 ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary"
                              }`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${qty > 0 ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                                  {qty > 0 && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>
                                <span className="text-sm font-medium">{addon.name}</span>
                              </div>
                              <span className="text-sm font-semibold text-primary">+{formatCurrency(addon.price)}</span>
                            </div>
                          );
                        }

                        // Guest count enabled — show stepper
                        return (
                          <div key={addon.name}
                            className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                              qty > 0 ? "border-primary bg-primary/10" : "border-border bg-card"
                            }`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{addon.name}</p>
                              <p className="text-xs text-primary font-semibold">{formatCurrency(addon.price)} per {label}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button disabled={qty <= 0}
                                onClick={() => setSelectedAddOns(p => { const n = {...p}; if ((n[addon.name] || 0) > 1) n[addon.name]--; else delete n[addon.name]; return n; })}
                                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold disabled:opacity-40 transition-colors text-sm">−</button>
                              <div className="text-center w-16">
                                <span className={`font-bold text-sm ${qty > 0 ? "text-primary" : "text-muted-foreground"}`}>{qty || 0}</span>
                                <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
                              </div>
                              <button
                                onClick={() => setSelectedAddOns(p => ({ ...p, [addon.name]: (p[addon.name] || 0) + 1 }))}
                                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 font-bold transition-colors text-sm">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="border-t border-border pt-6">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Your Location
                  </p>
                  {customerAddress ? (
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                      <span className="text-sm text-foreground">{customerAddress}</span>
                      <button onClick={() => { setCustomerAddress(""); setCustomerLocation(null); }} className="text-muted-foreground hover:text-foreground ml-2">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setShowLocationPicker(v => !v)}>
                      <MapPin className="h-4 w-4 mr-2" /> Pick Location on Map
                    </Button>
                  )}
                  {showLocationPicker && (
                    <div className="mt-3">
                      <LocationPicker onLocationSelect={(loc, addr) => {
                        setCustomerLocation(loc);
                        setCustomerAddress(String(addr));
                        setShowLocationPicker(false);
                      }} />
                    </div>
                  )}
                </div>

                {/* Promo Code */}
                <div className="border-t border-border pt-6">
                  <p className="text-sm font-semibold mb-3">Promo Code</p>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                      <span className="font-mono font-bold text-green-600 text-sm">{appliedPromo.code} applied</span>
                      <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }} className="text-green-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={e => { setPromoCode(e.target.value); setPromoError(""); }}
                        className="h-10"
                      />
                      <Button variant="outline" onClick={applyPromoCode} className="h-10 px-5">Apply</Button>
                    </div>
                  )}
                  {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
                  <AvailablePromoCodes
                      onApply={applyPromoByCode}
                      appliedCode={appliedPromo?.code}
                      serviceId={service._id}
                      merchantId={service.createdBy?._id || service.createdBy}
                      context="service"
                      itemCategory={service.category}
                    />
                </div>

                {/* Price Summary */}
                <div className="border-t border-border pt-6">
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Base price</span>
                      <span className="text-sm font-medium">{formatCurrency(service.price)}</span>
                    </div>
                    {Object.keys(selectedAddOns).length > 0 && (
                      <div className="space-y-1 mb-2">
                        {(service.addOns || []).filter((a: any) => (selectedAddOns[a.name] || 0) > 0).map((a: any) => (
                          <div key={a.name} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{a.name} × {selectedAddOns[a.name]} {a.guestLabel || "guests"}</span>
                            <span className="text-xs font-medium">+{formatCurrency(Number(a.price) * selectedAddOns[a.name])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {appliedPromo && (
                      <div className="flex items-center justify-between mb-2 text-green-600">
                        <span className="text-sm">Discount</span>
                        <span className="text-sm font-medium">
                          -{appliedPromo.discountType === "percentage" ? `${appliedPromo.discountValue}%` : `${formatCurrency(appliedPromo.discountValue)}`}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-primary/20 mt-3 pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(getFinalPrice())}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base bg-gradient-primary text-primary-foreground hover:opacity-90"
                  onClick={handleBookNow}
                >
                  Confirm Booking — {formatCurrency(getFinalPrice())}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Services Section */}
        {relatedServices.length > 0 && (
          <div className="px-3 sm:px-6 lg:px-12 mt-16 pt-12 pb-16 border-t border-border">
            <h2 className="font-display text-2xl font-bold mb-6">Related Services</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {relatedServices.map((r) => (
                <div
                  key={r._id}
                  onClick={() => navigate(`/customer-dashboard/services/${r._id}`)}
                  className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden flex-shrink-0">
                    {r.image ? (
                      <img
                        src={imgSrc(r.image)}
                        alt={r.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Briefcase className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {r.category && (
                      <span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                        {r.category}
                      </span>
                    )}
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                      From {formatCurrency(r.price)}
                    </span>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {r.name}
                    </h3>
                    {r.averageRating && r.averageRating > 0 ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        <span className="text-xs font-semibold">
                          {r.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({r.ratingCount || 0})
                        </span>
                      </div>
                    ) : null}
                    {r.createdBy && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Provider: <span className="font-medium text-foreground">{r.createdBy.name || r.createdBy.email}</span>
                      </p>
                    )}
                    {r.highlights?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {r.highlights.slice(0, 2).map((h: string, hi: number) => (
                          <li key={hi} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <SimplePayment
              amount={getFinalPrice()}
              bookingData={{
                serviceName: service.name,
                serviceId: service._id,
                date, time,
                addOns: (service.addOns || [])
                  .filter((a: any) => (selectedAddOns[a.name] || 0) > 0)
                  .map((a: any) => ({ name: a.name, price: a.price, quantity: selectedAddOns[a.name] || 1 })),
                promoCode: appliedPromo,
                customerLocation: customerLocation
                  ? { address: customerAddress, lat: customerLocation.lat, lng: customerLocation.lng }
                  : undefined,
              }}
              onSuccess={() => {
                setShowPaymentModal(false);
                clearPendingServiceBooking();
                toast.success("Booking confirmed!");
                navigate("/customer-dashboard/bookings");
              }}
              onError={() => {}}
              onClose={() => setShowPaymentModal(false)}
            />
          </div>
        </div>
      )}

      {/* Gallery Lightbox */}
      {lightboxIndex !== null && service?.gallery?.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-7 w-7" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! - 1 + service.gallery.length) % service.gallery.length); }}
          >‹</button>
          <img
            src={imgSrc(service.gallery[lightboxIndex])}
            alt={`Gallery ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl font-bold px-3"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i! + 1) % service.gallery.length); }}
          >›</button>
          <p className="absolute bottom-4 text-white/50 text-sm">{lightboxIndex + 1} / {service.gallery.length}</p>
        </div>
      )}

      {/* View All Reviews Modal */}
      <Dialog open={showAllReviewsModal} onOpenChange={setShowAllReviewsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              All Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 pr-2">
            {reviews.map((review) => (
              <div key={review._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.customerName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.ratedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {review.comment ? (
                  <p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};

export default CustomerServiceDetail;






