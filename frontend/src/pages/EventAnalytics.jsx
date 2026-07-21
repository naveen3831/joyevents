import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Ticket, DollarSign, Calendar, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiGetEventAnalytics } from "@/lib/api";
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
    const COLOR_MAP = {
      "text-green-600": { bg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", text: "text-emerald-400" },
      "text-red-600": { bg: "bg-red-500/10 text-red-400 border border-red-500/20", text: "text-red-400" },
      "text-blue-600": { bg: "bg-blue-500/10 text-blue-400 border border-blue-500/20", text: "text-blue-400" },
      "text-orange-600": { bg: "bg-amber-500/10 text-amber-400 border border-amber-500/20", text: "text-amber-400" },
      "text-purple-600": { bg: "bg-purple-500/10 text-purple-400 border border-purple-500/20", text: "text-purple-400" },
    };
    const StatCard = ({ title, value, icon: Icon, trend, color }) => {
        const theme = COLOR_MAP[color] || { bg: "bg-secondary", text: "text-foreground border border-border" };
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 hover-lift">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground line-clamp-1">{title}</p>
                  <p className={`text-base sm:text-2xl font-bold mt-1 font-display truncate ${theme.text?.split(" ")[0] || "text-foreground"}`} title={value}>{value}</p>
                  {trend && (<div className="flex items-center gap-1 mt-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-green-500"/>
                      <span className="text-green-500 font-medium">{trend}</span>
                    </div>)}
                </div>
                <div className={`p-2.5 rounded-lg ${theme.bg} shrink-0 flex items-center justify-center`}>
                  <Icon className="h-5 w-5"/>
                </div>
              </div>
            </motion.div>
        );
    };
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
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-primary"/>
                Event <span className="text-gradient">Analytics</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Track ticket sales, revenue, and attendee statistics</p>
            </div>
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2"/>
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard title="Total Events" value={analytics?.totalEvents || 0} icon={Calendar} color="text-blue-600"/>
          <StatCard title="Total Tickets Sold" value={analytics?.totalTicketsSold || 0} icon={Ticket} color="text-purple-600" trend="+12.5%"/>
          <StatCard title="Total Event Revenue" value={`${formatCurrency((analytics?.totalEventRevenue || 0))}`} icon={DollarSign} color="text-green-600" trend="+8.2%"/>
          <StatCard title="Total Attendees" value={analytics?.totalAttendees || 0} icon={Users} color="text-orange-600"/>
        </motion.div>

        {/* Events Analytics Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5"/>
                Event Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics?.events || analytics.events.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40"/>
                  <p>No events with analytics data yet</p>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Event Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Tickets Sold</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Attendees</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Revenue</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllEvents ? analytics.events : analytics.events.slice(0, 10)).map((event) => (<tr key={event._id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                          <td className="py-3 px-4 font-medium">{event.title}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded">
                              {event.eventType === "ticketed" ? "Ticketed" : "Single Ticket"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-purple-600"/>
                              <span className="font-semibold">{event.ticketsSold}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-orange-600"/>
                              <span className="font-semibold">{event.attendees}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600">{formatCurrency(event.revenue)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${event.status === "active"
                    ? "bg-green-500/20 text-green-600"
                    : "bg-gray-500/20 text-gray-600"}`}>
                              {event.status}
                            </span>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                  {analytics.events.length > 10 && (<div className="text-center pt-4 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllEvents(!showAllEvents)} className="text-primary hover:text-primary/80 font-semibold">
                        {showAllEvents ? "Show Less" : `View All (${analytics.events.length})`}
                      </Button>
                    </div>)}
                </div>)}
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </MerchantLayout>);
};
export default EventAnalytics;
