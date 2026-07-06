import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { Users, Store, Calendar, DollarSign, TrendingUp, Shield, Filter } from "lucide-react";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { useState, useEffect } from "react";
import { apiListCategories } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ManageCategoriesModal from "@/components/ManageCategoriesModal";

const AdminDashboard = () => {
  const { token } = useAuth();
  const stats = { totalUsers: 0, totalMerchants: 0, totalEvents: 0, totalRevenue: 0 };

  const [showCatModal, setShowCatModal] = useState(false);
  const [eventCategories, setEventCategories] = useState<any[]>([]);

  useEffect(() => {
    loadEventCategories();
  }, []);

  const loadEventCategories = async () => {
    try {
      const res = await apiListCategories("event");
      setEventCategories(res.categories || []);
    } catch (e) {
    }
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Admin <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="text-muted-foreground text-sm">Platform overview and management</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5" />} index={0} />
            <StatCard title="Total Merchants" value={stats.totalMerchants} icon={<Store className="h-5 w-5" />} index={1} />
            <StatCard title="Total Events" value={stats.totalEvents.toString()} icon={<Calendar className="h-5 w-5" />} index={2} />
            <StatCard title="Platform Revenue" value={`${formatCurrency((stats.totalRevenue / 1000), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`} icon={<DollarSign className="h-5 w-5" />} index={3} />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Recent Users */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Recent Users
              </h2>
              <div className="mt-4 space-y-3"></div>
            </motion.div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Platform Health */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Platform Metrics
              </h2>
              <div className="mt-4 space-y-4"></div>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCatModal(true)}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 p-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
                >
                  <Filter className="h-4 w-4" />
                  Manage Event Categories
                </button>
                {[
                  { label: "Manage Users", icon: Users },
                  { label: "Review Events", icon: Calendar },
                  { label: "View Reports", icon: TrendingUp },
                  { label: "Settings", icon: Shield },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground transition-all hover:border-primary hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {showCatModal && (
        <ManageCategoriesModal
          type="event"
          onClose={() => setShowCatModal(false)}
          onCategoriesChanged={loadEventCategories}
        />
      )}
    </Layout>
  );
};

export default AdminDashboard;


