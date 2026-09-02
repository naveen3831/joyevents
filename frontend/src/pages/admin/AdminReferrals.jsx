import { useEffect, useState } from "react";
import { Gift, Loader2, Save, Wallet } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetAdminReferrals, apiSaveAdminReferrals } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";

const statusClass = (status) => {
    if (status === "completed" || status === "paid" || status === "confirmed")
        return "bg-green-500/10 text-green-600 border-green-500/25";
    if (status === "cancelled" || status === "refunded" || status === "failed")
        return "bg-red-500/10 text-red-500 border-red-500/25";
    return "bg-amber-500/10 text-amber-600 border-amber-500/25";
};

const AdminReferrals = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({ discountAmount: 100, bonusAmount: 100, isActive: true });
    const [stats, setStats] = useState({ total: 0, discountGiven: 0, bonusPaid: 0 });
    const [bookings, setBookings] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await apiGetAdminReferrals(token);
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
            const res = await apiSaveAdminReferrals({ ...settings, discountAmount, bonusAmount }, token);
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

    return (<AdminLayout>
      <div className="w-full min-w-0 space-y-6 font-sans">
        <div>
          <div className="flex items-center gap-3">
            <Gift className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0"/>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-3xl font-bold truncate">Referral Management</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Set referral discount and wallet bonus amounts for completed bookings.
              </p>
            </div>
          </div>
        </div>

        {loading ? (<Card>
            <CardContent className="p-8 sm:p-12 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin"/> Loading referrals...
            </CardContent>
          </Card>) : (<>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                  <p className="text-xs sm:text-sm text-muted-foreground">Referral Bookings</p>
                  <p className="font-display text-xl sm:text-3xl font-bold mt-1">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                  <p className="text-xs sm:text-sm text-muted-foreground">Discount Given</p>
                  <p className="font-display text-xl sm:text-3xl font-bold mt-1 truncate">{formatCurrency(stats.discountGiven || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                  <p className="text-xs sm:text-sm text-muted-foreground">Wallet Bonus Paid</p>
                  <p className="font-display text-xl sm:text-3xl font-bold mt-1 truncate">{formatCurrency(stats.bonusPaid || 0)}</p>
                </CardContent>
              </Card>
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
                    <Input type="number" min="0" step="1" value={settings.discountAmount} onChange={(e) => setSettings((current) => ({ ...current, discountAmount: e.target.value }))} className="mt-1 bg-secondary border-border"/>
                  </div>
                  <div>
                    <Label>Wallet bonus for referrer</Label>
                    <Input type="number" min="0" step="1" value={settings.bonusAmount} onChange={(e) => setSettings((current) => ({ ...current, bonusAmount: e.target.value }))} className="mt-1 bg-secondary border-border"/>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Referral program active</span>
                  <Switch checked={settings.isActive} onCheckedChange={(checked) => setSettings((current) => ({ ...current, isActive: checked }))}/>
                </div>
                <Button onClick={saveSettings} disabled={saving} className="gap-2 min-h-[40px]">
                  <Save className="h-4 w-4"/> {saving ? "Saving..." : "Save Referral Settings"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Referral Booking Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {!bookings.length ? (<div className="py-12 text-center text-muted-foreground">No referral activity yet.</div>) : (
                  <DataTable minWidth="100%">
                    <TableHeader>
                      <TableHeaderCell className="w-[18%]">Referrer</TableHeaderCell>
                      <TableHeaderCell className="w-[15%]">Customer</TableHeaderCell>
                      <TableHeaderCell className="w-[20%]">Event / Service</TableHeaderCell>
                      <TableHeaderCell align="center" className="w-[13%] text-center">Booking Status</TableHeaderCell>
                      <TableHeaderCell className="w-[10%]">Payment</TableHeaderCell>
                      <TableHeaderCell className="w-[8%] whitespace-nowrap">Discount</TableHeaderCell>
                      <TableHeaderCell className="w-[8%] whitespace-nowrap">Bonus</TableHeaderCell>
                      <TableHeaderCell align="right" className="w-[8%]">Bonus Status</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking._id}>
                          <TableCell>
                            <p className="font-semibold text-xs text-foreground">{booking.referral?.referrer?.name || "User"}</p>
                            <p className="text-[10px] text-muted-foreground">{booking.referral?.code}</p>
                          </TableCell>
                          <TableCell className="text-xs">{booking.customer?.name || "Customer"}</TableCell>
                          <TableCell>
                            <p className="font-semibold text-xs text-foreground truncate max-w-[180px]">{booking.serviceName || booking.eventName || "Booking"}</p>
                            <p className="text-[10px] text-muted-foreground">{booking.serviceName ? "Service booking" : "Event booking"}</p>
                          </TableCell>
                          <TableCell align="center" className="text-center">
                            <StatusBadge status={booking.status || "pending"} className="w-[106px] h-[28px] px-0 inline-flex items-center justify-center text-center font-semibold text-[11px] rounded-full border shadow-none" />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.paymentStatus || "pending"} />
                          </TableCell>
                          <TableCell className="text-xs font-semibold whitespace-nowrap">{formatCurrency(booking.referral?.discountAmount || 0)}</TableCell>
                          <TableCell className="text-xs font-semibold text-emerald-600 whitespace-nowrap">{formatCurrency(booking.referral?.bonusAmount || 0)}</TableCell>
                          <TableCell align="right" className="text-xs">
                            <StatusBadge status={booking.referral?.bonusCredited ? "active" : "pending"} label={booking.referral?.bonusCredited ? "Credited" : "Waiting"} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                )}
              </CardContent>
            </Card>
          </>)}
      </div>
    </AdminLayout>);
};

export default AdminReferrals;
