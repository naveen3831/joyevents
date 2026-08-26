import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Store,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
  Star
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { apiGetBooking } from "@/lib/api";
import { StatusBadge } from "@/components/common/table/StatusBadge";

const AdminBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookingDetail = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiGetBooking(id, token);
      if (res.booking) {
        setBooking(res.booking);
      } else {
        setError("Booking details not found.");
      }
    } catch (e) {
      setError(e?.message || "Failed to load booking details");
      toast.error(e?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      loadBookingDetail();
    }
  }, [id, token]);

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-4 font-sans">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/admin-dashboard/bookings")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Bookings
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading booking details...
          </div>
        ) : error || !booking ? (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "Booking Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-3">The requested booking does not exist or has been removed.</p>
            <Link to="/admin-dashboard/bookings" className="text-primary font-semibold text-xs hover:underline">
              Return to Bookings List
            </Link>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Header / Summary Card */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Booking ID: <span className="font-mono">{booking._id}</span>
                    </span>
                    {booking.service ? (
                      <StatusBadge status="service" label="Service" />
                    ) : booking.event ? (
                      <StatusBadge status="event" label="Event" className="bg-purple-500/15 text-purple-600 border-purple-500/30" />
                    ) : null}
                  </div>
                  <h1 className="font-semibold text-lg sm:text-xl text-foreground leading-tight truncate">
                    {booking.service?.name || booking.event?.title || booking.serviceName || "Booking Details"}
                  </h1>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Booking Status:</span>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Payment Status:</span>
                      <StatusBadge status={booking.paymentStatus || "pending"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Layout for details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer Details
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Name</span>
                      <span className="font-semibold text-foreground">{booking.customer?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-medium">Email Address</span>
                      <span className="font-semibold text-foreground truncate max-w-[180px]" title={booking.customer?.email}>
                        {booking.customer?.email || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Merchant Information */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Assigned Merchant
                  </h3>
                  <div className="space-y-2 text-xs">
                    {booking.assignedTo ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground font-medium">Merchant Name</span>
                          <span className="font-semibold text-foreground">{booking.assignedTo.name}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground font-medium">Email Address</span>
                          <span className="font-semibold text-foreground truncate max-w-[180px]" title={booking.assignedTo.email}>
                            {booking.assignedTo.email}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-2 text-center text-muted-foreground italic">
                        Unassigned / Direct booking
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Time details */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Schedule & Location
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Date & Time</span>
                      <span className="font-semibold text-foreground">
                        {new Date(booking.datetime).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}{" "}
                        at{" "}
                        {new Date(booking.datetime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-start py-1">
                      <span className="text-muted-foreground font-medium shrink-0">Location</span>
                      <div className="text-right min-w-0">
                        {booking.customerLocation?.address || booking.event?.location ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground break-words max-w-[200px]">
                              {booking.customerLocation?.address || booking.event?.location}
                            </p>
                            {booking.customerLocation?.latitude && (
                              <a
                                href={`https://www.google.com/maps?q=${booking.customerLocation.latitude},${booking.customerLocation.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                              >
                                View on Maps <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Pricing & Payment
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Payment Status</span>
                      <span className="font-semibold capitalize text-foreground">{booking.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-medium">Total Price</span>
                      <span className="font-bold text-sm text-primary">{formatCurrency(booking.price)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review & Rating Card */}
              {booking.rating?.score && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-2 mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> Customer Review & Rating
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground font-medium mr-2">Score:</span>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < booking.rating.score
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                      <span className="font-semibold ml-1.5">{booking.rating.score}/5</span>
                    </div>
                    {booking.rating.comment && (
                      <div className="bg-background p-3 rounded-md border border-border/50 text-xs italic text-foreground/90 mt-1">
                        "{booking.rating.comment}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBookingDetail;
