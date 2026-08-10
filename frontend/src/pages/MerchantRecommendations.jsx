import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Users, Calendar, Loader2, AlertCircle, Eye } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMerchantRecommendationStats } from "@/lib/api";
import { toast } from "sonner";
import { useGsapReveal, useGsapStagger } from "@/lib/gsapAnimations";
const MerchantRecommendations = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token)
            return;
        apiGetMerchantRecommendationStats(token)
            .then(res => { setStats(res.stats || []); setTotalEvents(res.totalEvents || 0); })
            .catch(() => toast.error("Failed to load stats"))
            .finally(() => setLoading(false));
    }, [token]);
    const headerRef = useGsapReveal();
    const gridRef = useGsapStagger([loading, stats.length]);
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 sm:mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shrink-0">
              <Sparkles className="h-5 w-5"/>
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                AI <span className="text-gradient">Recommendation Stats</span>
              </h1>
              <p className="text-sm text-muted-foreground">How your events perform in customer recommendations</p>
            </div>
          </div>

          {/* Summary cards */}
          <div ref={gridRef} className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8">
            <StatCard title="Your Events" value={totalEvents} icon={<Calendar />} index={0}/>
            <StatCard title="Est. Total Reach" value={stats.reduce((s, e) => s + e.estimatedReach, 0).toLocaleString()} icon={<Eye />} index={1}/>
            <StatCard title="Total Attendees" value={stats.reduce((s, e) => s + e.attendeesCount, 0).toLocaleString()} icon={<Users />} index={2}/>
          </div>

          {/* Events table */}
          {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading…
            </div>) : stats.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground"/>
              <p className="text-muted-foreground">No events found. Create events to appear in recommendations.</p>
            </div>) : (<div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendees</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Est. Reach</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((event, idx) => (<motion.tr key={event._id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: idx * 0.04 }} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium max-w-[200px]">
                          <div className="truncate">{event.title}</div>
                          {event.isFeatured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
                          {event.live && <span className="text-xs text-red-400 ml-1">🔴 Live</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{event.category || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {event.datetime ? new Date(event.datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{event.attendeesCount}</span>
                            {event.maxAttendees > 0 && (<span className="text-xs text-muted-foreground">/ {event.maxAttendees}</span>)}
                          </div>
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
              </div>
            </div>)}

          <p className="mt-4 text-xs text-muted-foreground">
            * Estimated reach is based on booking history patterns and category popularity. Actual reach may vary.
          </p>
        </div>
      </section>
    </MerchantLayout>);
};
export default MerchantRecommendations;
