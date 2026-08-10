import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Calendar, TrendingUp, Loader2, AlertCircle, Eye, BookOpen } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import { useGsapReveal } from "@/lib/gsapAnimations";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetAdminRecommendationData } from "@/lib/api";
import { toast } from "sonner";
const AdminRecommendations = () => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token)
            return;
        apiGetAdminRecommendationData(token)
            .then(res => setData(res))
            .catch(() => toast.error("Failed to load recommendation data"))
            .finally(() => setLoading(false));
    }, [token]);
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-xs sm:text-2xl font-bold truncate">
                  AI Recommendation <span className="text-gradient">Overview</span>
                </h1>
                <p className="text-sm text-muted-foreground">Platform-wide recommendation activity and top recommended events</p>
              </div>
            </div>
          </motion.div>

          {loading ? (<div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin"/> Loading…
            </div>) : !data ? null : (<>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 mb-8">
                {[
                { label: "Total Customers", value: data.totalCustomers?.toLocaleString(), icon: Users, color: "text-primary" },
                { label: "Total Bookings", value: data.totalBookings?.toLocaleString(), icon: BookOpen, color: "text-green-400" },
                { label: "Active Events", value: data.totalEvents?.toLocaleString(), icon: Calendar, color: "text-blue-400" },
                { label: "Est. Total Reach", value: data.topRecommended?.reduce((s, e) => s + e.estimatedReach, 0)?.toLocaleString(), icon: Eye, color: "text-yellow-400" },
            ].map((card, i) => (<motion.div key={card.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-border bg-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-secondary shrink-0">
                      <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`}/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                      <p className="font-display text-xs sm:text-2xl font-bold truncate">{card.value}</p>
                    </div>
                  </motion.div>))}
              </div>

              {/* Top recommended events table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary"/>
                  <h2 className="font-semibold">Top Recommended Events</h2>
                </div>
                {data.topRecommended?.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                    <p>No events available</p>
                  </div>) : (<div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendees</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Est. Reach</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topRecommended.map((event, idx) => (<motion.tr key={event._id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: idx * 0.03 }} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3 font-medium max-w-[180px]">
                              <div className="truncate">{event.title}</div>
                              {event.isFeatured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
                              {event.live && <span className="text-xs text-red-400 ml-1">🔴 Live</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium">{event.merchant}</div>
                              <div className="text-xs text-muted-foreground">{event.merchantEmail}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{event.category || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {event.datetime ? new Date(event.datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {event.attendeesCount}
                              {event.maxAttendees > 0 && <span className="text-xs text-muted-foreground font-normal"> / {event.maxAttendees}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                                <TrendingUp className="h-3.5 w-3.5"/>
                                ~{event.estimatedReach}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${event.status === "upcoming" ? "bg-green-500/15 text-green-400" :
                        event.status === "ongoing" ? "bg-blue-500/15 text-blue-400" :
                            "bg-secondary text-muted-foreground"}`}>{event.status}</span>
                            </td>
                          </motion.tr>))}
                      </tbody>
                    </table>
                  </div>)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">* Estimated reach is calculated from booking patterns and category popularity.</p>
            </>)}
        </div>
      </section>
    </AdminLayout>);
};
export default AdminRecommendations;
