import { useEffect, useState } from "react";
import { Gift, Loader2, Save, Wallet, Users, Coins } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMerchantReferrals, apiSaveMerchantReferrals } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

const statusClass = (status) => {
    if (status === "completed" || status === "paid" || status === "confirmed")
        return "bg-green-500/10 text-green-600 border-green-500/25";
    if (status === "cancelled" || status === "refunded" || status === "failed")
        return "bg-red-500/10 text-red-500 border-red-500/25";
    return "bg-amber-500/10 text-amber-600 border-amber-500/25";
};

const MerchantReferrals = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({ discountAmount: 100, bonusAmount: 100, isActive: true });
    const [stats, setStats] = useState({ total: 0, discountGiven: 0, bonusPaid: 0 });
    const [bookings, setBookings] = useState([]);
    const listRef = useGsapStagger([bookings]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await apiGetMerchantReferrals(token);
            setSettings(res.settings || settings);
            setStats(res.stats || stats);
            setBookings(res.referredBookings || []);
        }
        catch (error) {
            toast.error(error?.message || "Failed to load referrals");
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token)
            loadData();
    }, [token]);

    const saveSettings = async () => {
        const discountAmount = Number(settings.discountAmount);
        const bonusAmount = Number(settings.bonusAmount);
        if (!Number.isFinite(discountAmount) || discountAmount < 0) {
            toast.error("Enter a valid discount amount");
            return;
        }
        if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
            toast.error("Enter a valid bonus amount");
            return;
        }
        try {
            setSaving(true);
            const res = await apiSaveMerchantReferrals({ ...settings, discountAmount, bonusAmount }, token);
            setSettings(res.settings);
            toast.success("Referral settings updated");
            loadData();
        }
        catch (error) {
            toast.error(error?.message || "Failed to save referral settings");
        }
        finally {
            setSaving(false);
        }
    };

    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10 space-y-6">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="tint-chip h-10 w-10 bg-tint-pink text-tint-pink-fg shrink-0">
            <Gift className="h-5 w-5"/>
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Referral Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage referral discounts and review referral bookings for your events and services.
            </p>
          </div>
        </div>

        {loading ? (<Card>
            <CardContent className="p-12 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading referrals...
            </CardContent>
          </Card>) : (<>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatCard title="Referral Bookings" value={stats.total} icon={<Users className="h-5 w-5"/>} index={0}/>
              <StatCard title="Discount Given" value={formatCurrency(stats.discountGiven || 0)} icon={<Gift className="h-5 w-5"/>} index={1}/>
              <StatCard title="Wallet Bonus Paid" value={formatCurrency(stats.bonusPaid || 0)} icon={<Coins className="h-5 w-5"/>} index={2}/>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary"/> Referral Amount Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Discount for referred user</Label>
                    <Input type="number" min="0" step="1" value={settings.discountAmount} onChange={(e) => setSettings((current) => ({ ...current, discountAmount: e.target.value }))} className="mt-1 border-border bg-background rounded-lg"/>
                  </div>
                  <div>
                    <Label>Wallet bonus for referrer</Label>
                    <Input type="number" min="0" step="1" value={settings.bonusAmount} onChange={(e) => setSettings((current) => ({ ...current, bonusAmount: e.target.value }))} className="mt-1 border-border bg-background rounded-lg"/>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3 min-h-[44px]">
                  <span className="text-sm font-medium">Referral program active</span>
                  <Switch checked={settings.isActive} onCheckedChange={(checked) => setSettings((current) => ({ ...current, isActive: checked }))}/>
                </div>
                <Button onClick={saveSettings} disabled={saving} className="gap-2 w-full sm:w-auto bg-gradient-primary text-primary-foreground min-h-[44px]">
                  <Save className="h-4 w-4"/> {saving ? "Saving..." : "Save Referral Settings"}
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="p-4 sm:p-6 border-b border-border/80">
                <h2 className="font-display text-lg sm:text-xl font-bold">Referral Booking Activity</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Track referred customers, discount claims, and credited wallet bonuses.</p>
              </div>
              {!bookings.length ? (
                <TableEmptyState title="No referral activity yet" description="Referral bookings from customers will appear here." colSpan={7} />
              ) : (
                <DataTable minWidth="700px">
                  <TableHeader>
                    <TableHeaderCell width="160px">Referrer</TableHeaderCell>
                    <TableHeaderCell width="160px">Customer</TableHeaderCell>
                    <TableHeaderCell width="180px">Event / Service</TableHeaderCell>
                    <TableHeaderCell width="120px">Booking Status</TableHeaderCell>
                    <TableHeaderCell width="110px">Payment</TableHeaderCell>
                    <TableHeaderCell width="140px">Bonus Status</TableHeaderCell>
                    <TableHeaderCell align="right" width="100px">Bonus</TableHeaderCell>
                  </TableHeader>
                  <TableBody ref={listRef}>
                    {bookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell>
                          <p className="font-semibold text-xs text-foreground">{booking.referral?.referrer?.name || "User"}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{booking.referral?.code}</p>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{booking.customer?.name || "Customer"}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-xs text-foreground">{booking.serviceName || booking.eventName || "Booking"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{booking.serviceName ? "Service booking" : "Event booking"}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status || "pending"} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.paymentStatus || "pending"} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.referral?.bonusCredited ? "completed" : "pending"} label={booking.referral?.bonusCredited ? "Credited" : "Pending Completion"} />
                        </TableCell>
                        <TableCell align="right" className="font-bold text-xs text-emerald-600">
                          {formatCurrency(booking.referral?.bonusAmount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              )}
            </div>
          </>)}
      </section>
    </MerchantLayout>);
};

export default MerchantReferrals;
