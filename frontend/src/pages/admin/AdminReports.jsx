import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, DollarSign, Calendar, Users, MapPin, Star, Loader2, Target, Award } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiListEvents, apiListUsers } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const AdminReports = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        dailyBookings: 0,
        weeklyBookings: 0,
        monthlyBookings: 0,
        totalEvents: 0,
        totalUsers: 0,
        totalMerchants: 0,
        conversionRate: 0,
        topMerchants: [],
        popularEvents: [],
        locationStats: [],
    });
    useEffect(() => {
        loadAnalytics();
    }, [token]);
    const loadAnalytics = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            // Fetch all data in parallel
            const [bookingsRes, eventsRes, usersRes] = await Promise.all([
                apiListBookings(undefined, token),
                apiListEvents(token),
                apiListUsers(token),
            ]);
            const bookings = bookingsRes.bookings || [];
            const events = eventsRes.events || [];
            const users = usersRes.users || [];
            // Calculate date ranges
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            // Revenue calculations
            let dailyRev = 0, weeklyRev = 0, monthlyRev = 0;
            let dailyBook = 0, weeklyBook = 0, monthlyBook = 0;
            bookings.forEach((booking) => {
                const bookingDate = new Date(booking.createdAt);
                const amount = booking.price || 0;
                if (booking.status === "completed" || booking.paymentStatus === "paid") {
                    // Daily
                    if (bookingDate >= today) {
                        dailyRev += amount;
                        dailyBook++;
                    }
                    // Weekly
                    if (bookingDate >= weekAgo) {
                        weeklyRev += amount;
                        weeklyBook++;
                    }
                    // Monthly
                    if (bookingDate >= monthAgo) {
                        monthlyRev += amount;
                        monthlyBook++;
                    }
                }
            });
            // Top merchants by revenue
            const merchantRevenue = new Map();
            bookings.forEach((booking) => {
                if (booking.assignedTo && (booking.status === "completed" || booking.paymentStatus === "paid")) {
                    const merchantId = booking.assignedTo._id;
                    const existing = merchantRevenue.get(merchantId) || {
                        name: booking.assignedTo.name,
                        email: booking.assignedTo.email,
                        revenue: 0,
                        bookings: 0
                    };
                    existing.revenue += booking.price || 0;
                    existing.bookings++;
                    merchantRevenue.set(merchantId, existing);
                }
            });
            const topMerchants = Array.from(merchantRevenue.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            // Popular events by bookings
            const eventBookings = new Map();
            bookings.forEach((booking) => {
                if (booking.event && (booking.status === "completed" || booking.paymentStatus === "paid")) {
                    const eventId = booking.event._id;
                    const existing = eventBookings.get(eventId) || {
                        title: booking.event.title,
                        bookings: 0,
                        revenue: 0
                    };
                    existing.bookings++;
                    existing.revenue += booking.price || 0;
                    eventBookings.set(eventId, existing);
                }
            });
            const popularEvents = Array.from(eventBookings.values())
                .sort((a, b) => b.bookings - a.bookings)
                .slice(0, 5);
            // Location-based analytics
            const locationStats = new Map();
            bookings.forEach((booking) => {
                if (booking.event?.location && (booking.status === "completed" || booking.paymentStatus === "paid")) {
                    const location = booking.event.location;
                    const existing = locationStats.get(location) || { count: 0, revenue: 0 };
                    existing.count++;
                    existing.revenue += booking.price || 0;
                    locationStats.set(location, existing);
                }
            });
            const sortedLocations = Array.from(locationStats.entries())
                .map(([location, stats]) => ({ location, ...stats }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            // Count users and merchants
            const totalUsers = users.filter((u) => u.role === "user").length;
            const totalMerchants = users.filter((u) => u.role === "merchant").length;
            // Calculate conversion rate (completed bookings / total bookings * 100)
            const completedBookings = bookings.filter((b) => b.status === "completed" || b.paymentStatus === "paid").length;
            const conversionRate = bookings.length > 0 ? Math.round((completedBookings / bookings.length) * 100) : 0;
            setAnalyticsData({
                dailyRevenue: dailyRev,
                weeklyRevenue: weeklyRev,
                monthlyRevenue: monthlyRev,
                dailyBookings: dailyBook,
                weeklyBookings: weeklyBook,
                monthlyBookings: monthlyBook,
                totalEvents: events.length,
                totalUsers,
                totalMerchants,
                conversionRate,
                topMerchants,
                popularEvents,
                locationStats: sortedLocations,
            });
        }
        catch {
            // silently ignore
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (<AdminLayout>
        <section className="py-2 sm:py-8 lg:py-10">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            <span className="ml-3 text-muted-foreground">Loading analytics...</span>
          </div>
        </section>
      </AdminLayout>);
    }
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-xs sm:text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary"/>
            Reports <span className="text-gradient">&</span> Analytics
          </h1>
          <p className="text-muted-foreground mt-2">Real-time platform performance and insights</p>
        </motion.div>

        {/* Platform Metrics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Platform users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
              <Award className="h-4 w-4 text-purple-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.totalMerchants}</div>
              <p className="text-xs text-muted-foreground mt-1">Active merchants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.totalEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">Listed events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-green-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Booking success rate</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{formatCurrency(analyticsData.dailyRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Today's earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{formatCurrency(analyticsData.weeklyRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{formatCurrency(analyticsData.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.dailyBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">Bookings today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Bookings</CardTitle>
              <Users className="h-4 w-4 text-pink-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.weeklyBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Bookings</CardTitle>
              <BarChart3 className="h-4 w-4 text-indigo-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-2xl font-bold">{analyticsData.monthlyBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-2 mb-8">
          {/* Top Merchants */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500"/>
                  Top Merchants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.topMerchants.length === 0 ? (<p className="text-muted-foreground text-sm">No merchant data yet</p>) : (<div className="space-y-4">
                    {analyticsData.topMerchants.map((merchant, idx) => (<div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    idx === 1 ? 'bg-gray-500/20 text-gray-500' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-secondary text-muted-foreground'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{merchant.name}</p>
                            <p className="text-xs text-muted-foreground">{merchant.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(merchant.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{merchant.bookings} bookings</p>
                        </div>
                      </div>))}
                  </div>)}
              </CardContent>
            </Card>
          </motion.div>

          {/* Popular Events */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500"/>
                  Most Popular Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.popularEvents.length === 0 ? (<p className="text-muted-foreground text-sm">No event data yet</p>) : (<div className="space-y-4">
                    {analyticsData.popularEvents.map((event, idx) => (<div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono">#{idx + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{event.bookings} bookings</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(event.revenue)}</p>
                        </div>
                      </div>))}
                  </div>)}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Location Analytics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500"/>
                Location-Based Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!Array.isArray(analyticsData.locationStats) || analyticsData.locationStats.length === 0 ? (<p className="text-muted-foreground text-sm">No location data yet</p>) : (<div className="overflow-x-auto w-full">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Location</th>
                        <th className="text-center px-2 py-2.5 font-medium text-muted-foreground">Total Bookings</th>
                        <th className="text-right px-2 py-2.5 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right px-2 py-2.5 font-medium text-muted-foreground">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.locationStats.map((loc, idx) => {
                const maxRevenue = analyticsData.locationStats[0]?.revenue || 1;
                const percentage = Math.round((loc.revenue / maxRevenue) * 100);
                return (<tr key={idx} className="border-b border-border last:border-0 hover:bg-secondary/20">
                            <td className="px-2 py-2.5 font-medium text-xs">{loc.location}</td>
                            <td className="text-center px-2 py-2.5">
                              <Badge variant="outline" className="px-1 py-0 text-[10px]">{loc.count}</Badge>
                            </td>
                            <td className="text-right px-2 py-2.5 font-semibold text-xs">
                              {formatCurrency(loc.revenue)}
                            </td>
                            <td className="text-right px-2 py-2.5">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${percentage}%` }}/>
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground">{percentage}%</span>
                              </div>
                            </td>
                          </tr>);
            })}
                    </tbody>
                  </table>
                </div>)}
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </AdminLayout>);
};
export default AdminReports;
