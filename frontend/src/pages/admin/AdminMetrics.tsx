import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const metrics: Array<{ label: string; value: number; color: string }> = [];

const kpis: Array<{ label: string; value: string; change: string; up: boolean }> = [];

const AdminMetrics = () => {
  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-xs sm:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Platform <span className="text-gradient">Metrics</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Performance analytics and platform health</p>
        </motion.div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4"></div>

        {/* Health Bars */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-10">
          <h2 className="font-display text-xl font-bold mb-4">System Health</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2"></div>
        </motion.div>
      </section>
    </AdminLayout>
  );
};

export default AdminMetrics;

