import { apiGetServiceById, apiCheckFavorite, apiAddFavorite, apiRemoveFavorite, apiValidatePromoCode, apiListServices, apiGetPublicReviews } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Heart, CheckCircle, X, ChevronLeft, ChevronRight, Tag, Star, Images, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import SimplePayment from "@/components/SimplePayment";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import AvailablePromoCodes from "@/components/AvailablePromoCodes";
import { savePendingServiceBooking } from "@/lib/bookingState";
const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, token } = useAuth();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteId, setFavoriteId] = useState(null);
    const [favLoading, setFavLoading] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [relatedServices, setRelatedServices] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;
    useEffect(() => {
        if (!id)
            return;
        apiGetPublicReviews()
            .then((res) => {
            const allReviews = res.reviews || [];
            const filtered = allReviews.filter((r) => r.serviceId === id);
            setReviews(filtered);
        })
            .catch((err) => console.error("Failed to load reviews:", err));
    }, [id]);
    useEffect(() => {
        const load = async () => {
            try {
                const [res, allServicesRes] = await Promise.all([
                    apiGetServiceById(id),
                    apiListServices()
                ]);
                const currentService = res.service;
                setService(currentService);
                const allServices = allServicesRes.services || [];
                const related = allServices.filter((s) => s._id !== id &&
                    (s.category === currentService.category || s.createdBy?._id === currentService.createdBy?._id));
                if (related.length < 3) {
                    const other = allServices.filter((s) => s._id !== id &&
                        !related.some((r) => r._id === s._id));
                    related.push(...other.slice(0, 3 - related.length));
                }
                setRelatedServices(related.slice(0, 4));
            }
            catch {
                toast.error("Failed to load service");
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);
    useEffect(() => {
        if (!service || !isLoggedIn || !token)
            return;
        apiCheckFavorite("service", service._id, token)
            .then((res) => { setIsFavorited(res.isFavorited); setFavoriteId(res.favoriteId || null); })
            .catch(() => { });
    }, [service?._id, isLoggedIn, token]);
    const handleToggleFavorite = async () => {
        if (!isLoggedIn || !token) {
            toast.error("Please sign in to save favorites");
            return;
        }
        setFavLoading(true);
        try {
            if (isFavorited && favoriteId) {
                await apiRemoveFavorite(favoriteId, token);
                setIsFavorited(false);
                setFavoriteId(null);
                toast.success("Removed from favorites");
            }
            else {
                const res = await apiAddFavorite(null, service._id, "service", token);
                setIsFavorited(true);
                setFavoriteId(res.favorite?._id || null);
                toast.success("Saved to favorites");
            }
        }
        catch {
            toast.error("Failed to update favorites");
        }
        finally {
            setFavLoading(false);
        }
    };
    const applyPromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoError("Please enter a promo code");
            return;
        }
        try {
            setPromoError("");
            const data = await apiValidatePromoCode(promoCode.toUpperCase(), service.price, undefined, service._id, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const applyPromoByCode = async (code) => {
        if (!code?.trim())
            return;
        try {
            setPromoCode(code);
            setPromoError("");
            const data = await apiValidatePromoCode(code.toUpperCase(), service?.price || 0, undefined, service?._id, token || undefined);
            setAppliedPromo(data.promo);
            toast.success(`Promo applied! You save ${formatCurrency(data.discount)}`);
        }
        catch (error) {
            setPromoError(error?.message || "Failed to validate promo code");
            setAppliedPromo(null);
        }
    };
    const getFinalPrice = () => {
        if (!appliedPromo || !service)
            return service?.price || 0;
        const discount = appliedPromo.discountType === "percentage"
            ? Math.min((service.price * appliedPromo.discountValue) / 100, appliedPromo.maxDiscount || Infinity)
            : appliedPromo.discountValue;
        return Math.max(0, service.price - discount);
    };
    if (loading)
        return (<Layout>
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading service...</div>
    </Layout>);
    if (!service)
        return (<Layout>
      <div className="container mx-auto py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Service Not Found</h1>
        <Link to="/services" className="mt-4 inline-block text-primary hover:underline">Back to Services</Link>
      </div>
    </Layout>);
    return (<Layout>
      <div className="min-h-screen">
        <div className="px-3 sm:px-6 lg:px-12 pt-4 sm:pt-6">
          <Link to="/services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4"/> Back to Services
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row px-3 sm:px-6 lg:px-12 gap-4 sm:gap-8 pb-8 sm:pb-12 mt-4 sm:mt-6">
          {/* LEFT — Image + Info */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/2">
            <div className="flex flex-col">
              {/* Hero image */}
              <div className="relative min-h-72 lg:h-[55vh] overflow-hidden bg-secondary">
                {imgSrc(service.image) ? (<img src={imgSrc(service.image)} alt={service.name} className="h-full w-full object-cover"/>) : (<div className="flex h-full items-center justify-center"><Briefcase className="h-24 w-24 opacity-10"/></div>)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  {service.category && (<span className="inline-block rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-xs font-semibold text-primary mb-3">
                      {service.category}
                    </span>)}
                  <h1 className="font-display text-4xl font-bold text-white leading-tight">{service.name}</h1>
                  {/* Rating display */}
                  {service.averageRating && service.averageRating > 0 ? (<div className="flex items-center gap-1.5 mt-2 text-white">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0"/>
                      <span className="text-sm font-semibold">
                        {service.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-white/70">
                        ({service.ratingCount || 0} reviews)
                      </span>
                    </div>) : null}
                  {service.createdBy?.name && (<p className="mt-2 text-white/70 text-sm">By <span className="text-white font-medium">{service.createdBy.name}</span></p>)}
                  <p className="mt-2 text-white/70 text-sm">Starting from <span className="text-white font-bold text-lg">{formatCurrency(service.price)}</span></p>
                </div>
              </div>

              {/* Info panel */}
              <div className="bg-card border-t border-border p-8">
                {service.description && (<div className="mb-6">
                    <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary"/> About This Service
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                  </div>)}

                {service.highlights?.length > 0 && (<div className="mb-6">
                    <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary"/> What's Included
                    </h3>
                    <ul className="space-y-2">
                      {service.highlights.map((h, i) => (<li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-bold mt-0.5">✓</span>{h}
                        </li>))}
                    </ul>
                  </div>)}

                {service.createdBy && (<div className="mb-6 rounded-lg bg-card border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Service Provider</p>
                    <p className="font-semibold text-sm">{service.createdBy.name}</p>
                    {service.createdBy.email && (<a href={`mailto:${service.createdBy.email}`} className="text-xs text-primary hover:underline mt-1 block">
                        📧 {service.createdBy.email}
                      </a>)}
                  </div>)}

                {/* Gallery */}
                {service.gallery?.length > 0 && (<div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <Images className="h-4 w-4 text-primary"/> Gallery ({service.gallery.length})
                      </h3>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowGallery(!showGallery)}>
                        {showGallery ? "Hide Gallery" : "View Gallery"}
                      </Button>
                    </div>
                    {showGallery && (<div className="grid grid-cols-3 gap-2 mt-2">
                        {service.gallery.map((img, idx) => (<button key={idx} onClick={() => setLightboxIndex(idx)} className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity">
                            <img src={imgSrc(img)} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover"/>
                          </button>))}
                      </div>)}
                  </div>)}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={handleToggleFavorite} disabled={favLoading}>
                    <Heart className={`mr-2 h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}/>
                    {isFavorited ? "Saved" : "Save"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}>
                    <Share2 className="mr-2 h-4 w-4"/> Share
                  </Button>
                </div>

                {/* Reviews Section */}
                <div className="mt-8 border-t border-border pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500"/>
                      Customer Reviews ({reviews.length})
                    </h3>
                    {reviews.length > 2 && (<Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold" onClick={() => setShowAllReviewsModal(true)}>
                        View All
                      </Button>)}
                  </div>

                  {reviews.length === 0 ? (<p className="text-sm text-muted-foreground italic">No reviews yet for this service.</p>) : (<div className="space-y-4">
                      {reviews.slice(0, 2).map((review) => (<div key={review._id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {review.customerName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{review.customerName}</p>
                                <div className="flex gap-0.5 mt-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`h-3 w-3 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}/>))}
                                </div>
                              </div>
                            </div>
                            {review.ratedAt && (<span className="text-xs text-muted-foreground">
                                {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })}
                              </span>)}
                          </div>
                          {review.comment ? (<p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>) : (<p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>)}
                        </div>))}
                    </div>)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Booking */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/2 bg-card rounded-2xl border border-border">
            <div className="p-8 max-w-lg mx-auto">
              <h2 className="font-display text-2xl font-bold mb-1">Book This Service</h2>
              <p className="text-muted-foreground text-sm mb-8">Fill in the details to confirm your booking</p>

              <div className="space-y-6">
                {/* Add-ons */}
                {service.addOns?.length > 0 && (<div>
                    <p className="text-sm font-semibold mb-3">Optional Add-ons</p>
                    <div className="space-y-2">
                      {service.addOns.map((addon) => (<div key={addon.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                          <span className="text-sm font-medium">{addon.name}</span>
                          <span className="text-sm font-semibold text-primary">+{formatCurrency(addon.price)}</span>
                        </div>))}
                    </div>
                  </div>)}

                {/* Promo Code */}
                <div className="border-t border-border pt-6">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary"/> Promo Code
                  </p>
                  {appliedPromo ? (<div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                      <span className="font-mono font-bold text-green-600 text-sm">{appliedPromo.code} applied</span>
                      <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }} className="text-green-600"><X className="h-4 w-4"/></button>
                    </div>) : (<div className="flex gap-2">
                      <Input placeholder="Enter promo code" value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoError(""); }} className="h-10"/>
                      <Button variant="outline" onClick={applyPromoCode} className="h-10 px-5">Apply</Button>
                    </div>)}
                  {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
                  <AvailablePromoCodes onApply={applyPromoByCode} appliedCode={appliedPromo?.code} serviceId={service._id} merchantId={service.createdBy?._id || service.createdBy} context="service" itemCategory={service.category}/>
                </div>

                {/* Price Summary */}
                <div className="border-t border-border pt-6">
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Base price</span>
                      <span className="text-sm font-medium">{formatCurrency(service.price)}</span>
                    </div>
                    {appliedPromo && (<div className="flex items-center justify-between mb-2 text-green-600">
                        <span className="text-sm">Discount</span>
                        <span className="text-sm font-medium">
                          -{appliedPromo.discountType === "percentage" ? `${appliedPromo.discountValue}%` : `${formatCurrency(appliedPromo.discountValue)}`}
                        </span>
                      </div>)}
                    <div className="border-t border-primary/20 mt-3 pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-display text-2xl font-bold text-gradient">{formatCurrency(getFinalPrice())}</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full h-12 text-base bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => {
            console.log('🔧 Book Now clicked - isLoggedIn:', isLoggedIn, 'hasToken:', !!token);
            if (!isLoggedIn || !token) {
                const returnUrl = `/customer-dashboard/services/${id}`;
                console.log('💾 SAVING authReturnTo:', returnUrl);
                // Save pending state for restoration after login
                savePendingServiceBooking({
                    serviceId: service._id,
                    serviceName: service.name,
                    servicePrice: service.price,
                    date: "", // Initial values for detail page
                    time: "",
                    selectedAddOns: [],
                    customerAddress: "",
                    customerLocation: null,
                    promoCode: appliedPromo?.code || promoCode,
                    returnTo: returnUrl
                });
                localStorage.setItem("authReturnTo", returnUrl);
                console.log('✅ Saved to localStorage. Current value:', localStorage.getItem("authReturnTo"));
                toast.error("Please sign in to book this service");
                navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
                return;
            }
            setShowPaymentModal(true);
        }}>
                  Book Now — {formatCurrency(getFinalPrice())}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Services Section */}
        {relatedServices.length > 0 && (<div className="px-3 sm:px-6 lg:px-12 mt-16 pt-12 pb-16 border-t border-border w-full relative z-10">
            <h2 className="font-display text-3xl font-black tracking-tight mb-8">Related Services</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
              {relatedServices.map((r) => (<div key={r._id} onClick={() => navigate(`/services/${r._id}`)} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 pointer-events-auto cursor-pointer">
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden flex-shrink-0">
                    {r.image ? (<img src={imgSrc(r.image)} alt={r.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center">
                        <Briefcase className="h-8 w-8 opacity-20"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    {r.category && (<span className="absolute top-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                        {r.category}
                      </span>)}
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                      From {formatCurrency(r.price)}
                    </span>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col flex-1">
                    <Link to={`/services/${r._id}`}>
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer">
                        {r.name}
                      </h3>
                    </Link>
                    {r.averageRating && r.averageRating > 0 ? (<div className="flex items-center gap-1 mt-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0"/>
                        <span className="text-xs font-semibold">
                          {r.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({r.ratingCount || 0})
                        </span>
                      </div>) : null}
                    {r.createdBy && (<p className="text-[10px] text-muted-foreground mt-1">
                        Provider: <span className="font-medium text-foreground">{r.createdBy.name || r.createdBy.email}</span>
                      </p>)}
                    {r.highlights?.length > 0 && (<ul className="mt-3 space-y-1">
                        {r.highlights.slice(0, 2).map((h, hi) => (<li key={hi} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>
                            {h}
                          </li>))}
                      </ul>)}
                  </div>
                </div>))}
            </div>
          </div>)}
      </div>

      {/* Gallery Lightbox */}
      {lightboxIndex !== null && service?.gallery?.length > 0 && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-7 w-7"/>
          </button>
          {lightboxIndex > 0 && (<button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={e => { e.stopPropagation(); setLightboxIndex(i => i - 1); }}>
              <ChevronLeft className="h-10 w-10"/>
            </button>)}
          <img src={imgSrc(service.gallery[lightboxIndex])} alt={`Gallery ${lightboxIndex + 1}`} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}/>
          {lightboxIndex < service.gallery.length - 1 && (<button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={e => { e.stopPropagation(); setLightboxIndex(i => i + 1); }}>
              <ChevronRight className="h-10 w-10"/>
            </button>)}
          <p className="absolute bottom-4 text-white/50 text-sm">{lightboxIndex + 1} / {service.gallery.length}</p>
        </div>)}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payment & Booking Details</DialogTitle></DialogHeader>
          {service && (<SimplePayment amount={getFinalPrice()} bookingData={{
                serviceName: service.name,
                serviceId: service._id,
                date: new Date().toISOString().split("T")[0],
                time: new Date().toTimeString().split(" ")[0].slice(0, 5),
                promoCode: appliedPromo,
                originalAmount: service.price,
                discount: service.price - getFinalPrice(),
            }} onSuccess={() => {
                setShowPaymentModal(false);
                toast.success("Booking submitted!");
                navigate("/customer-dashboard/bookings");
            }} onError={() => { }} onClose={() => setShowPaymentModal(false)}/>)}
        </DialogContent>
      </Dialog>

      {/* View All Reviews Modal */}
      <Dialog open={showAllReviewsModal} onOpenChange={setShowAllReviewsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500"/>
              All Reviews ({reviews.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 pr-2">
            {reviews.map((review) => (<div key={review._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.customerName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.customerName}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`h-3 w-3 ${s <= review.score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}/>))}
                      </div>
                    </div>
                  </div>
                  {review.ratedAt && (<span className="text-xs text-muted-foreground">
                      {new Date(review.ratedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                })}
                    </span>)}
                </div>
                {review.comment ? (<p className="text-sm text-muted-foreground pl-10 italic">"{review.comment}"</p>) : (<p className="text-xs text-muted-foreground pl-10 italic">Rated {review.score}/5 stars</p>)}
              </div>))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>);
};
export default ServiceDetail;
