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

            <Card>
              <CardHeader><CardTitle>Referral Booking Activity</CardTitle></CardHeader>
              <CardContent>
                {!bookings.length ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground"/>
                  <p className="text-muted-foreground">No referral activity yet.</p>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4">Referrer</th>
                        <th className="py-3 pr-4">Customer</th>
                        <th className="py-3 pr-4">Event / Service</th>
                        <th className="py-3 pr-4">Booking Status</th>
                        <th className="py-3 pr-4">Payment</th>
                        <th className="py-3 pr-4">Bonus Status</th>
                        <th className="py-3 pr-4">Bonus</th>
                      </tr>
                    </thead>
                    <tbody ref={listRef} className="divide-y divide-border">
                      {bookings.map((booking) => (<tr key={booking._id}>
                        <td className="py-3 pr-4"><p className="font-medium">{booking.referral?.referrer?.name || "User"}</p><p className="text-xs text-muted-foreground">{booking.referral?.code}</p></td>
                        <td className="py-3 pr-4">{booking.customer?.name || "Customer"}</td>
                        <td className="py-3 pr-4"><p className="font-medium">{booking.serviceName || booking.eventName || "Booking"}</p><p className="text-xs text-muted-foreground">{booking.serviceName ? "Service booking" : "Event booking"}</p></td>
                        <td className="py-3 pr-4"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>{booking.status || "pending"}</span></td>
                        <td className="py-3 pr-4"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.paymentStatus)}`}>{booking.paymentStatus || "pending"}</span></td>
                        <td className="py-3 pr-4 capitalize">{booking.referral?.bonusCredited ? "credited" : "waiting for completion"}</td>
                        <td className="py-3 pr-4">{formatCurrency(booking.referral?.bonusAmount || 0)}</td>
                      </tr>))}
                    </tbody>
                  </table>
                </div>)}
              </CardContent>
            </Card>
          </>)}
      </section>
    </MerchantLayout>);
};

export default MerchantReferrals;
