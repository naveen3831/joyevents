import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Users, Store, Calendar, DollarSign, TrendingUp, Shield, Filter, AlertTriangle, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { useState, useEffect } from "react";
import { apiListCategories, apiListUsers, apiListEvents, apiGetTickets } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ManageCategoriesModal from "@/components/ManageCategoriesModal";
const AdminDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState({ totalUsers: 0, totalMerchants: 0, totalEvents: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [showCatModal, setShowCatModal] = useState(false);
    const [eventCategories, setEventCategories] = useState([]);
    useEffect(() => {
        loadEventCategories();
        if (token) {
            loadDashboardData();
        }
    }, [token]);
    const loadDashboardData = async () => {
        try {
            const [usersRes, eventsRes, ticketsRes] = await Promise.all([
                apiListUsers(token),
                apiListEvents(token),
                apiGetTickets(token)
            ]);
            const usersList = usersRes.users || [];
            const eventsList = eventsRes.events || [];
            const ticketsList = ticketsRes.tickets || [];
            const totalUsers = usersList.filter((u) => u.role === "user").length;
            const totalMerchants = usersList.filter((u) => u.role === "merchant").length;
            const totalEvents = eventsList.length;
            let totalRevenue = 0;
            usersList.forEach((u) => {
                if (u.role === "merchant" && (u.merchantStatus === "active" || u.merchantStatus === "paid")) {
                    totalRevenue += u.quotationAmount || 0;
                }
            });
            ticketsList.forEach((t) => {
                if (t.status === "paid" || t.status === "approved") {
                    totalRevenue += t.quotationAmount || 0;
                }
            });
            setStats({
                totalUsers,
                totalMerchants,
                totalEvents,
                totalRevenue
            });
            setTickets(ticketsList);
        }
        catch (e) {
            toast.error("Failed to load platform metrics");
        }
        finally {
            setLoading(false);
        }
    };
    const loadEventCategories = async () => {
        try {
            const res = await apiListCategories("event");
            setEventCategories(res.categories || []);
        }
        catch (e) {
        }
    };
    return (<Layout>
      <section className="py-12">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Shield className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Admin <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="text-muted-foreground text-sm">Platform overview and management</p>
              </div>
            </div>
          </motion.div>

          {/* Pending Limit Upgrade Alerts */}
          {(() => {
            const pendingTicketsCount = tickets.filter(t => t.status === "pending").length;
            const paidTicketsCount = tickets.filter(t => t.status === "paid").length;
            return (<>
                {pendingTicketsCount > 0 && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 animate-pulse"/>
                      <div>
                        <h4 className="font-semibold text-sm text-yellow-600 dark:text-yellow-400">Action Required: Pending Limit Upgrade Requests</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          There are {pendingTicketsCount} merchant slot upgrade requests waiting for setup quotations.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => window.location.href = "/admin-dashboard/users?tab=tickets"} className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors">
                      View Requests
                    </button>
                  </motion.div>)}

                {paidTicketsCount > 0 && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 animate-bounce"/>
                      <div>
                        <h4 className="font-semibold text-sm text-green-600 dark:text-green-400">Action Required: Paid Upgrade Tickets Ready for Approval</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          There are {paidTicketsCount} slot upgrade requests that have been paid and are awaiting your approval.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => window.location.href = "/admin-dashboard/users?tab=tickets&action=approve"} className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors">
                      Review & Approve
                    </button>
                  </motion.div>)}
              </>);
        })()}

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5"/>} index={0}/>
            <StatCard title="Total Merchants" value={stats.totalMerchants} icon={<Store className="h-5 w-5"/>} index={1}/>
            <StatCard title="Total Events" value={stats.totalEvents.toString()} icon={<Calendar className="h-5 w-5"/>} index={2}/>
            <StatCard title="Platform Revenue" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign className="h-5 w-5"/>} index={3}/>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Recent Users */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary"/> Recent Users
              </h2>
              <div className="mt-4 space-y-3"></div>
            </motion.div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Platform Health */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary"/> Platform Metrics
              </h2>
              <div className="mt-4 space-y-4"></div>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setShowCatModal(true)} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 p-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20">
                  <Filter className="h-4 w-4"/>
                  Manage Event Categories
                </button>
                {[
            { label: "Manage Users", icon: Users },
            { label: "Review Events", icon: Calendar },
            { label: "View Reports", icon: TrendingUp },
            { label: "Settings", icon: Shield },
        ].map(({ label, icon: Icon }) => (<button key={label} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground transition-all hover:border-primary hover:text-foreground">
                    <Icon className="h-4 w-4 text-primary"/>
                    {label}
                  </button>))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {showCatModal && (<ManageCategoriesModal type="event" onClose={() => setShowCatModal(false)} onCategoriesChanged={loadEventCategories}/>)}
    </Layout>);
};
export default AdminDashboard;
