import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Ticket, DollarSign, Calendar, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiGetEventAnalytics } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
const EventAnalytics = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [showAllEvents, setShowAllEvents] = useState(false);
    const loadAnalytics = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            const data = await apiGetEventAnalytics(token);
            setAnalytics(data);
        }
        catch (error) {
            toast.error(error.message || "Failed to load analytics");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadAnalytics();
    }, [token]);
    // Real-time polling
    useEffect(() => {
        if (!token)
            return;
        const pollInterval = setInterval(async () => {
            try {
                const data = await apiGetEventAnalytics(token);
                setAnalytics(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(data)) {
                        return data;
                    }
                    return prev;
                });
            }
            catch {
                // silently ignore polling errors
            }
        }, 5000);
        return () => clearInterval(pollInterval);
    }, [token]);
    const statsGridRef = useGsapStagger([analytics]);
    if (loading) {
        return (<MerchantLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading analytics…
          </div>
        </section>
      </MerchantLayout>);
    }
    return (<MerchantLayout>
      <div className="w-full min-w-0 space-y-5 font-sans">
        <PageHeader
          title="Event Analytics"
          subtitle="Track ticket sales, revenue breakdown, and attendee statistics across all your events."
          breadcrumbs={[
            { label: "Merchant Portal", to: "/merchant-dashboard" },
            { label: "Growth" },
            { label: "Event Analytics" },
          ]}
        />

        {/* Stats Grid */}
        <div ref={statsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard title="Total Events" value={analytics?.totalEvents || 0} icon={<Calendar className="h-5 w-5"/>} index={0}/>
          <StatCard title="Total Tickets Sold" value={analytics?.totalTicketsSold || 0} icon={<Ticket className="h-5 w-5"/>} index={1} trend="+12.5%"/>
          <StatCard title="Total Event Revenue" value={`${formatCurrency((analytics?.totalEventRevenue || 0))}`} icon={<DollarSign className="h-5 w-5"/>} index={2} trend="+8.2%"/>
          <StatCard title="Total Attendees" value={analytics?.totalAttendees || 0} icon={<Users className="h-5 w-5"/>} index={3}/>
        </div>

        {/* Events Analytics Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }}>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-4 sm:p-6 border-b border-border/80 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary"/> Event Performance
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Detailed breakdown of event sales, attendee counts, and total revenue.</p>
              </div>
            </div>
            {!analytics?.events || analytics.events.length === 0 ? (
              <TableEmptyState title="No events with analytics data yet" description="Event analytics will appear here once ticket sales begin." colSpan={6} />
            ) : (
              <DataTable minWidth="650px">
                <TableHeader>
                  <TableHeaderCell width="200px">Event Name</TableHeaderCell>
                  <TableHeaderCell width="130px">Type</TableHeaderCell>
                  <TableHeaderCell width="120px">Tickets Sold</TableHeaderCell>
                  <TableHeaderCell width="120px">Attendees</TableHeaderCell>
                  <TableHeaderCell width="120px">Revenue</TableHeaderCell>
                  <TableHeaderCell width="110px">Status</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {(showAllEvents ? analytics.events : analytics.events.slice(0, 10)).map((event) => (
                    <TableRow key={event._id}>
                      <TableCell className="font-semibold text-xs text-foreground">{event.title}</TableCell>
                      <TableCell>
                        <StatusBadge status="event" label={event.eventType === "ticketed" ? "Ticketed" : "Single Ticket"} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Ticket className="h-3.5 w-3.5 text-purple-500"/>
                          {event.ticketsSold}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Users className="h-3.5 w-3.5 text-orange-500"/>
                          {event.attendees}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-emerald-600">
                        {formatCurrency(event.revenue)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={event.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            )}
            {analytics?.events && analytics.events.length > 10 && (
              <div className="p-4 text-center border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setShowAllEvents(!showAllEvents)} className="text-primary hover:text-primary/80 font-semibold">
                  {showAllEvents ? "Show Less" : `View All (${analytics.events.length})`}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </MerchantLayout>);
};
export default EventAnalytics;
