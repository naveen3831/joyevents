import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Users, Calendar, Loader2, AlertCircle, Eye } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMerchantRecommendationStats } from "@/lib/api";
import { toast } from "sonner";
import { useGsapReveal, useGsapStagger } from "@/lib/gsapAnimations";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
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
          {loading ? (
            <TableSkeleton columns={6} rows={5} minWidth="600px" />
          ) : stats.length === 0 ? (
            <TableEmptyState title="No events found" description="Create events to appear in recommendations." colSpan={6} />
          ) : (
            <DataTable minWidth="600px">
              <TableHeader>
                <TableHeaderCell width="200px">Event</TableHeaderCell>
                <TableHeaderCell width="140px">Category</TableHeaderCell>
                <TableHeaderCell width="130px">Date</TableHeaderCell>
                <TableHeaderCell width="120px">Attendees</TableHeaderCell>
                <TableHeaderCell width="120px">Est. Reach</TableHeaderCell>
                <TableHeaderCell width="110px">Status</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {stats.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground truncate max-w-[200px]">{event.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {event.isFeatured && <span className="text-[10px] text-amber-500 font-semibold">⭐ Featured</span>}
                        {event.live && <span className="text-[10px] text-red-500 font-semibold">🔴 Live</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{event.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {event.datetime ? new Date(event.datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-bold text-foreground">{event.attendeesCount}</span>
                        {event.maxAttendees > 0 && (<span className="text-[10px] text-muted-foreground">/ {event.maxAttendees}</span>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold text-xs">
                        <TrendingUp className="h-3.5 w-3.5"/>
                        ~{event.estimatedReach}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            * Estimated reach is based on booking history patterns and category popularity. Actual reach may vary.
          </p>
        </div>
      </section>
    </MerchantLayout>);
};
export default MerchantRecommendations;
