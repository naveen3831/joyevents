import { motion } from "framer-motion";
import { TrendingUp, BarChart3 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
const metrics = [];
const kpis = [];
const AdminMetrics = () => {
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary"/>
            Platform <span className="text-gradient">Metrics</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Performance analytics and platform health</p>
        </motion.div>

        {/* KPIs */}
        {kpis.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 opacity-30"/>
            <p className="text-muted-foreground">No KPI data available yet.</p>
          </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4"></div>)}

        {/* Health Bars */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.15 }} className="mt-10">
          <h2 className="font-display text-xl font-bold mb-4 text-foreground">System Health</h2>
          {metrics.length === 0 ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
              <TrendingUp className="mx-auto mb-3 h-8 w-8 opacity-30"/>
              <p className="text-muted-foreground">No system health metrics recorded yet.</p>
            </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2"></div>)}
        </motion.div>
      </section>
    </AdminLayout>);
};
export default AdminMetrics;
