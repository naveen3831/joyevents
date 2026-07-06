import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Users, Calendar, Loader2, AlertCircle, Eye } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMerchantRecommendationStats } from "@/lib/api";
import { toast } from "sonner";

const MerchantRecommendations = () => {
  const { token } = useAuth() as any;
  const [stats, setStats] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGetMerchantRecommendationStats(token)
      .then(res => { setStats(res.stats || []); setTotalEvents(res.totalEvents || 0); })
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">
                  AI <span className="text-gradient">Recommendation Stats</span>
                </h1>
                <p className="text-sm text-muted-foreground">How your events perform in customer recommendations</p>
              </div>
            </div>
          </motion.div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {[
              { label: "Your Events", value: totalEvents, icon: Calendar, color: "text-primary" },
              { label: "Est. Total Reach", value: stats.reduce((s, e) => s + e.estimatedReach, 0).toLocaleString(), icon: Eye, color: "text-blue-400" },
              { label: "Total Attendees", value: stats.reduce((s, e) => s + e.attendeesCount, 0).toLocaleString(), icon: Users, color: "text-green-400" },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary shrink-0">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="font-display text-2xl font-bold">{card.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Events table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : stats.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No events found. Create events to appear in recommendations.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
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
                    {stats.map((event, idx) => (
                      <motion.tr key={event._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                        className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
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
                            {event.maxAttendees > 0 && (
                              <span className="text-xs text-muted-foreground">/ {event.maxAttendees}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                            <TrendingUp className="h-3.5 w-3.5" />
                            ~{event.estimatedReach}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            event.status === "upcoming" ? "bg-green-500/15 text-green-400" :
                            event.status === "ongoing" ? "bg-blue-500/15 text-blue-400" :
                            "bg-secondary text-muted-foreground"
                          }`}>{event.status}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            * Estimated reach is based on booking history patterns and category popularity. Actual reach may vary.
          </p>
        </div>
      </section>
    </MerchantLayout>
  );
};

export default MerchantRecommendations;

