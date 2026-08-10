import { useEffect, useMemo, useState } from "react";
import { Copy, Gift, Link as LinkIcon, Loader2, Wallet, Users, Clock, CheckCircle2, Tag } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMyReferral, apiVerifyToken } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import { useGsapStagger } from "@/lib/gsapAnimations";

const statusClass = (status) => {
    if (status === "completed" || status === "paid" || status === "confirmed")
        return "bg-green-500/10 text-green-600 border-green-500/25";
    if (status === "cancelled" || status === "refunded" || status === "failed")
        return "bg-red-500/10 text-red-500 border-red-500/25";
    return "bg-amber-500/10 text-amber-600 border-amber-500/25";
};

const CustomerReferral = () => {
    const { token, updateUser } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const referralLink = useMemo(() => {
        if (!data?.referralCode)
            return "";
        return `${window.location.origin}/register?ref=${encodeURIComponent(data.referralCode)}`;
    }, [data?.referralCode]);

    useEffect(() => {
        let cancelled = false;
        const loadReferral = async () => {
            try {
                setLoading(true);
                const res = await apiGetMyReferral(token);
                if (cancelled)
                    return;
                setData(res);
                const verifyRes = await apiVerifyToken(token);
                if (verifyRes.user)
                    updateUser(verifyRes.user);
            }
            catch (error) {
                if (!cancelled)
                    toast.error(error?.message || "Failed to load referral details");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        if (token)
            loadReferral();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const statsRef = useGsapStagger([data]);

    const copyText = async (value, label) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        }
        catch {
            toast.error("Copy failed");
        }
    };

    return (<CustomerLayout>
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Referral</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share your referral ID. Your friend gets a discount, and your wallet gets a bonus after their booking is completed.
            </p>
          </div>

          {loading ? (<Card>
              <CardContent className="p-12 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading referral details...
              </CardContent>
            </Card>) : (<>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary"/> Your Referral ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input readOnly value={data?.referralCode || ""} className="font-mono text-lg font-bold bg-secondary border-border"/>
                      <Button onClick={() => copyText(data?.referralCode || "", "Referral ID")} className="gap-2">
                        <Copy className="h-4 w-4"/> Copy ID
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input readOnly value={referralLink} className="font-mono text-xs bg-secondary border-border"/>
                      <Button variant="outline" onClick={() => copyText(referralLink, "Referral link")} className="gap-2">
                        <LinkIcon className="h-4 w-4"/> Copy Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary"/> Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Friend discount</span>
                      <span className="font-bold">{formatCurrency(data?.settings?.discountAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Your bonus</span>
                      <span className="font-bold text-green-500">{formatCurrency(data?.settings?.bonusAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Total earned</span>
                      <span className="font-bold">{formatCurrency(data?.stats?.earned || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <StatCard title="Users Referred" value={data?.stats?.total || 0} icon={<Users className="h-5 w-5"/>} index={0}/>
                <StatCard title="Pending Bonus" value={data?.stats?.pending || 0} icon={<Clock className="h-5 w-5"/>} index={1}/>
                <StatCard title="Completed Referrals" value={data?.stats?.completed || 0} icon={<CheckCircle2 className="h-5 w-5"/>} index={2}/>
                <StatCard title="Codes Used By You" value={data?.stats?.used || 0} icon={<Tag className="h-5 w-5"/>} index={3}/>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>People Who Used Your Referral</CardTitle>
                </CardHeader>
                <CardContent>
                  {!data?.referredBookings?.length ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                      <Gift className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                      <p className="text-muted-foreground">No referral bookings yet.</p>
                    </div>) : (<div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="py-3 pr-4">Event / Service</th>
                            <th className="py-3 pr-4">Booking Status</th>
                            <th className="py-3 pr-4">Payment</th>
                            <th className="py-3 pr-4">Bonus Status</th>
                            <th className="py-3 pr-4">Bonus</th>
                            <th className="py-3 pr-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.referredBookings.map((booking) => (<tr key={booking._id}>
                              <td className="py-3 pr-4">
                                <p className="font-medium">{booking.serviceName || booking.eventName || "Booking"}</p>
                                <p className="text-xs text-muted-foreground">{booking.serviceName ? "Service booking" : "Event booking"}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>
                                  {booking.status || "pending"}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.paymentStatus)}`}>
                                  {booking.paymentStatus || "pending"}
                                </span>
                              </td>
                              <td className="py-3 pr-4 capitalize">{booking.referral?.bonusCredited ? "credited to wallet" : "waiting for completion"}</td>
                              <td className="py-3 pr-4">{formatCurrency(booking.referral?.bonusAmount || 0)}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Referral Codes You Used</CardTitle>
                </CardHeader>
                <CardContent>
                  {!data?.usedReferralBookings?.length ? (<div className="bg-card border border-border rounded-xl p-10 text-center">
                      <Tag className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                      <p className="text-muted-foreground">No bookings made with a referral code yet.</p>
                    </div>) : (<div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="py-3 pr-4">Event / Service</th>
                            <th className="py-3 pr-4">Referral Code</th>
                            <th className="py-3 pr-4">Booking Status</th>
                            <th className="py-3 pr-4">Payment</th>
                            <th className="py-3 pr-4">Discount</th>
                            <th className="py-3 pr-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.usedReferralBookings.map((booking) => (<tr key={booking._id}>
                              <td className="py-3 pr-4">
                                <p className="font-medium">{booking.serviceName || booking.eventName || "Booking"}</p>
                                <p className="text-xs text-muted-foreground">{booking.serviceName ? "Service booking" : "Event booking"}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="font-mono font-semibold">{booking.referral?.code}</p>
                                <p className="text-xs text-muted-foreground">{booking.referral?.referrer?.name || "Referrer"}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>
                                  {booking.status || "pending"}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(booking.paymentStatus)}`}>
                                  {booking.paymentStatus || "pending"}
                                </span>
                              </td>
                              <td className="py-3 pr-4">{formatCurrency(booking.referral?.discountAmount || 0)}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>)}
                </CardContent>
              </Card>
            </>)}
        </div>
      </div>
    </CustomerLayout>);
};

export default CustomerReferral;
