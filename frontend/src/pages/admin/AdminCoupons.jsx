import AdminLayout from "@/components/AdminLayout";
import { Ticket } from "lucide-react";

const AdminCoupons = () => {
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500"/> Coupons & <span className="text-gradient">Offers</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor promo codes and offers merchants create to boost bookings across the platform</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Merchants can create and manage promo codes to boost event bookings. Monitor all active promo codes across the platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">Active Promo Codes</p>
              <p className="font-display text-xl sm:text-2xl font-bold mt-2">—</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground">Total Discounts Given</p>
              <p className="font-display text-xl sm:text-2xl font-bold mt-2">—</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground">Promo Code Usage</p>
              <p className="font-display text-xl sm:text-2xl font-bold mt-2">—</p>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>);
};

export default AdminCoupons;
