import { motion } from "framer-motion";
const StatCard = ({ title, value, icon, trend, index = 0 }) => (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="rounded-lg border border-border bg-card p-3 sm:p-5 hover-lift">
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{title}</p>
        <p className="mt-0.5 sm:mt-1 font-display text-sm sm:text-2xl font-bold text-foreground truncate">{value}</p>
        {trend && <p className="mt-0.5 text-xs text-success">{trend}</p>}
      </div>
      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
        <span className="[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{icon}</span>
      </div>
    </div>
  </motion.div>);
export default StatCard;
