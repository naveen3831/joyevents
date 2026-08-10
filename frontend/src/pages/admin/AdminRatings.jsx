import { motion } from "framer-motion";
import { Star, Loader2, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings } from "@/lib/api";
import { toast } from "sonner";

const AdminRatings = () => {
    const { token } = useAuth();
    const [allBookings, setAllBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token)
            return;
        apiListBookings(undefined, token)
            .then((res) => setAllBookings(res.bookings || []))
            .catch(() => toast.error("Failed to load ratings"))
            .finally(() => setLoading(false));
    }, [token]);

    const ratedBookings = allBookings.filter((b) => b.rating?.score);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500"/> Customer <span className="text-gradient">Ratings</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Reviews and ratings left by customers across all bookings</p>
        </div>

        {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading reviews…
          </div>) : ratedBookings.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            <p className="font-medium mb-2">No reviews yet</p>
            <p className="text-sm">Customer reviews will appear here once they rate completed bookings</p>
          </div>) : (<div className="space-y-6">
            {/* Rating Statistics */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="font-display font-semibold mb-4 sm:mb-6 text-base sm:text-lg">Platform Rating Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {(() => {
                    const avgRating = (ratedBookings.reduce((sum, b) => sum + (b.rating?.score || 0), 0) / ratedBookings.length).toFixed(1);
                    const totalRatings = ratedBookings.length;
                    const fiveStarCount = ratedBookings.filter((b) => b.rating?.score === 5).length;
                    const fourStarCount = ratedBookings.filter((b) => b.rating?.score === 4).length;
                    const threeStarCount = ratedBookings.filter((b) => b.rating?.score === 3).length;
                    return (<>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                          <p className="text-base sm:text-2xl font-bold text-yellow-600 truncate">{avgRating}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">Avg Rating</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <p className="text-base sm:text-2xl font-bold text-primary truncate">{totalRatings}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">Total Reviews</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                          <p className="text-base sm:text-2xl font-bold text-green-600 truncate">{fiveStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">5 Star</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                          <p className="text-base sm:text-2xl font-bold text-blue-600 truncate">{fourStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">4 Star</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                          <p className="text-base sm:text-2xl font-bold text-orange-600 truncate">{threeStarCount}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 truncate">3 Star</p>
                        </div>
                      </>);
                })()}
              </div>

              {/* Rating Distribution */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-sm mb-4">Rating Distribution</h3>
                <div className="space-y-3">
                  {(() => {
                        const total = ratedBookings.length;
                        const distribution = [
                            { stars: 5, count: ratedBookings.filter((b) => b.rating?.score === 5).length, color: "bg-green-500" },
                            { stars: 4, count: ratedBookings.filter((b) => b.rating?.score === 4).length, color: "bg-blue-500" },
                            { stars: 3, count: ratedBookings.filter((b) => b.rating?.score === 3).length, color: "bg-orange-500" },
                            { stars: 2, count: ratedBookings.filter((b) => b.rating?.score === 2).length, color: "bg-red-500" },
                            { stars: 1, count: ratedBookings.filter((b) => b.rating?.score === 1).length, color: "bg-red-600" },
                        ];
                        return distribution.map(({ stars, count, color }) => (<div key={stars} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-12">{stars}⭐</span>
                              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full ${color} transition-all`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}/>
                              </div>
                              <span className="text-sm font-medium text-muted-foreground w-12 text-right">{count}</span>
                            </div>));
                    })()}
                </div>
              </div>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ratedBookings
                .sort((a, b) => new Date(b.rating?.ratedAt || 0).getTime() - new Date(a.rating?.ratedAt || 0).getTime())
                .map((booking) => (<motion.div key={booking._id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-card transition-shadow">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{booking.customer?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{booking.service?.name || booking.event?.title || booking.serviceName}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`h-4 w-4 ${star <= (booking.rating?.score || 0) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30 fill-none"}`}/>))}
                      </div>
                    </div>

                    {booking.rating?.comment && (<p className="text-sm text-muted-foreground mb-3 italic line-clamp-2">"{booking.rating.comment}"</p>)}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                      <span className="font-medium">{booking.rating?.score}/5</span>
                      <span className="truncate">Merchant: {booking.assignedTo?.name || "Unassigned"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(booking.rating?.ratedAt || 0).toLocaleDateString()}
                    </div>
                  </motion.div>))}
            </div>
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminRatings;
