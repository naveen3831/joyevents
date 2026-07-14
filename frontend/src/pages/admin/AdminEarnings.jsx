import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, ShieldCheck } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiListUsers, apiGetTickets, apiGetCommissionRate } from "@/lib/api";
import { toast } from "sonner";
const AdminEarnings = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState(0.05); // Default to 5% commission
    const [allUsers, setAllUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [activeSubTab, setActiveSubTab] = useState("summary");
    const loadData = async () => {
        if (!token)
            return;
        setLoading(true);
        try {
            const [usersRes, ticketsRes, bookingsRes, settingsRes] = await Promise.all([
                apiListUsers(token),
                apiGetTickets(token).catch(() => ({ tickets: [] })),
                apiListBookings(undefined, token).catch(() => ({ bookings: [] })),
                apiGetCommissionRate().catch(() => ({ commissionRate: 5 }))
            ]);
            setAllUsers(usersRes.users || []);
            setTickets(ticketsRes.tickets || []);
            setBookings(bookingsRes.bookings || []);
            // Settings might return percentage (e.g. 5) instead of rate (0.05)
            const rate = settingsRes.commissionRate > 1
                ? settingsRes.commissionRate / 100
                : settingsRes.commissionRate || 0.05;
            setCommissionRate(rate);
        }
        catch (err) {
            toast.error(err?.message || "Failed to load admin earnings details");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [token]);
    // 1. Calculate Onboarding Earnings (Merchants who paid onboarding quote)
    const onboardingMerchants = allUsers.filter((u) => u.role === "merchant" && (u.merchantStatus === "active" || u.merchantStatus === "paid"));
    const totalOnboardingEarnings = onboardingMerchants.reduce((sum, u) => sum + (u.quotationAmount || 0), 0);
    // 2. Calculate Limit Upgrade Earnings (Tickets that are paid or approved)
    const paidUpgradeTickets = tickets.filter((t) => t.status === "paid" || t.status === "approved");
    const totalUpgradeEarnings = paidUpgradeTickets.reduce((sum, t) => sum + (t.quotationAmount || 0), 0);
    // Total Merchant-related Setup Earnings (100% Admin Share)
    const totalMerchantEarnings = totalOnboardingEarnings + totalUpgradeEarnings;
    // Helper to calculate paid booking amount
    const getPaidAmount = (b) => (b.paymentStatus === "partially_paid" && b.isAdvancePaid) ? (b.advanceAmount || 0) : (b.price || 0);
    const isPaidBooking = (b) => b.paymentStatus === "paid" || b.paymentStatus === "partially_paid";
    // 3. Calculate Booking Commission Earnings
    const paidBookings = bookings.filter(isPaidBooking);
    const totalCommissionEarnings = paidBookings.reduce((sum, b) => sum + (getPaidAmount(b) * commissionRate), 0);
    // Grand Total Admin Earnings
    const totalAdminEarnings = totalMerchantEarnings + totalCommissionEarnings;
    return (<AdminLayout>
      <section className="py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Admin Platform Earnings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and analyze admin revenue flows from onboarding setup fees, upgrades, and platform commissions.
            </p>
          </div>
          <Button onClick={loadData} disabled={loading} variant="outline" className="border-[#A68C73]/40 text-[#A68C73] hover:bg-[#A68C73]/5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
            Refresh Earnings
          </Button>
        </div>

        {loading ? (<div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#A68C73]"/>
            <p className="text-sm">Calculating platform earnings breakdown...</p>
          </div>) : (<>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Grand Total */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="border-[#A68C73]/30 bg-card overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <TrendingUp className="h-20 w-20 text-[#A68C73]"/>
                  </div>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Platform Revenue
                    </CardDescription>
                    <CardTitle className="text-3xl font-display font-extrabold text-foreground mt-1">
                      {formatCurrency(totalAdminEarnings)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-green-500 font-semibold mt-2">
                      <ShieldCheck className="h-4 w-4"/> Secure Admin Balance (100% Owned)
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Merchant Setup Fees Card */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Merchant Sign-up & Upgrades
                    </CardDescription>
                    <CardTitle className="text-2xl font-display font-bold text-[#A68C73] mt-1">
                      {formatCurrency(totalMerchantEarnings)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-xs mt-2 border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Onboarding Fees:</span>
                      <span className="font-semibold">{formatCurrency(totalOnboardingEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-muted-foreground">Limit Upgrade Tickets:</span>
                      <span className="font-semibold">{formatCurrency(totalUpgradeEarnings)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Commission Earnings Card */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Platform Booking Commissions
                    </CardDescription>
                    <CardTitle className="text-2xl font-display font-bold text-green-600 dark:text-green-400 mt-1">
                      {formatCurrency(totalCommissionEarnings)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-xs mt-2 border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Current Rate:</span>
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/10 text-[10px] font-bold py-0.5 px-2">
                        {(commissionRate * 100).toFixed(0)}% Per Booking
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5">
                      <span className="text-muted-foreground">Commissionable Bookings:</span>
                      <span className="font-semibold">{paidBookings.length} bookings</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-border mt-8 flex-wrap">
              <button onClick={() => setActiveSubTab("summary")} className={`font-semibold text-sm pb-2.5 px-4 border-b-2 transition-all ${activeSubTab === "summary"
                ? "border-[#A68C73] text-[#A68C73]"
                : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                Revenue Breakdown
              </button>
              <button onClick={() => setActiveSubTab("merchants")} className={`font-semibold text-sm pb-2.5 px-4 border-b-2 transition-all ${activeSubTab === "merchants"
                ? "border-[#A68C73] text-[#A68C73]"
                : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                Merchants Setup Log ({onboardingMerchants.length + paidUpgradeTickets.length})
              </button>
              <button onClick={() => setActiveSubTab("commissions")} className={`font-semibold text-sm pb-2.5 px-4 border-b-2 transition-all ${activeSubTab === "commissions"
                ? "border-[#A68C73] text-[#A68C73]"
                : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                Booking Commission Log ({paidBookings.length})
              </button>
            </div>

            {/* TAB CONTENT: 1. Summary */}
            {activeSubTab === "summary" && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 md:grid-cols-2 mt-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold font-display">Merchant Onboarding vs Commissions Split</CardTitle>
                    <CardDescription>Visual comparison of platform earnings types</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Onboarding & Limits (100% Admin Share)</span>
                        <span className="font-bold text-primary">{((totalMerchantEarnings / (totalAdminEarnings || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-[#A68C73] transition-all" style={{ width: `${(totalMerchantEarnings / (totalAdminEarnings || 1)) * 100}%` }}/>
                      </div>
                      <p className="text-xs text-muted-foreground">Setup fee quotation amount paid by merchants during onboarding and upgrades.</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Booking Commissions ({(commissionRate * 100).toFixed(0)}% Rate)</span>
                        <span className="font-bold text-green-500">{((totalCommissionEarnings / (totalAdminEarnings || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${(totalCommissionEarnings / (totalAdminEarnings || 1)) * 100}%` }}/>
                      </div>
                      <p className="text-xs text-muted-foreground">Calculated commissions deducted from customer payments made on events & services.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold font-display">Earnings Rules & Setup</CardTitle>
                    <CardDescription>How admin revenue is structured on JoyEvents</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <div className="p-3 bg-secondary/50 rounded-lg space-y-1.5 border border-border">
                      <h5 className="font-semibold text-xs uppercase text-muted-foreground">Onboarding Setup Fees</h5>
                      <p className="text-xs text-muted-foreground">When an administrator registers a merchant or the merchant applies, the admin sends a custom quotation setup amount. Once paid by the merchant, this amount is credited <strong>100% directly to the admin balance</strong>.</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg space-y-1.5 border border-border">
                      <h5 className="font-semibold text-xs uppercase text-muted-foreground">Upgrade Ticket Slots</h5>
                      <p className="text-xs text-muted-foreground">Merchants can request limit upgrades for adding events and services. Admins issue custom quotation setup fees for the upgrade request. This amount is also credited <strong>100% directly to the admin balance</strong>.</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg space-y-1.5 border border-border">
                      <h5 className="font-semibold text-xs uppercase text-muted-foreground">Platform Commissions</h5>
                      <p className="text-xs text-muted-foreground">On booking payments (Paid or partially paid), the platform takes a <strong>{(commissionRate * 100).toFixed(0)}% commission</strong>. The remaining <strong>{(100 - commissionRate * 100).toFixed(0)}%</strong> is processed to the merchant's withdrawable balance.</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>)}

            {/* TAB CONTENT: 2. Merchant Setup Payments */}
            {activeSubTab === "merchants" && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base font-bold font-display">Merchant Onboarding & Upgrades Logs</CardTitle>
                      <CardDescription>Setup and slots ticket payment receipts (100% Admin Share)</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/40">
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground whitespace-nowrap">Merchant</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Payment Type</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Amount</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Details/Limits</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Payment Date</TableHead>
                          <TableHead className="text-right text-muted-foreground whitespace-nowrap">Admin Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Onboarding Logs */}
                        {onboardingMerchants.map((u) => (<TableRow key={`onb-${u._id}`} className="border-border hover:bg-secondary/15 transition-colors">
                            <TableCell className="align-middle font-medium py-3">
                              <div className="flex flex-col">
                                <span>{u.name}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle py-3">
                              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/25">
                                Onboarding Setup Fee
                              </Badge>
                            </TableCell>
                            <TableCell className="align-middle py-3 font-semibold text-foreground">
                              {formatCurrency(u.quotationAmount || 0)}
                            </TableCell>
                            <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                              Business: {u.merchantDetails?.businessName || "—"}
                            </TableCell>
                            <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                              {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="align-middle py-3 font-semibold text-right text-green-500">
                              +{formatCurrency(u.quotationAmount || 0)} (100%)
                            </TableCell>
                          </TableRow>))}

                        {/* Upgrade Ticket Logs */}
                        {paidUpgradeTickets.map((t) => (<TableRow key={`tkt-${t._id}`} className="border-border hover:bg-secondary/15 transition-colors">
                            <TableCell className="align-middle font-medium py-3">
                              <div className="flex flex-col">
                                <span>{t.merchant?.name || "Merchant"}</span>
                                <span className="text-xs text-muted-foreground">{t.merchant?.email || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle py-3">
                              <Badge className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/25">
                                Slots Limit Upgrade Ticket
                              </Badge>
                            </TableCell>
                            <TableCell className="align-middle py-3 font-semibold text-foreground">
                              {formatCurrency(t.quotationAmount || 0)}
                            </TableCell>
                            <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                              +{t.requestedEvents || 0}E, +{t.requestedServices || 0}S slots
                            </TableCell>
                            <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                              {t.paymentDetails?.paidAt ? new Date(t.paymentDetails.paidAt).toLocaleDateString() : new Date(t.updatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="align-middle py-3 font-semibold text-right text-green-500">
                              +{formatCurrency(t.quotationAmount || 0)} (100%)
                            </TableCell>
                          </TableRow>))}

                        {(onboardingMerchants.length === 0 && paidUpgradeTickets.length === 0) && (<TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No setup payments logged yet.
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>)}

            {/* TAB CONTENT: 3. Commissions Logs */}
            {activeSubTab === "commissions" && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold font-display">Booking Platform Commissions</CardTitle>
                    <CardDescription>Commission splits deducted from successful merchant bookings ({(commissionRate * 100).toFixed(0)}% commission rate)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/40">
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground whitespace-nowrap">Booking Event/Service</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Merchant</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Customer</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Paid Amount</TableHead>
                          <TableHead className="text-muted-foreground whitespace-nowrap">Merchant Share ({(100 - commissionRate * 100).toFixed(0)}%)</TableHead>
                          <TableHead className="text-right text-muted-foreground whitespace-nowrap">Admin Commission ({(commissionRate * 100).toFixed(0)}%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paidBookings.map((b) => {
                    const paidVal = getPaidAmount(b);
                    const commVal = paidVal * commissionRate;
                    const merchVal = paidVal - commVal;
                    return (<TableRow key={b._id} className="border-border hover:bg-secondary/15 transition-colors">
                              <TableCell className="align-middle font-medium py-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span>{b.serviceName || b.event}</span>
                                  <span className="text-xs text-muted-foreground">ID: {b._id}</span>
                                </div>
                              </TableCell>
                              <TableCell className="align-middle py-3 text-xs font-semibold">
                                {b.assignedTo?.name || "Assigned Merchant"}
                              </TableCell>
                              <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                                {b.customer?.name || "Customer"}
                              </TableCell>
                              <TableCell className="align-middle py-3 font-semibold text-foreground">
                                {formatCurrency(paidVal)}
                              </TableCell>
                              <TableCell className="align-middle py-3 text-xs text-muted-foreground">
                                {formatCurrency(merchVal)}
                              </TableCell>
                              <TableCell className="align-middle py-3 font-bold text-right text-green-500">
                                +{formatCurrency(commVal)}
                              </TableCell>
                            </TableRow>);
                })}
                        {paidBookings.length === 0 && (<TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No commission earnings logged yet.
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>)}
          </>)}
      </section>
    </AdminLayout>);
};
export default AdminEarnings;
