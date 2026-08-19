import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Calendar, TrendingUp, Loader2, AlertCircle, Eye, BookOpen } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import { useGsapReveal } from "@/lib/gsapAnimations";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetAdminRecommendationData } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
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
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs w-full">
                <div className="px-5 py-4 border-b border-border/80 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary"/>
                  <h2 className="font-semibold text-sm sm:text-base">Top Recommended Events</h2>
                </div>
                {data.topRecommended?.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                    <p>No events available</p>
                  </div>
                ) : (
                  <DataTable minWidth="100%">
                    <TableHeader>
                      <TableHeaderCell className="w-[24%]">Event</TableHeaderCell>
                      <TableHeaderCell className="w-[20%]">Merchant</TableHeaderCell>
                      <TableHeaderCell className="w-[14%]">Category</TableHeaderCell>
                      <TableHeaderCell className="w-[14%] whitespace-nowrap">Date</TableHeaderCell>
                      <TableHeaderCell className="w-[10%]">Attendees</TableHeaderCell>
                      <TableHeaderCell className="w-[10%] whitespace-nowrap">Est. Reach</TableHeaderCell>
                      <TableHeaderCell align="right" className="w-[8%]">Status</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                      {data.topRecommended.map((event) => (
                        <TableRow key={event._id}>
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground truncate max-w-[180px]" title={event.title}>{event.title}</div>
                            {event.isFeatured && <span className="text-[10px] text-amber-500 font-medium">⭐ Featured</span>}
                            {event.live && <span className="text-[10px] text-rose-500 ml-1 font-medium">🔴 Live</span>}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-foreground">{event.merchant}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{event.merchantEmail}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{event.category || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {event.datetime ? new Date(event.datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </TableCell>
                          <TableCell className="font-bold text-xs">
                            {event.attendeesCount}
                            {event.maxAttendees > 0 && <span className="text-[10px] text-muted-foreground font-normal"> / {event.maxAttendees}</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1 text-primary font-semibold whitespace-nowrap">
                              <TrendingUp className="h-3.5 w-3.5"/>
                              ~{event.estimatedReach}
                            </div>
                          </TableCell>
                          <TableCell align="right">
                            <StatusBadge status={event.status === "upcoming" ? "active" : event.status === "ongoing" ? "processing" : "pending"} label={event.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">* Estimated reach is calculated from booking patterns and category popularity.</p>
            </>)}
        </div>
      </section>
    </AdminLayout>);
};
export default AdminRecommendations;
