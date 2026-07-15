import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calculator, DollarSign, TrendingUp, Percent, Wallet, ArrowRight, Info } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetCommissionRate, apiListBookings, apiSaveCommissionRate } from "@/lib/api";
import { toast } from "sonner";
const getCommissionDetails = (booking) => {
    const isAdminBooking = booking.assignedTo?.role === "admin" || booking.commissionSummary?.adminDirect;
    if (booking.commissionSummary) {
        const revenue = booking.commissionSummary.grossAmount || booking.price || 0;
        if (isAdminBooking) {
            return {
                revenue,
                commission: 0,
                payout: 0,
                adminEarning: revenue,
                rateLabel: "No commission",
                isSaved: true,
                isAdminBooking
            };
        }
        return {
            revenue,
            commission: booking.commissionSummary.commissionAmount || 0,
            payout: booking.commissionSummary.merchantPayout || 0,
            adminEarning: booking.commissionSummary.commissionAmount || 0,
            rateLabel: booking.commissionSummary.commissionRate !== null
                ? `${booking.commissionSummary.commissionRate}%`
                : booking.commissionSummary.commissionRates?.length
                    ? "Mixed"
                    : "Saved",
            isSaved: true,
            isAdminBooking
        };
    }
    const revenue = booking.price || 0;
    if (isAdminBooking) {
        return {
            revenue,
            commission: 0,
            payout: 0,
            adminEarning: revenue,
            rateLabel: "No commission",
            isSaved: false,
            isAdminBooking
        };
    }
    return {
        revenue,
        commission: 0,
        payout: 0,
        adminEarning: 0,
        rateLabel: "Not saved",
        isSaved: false,
        isAdminBooking
    };
};
const AdminCommissions = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputRate, setInputRate] = useState("10");
    const [currentRate, setCurrentRate] = useState(10);
    const [savingRate, setSavingRate] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    useEffect(() => {
        if (!token)
            return;
        loadCommissionRate();
        loadBookings();
    }, [token]);
    const loadCommissionRate = async () => {
        try {
            const data = await apiGetCommissionRate();
            setCurrentRate(data.commissionRate);
            setInputRate(data.commissionRate.toString());
        }
        catch {
            toast.error("Failed to load commission rate");
        }
    };
    const loadBookings = async () => {
        try {
            setLoading(true);
            const data = await apiListBookings(undefined, token);
            // Show all paid/completed bookings
            const paid = (data.bookings || []).filter((b) => b.paymentStatus === "paid" || b.status === "completed");
            setBookings(paid);
        }
        catch {
            toast.error("Failed to load commission data");
        }
        finally {
            setLoading(false);
        }
    };
    const validateAndConfirm = () => {
        const rate = Number(inputRate);
        if (Number.isNaN(rate) || rate < 1 || rate > 100) {
            toast.error("Commission rate must be between 1 and 100");
            return;
        }
        if (rate === currentRate) {
            toast.info("Rate is already set to " + rate + "%");
            return;
        }
        setShowConfirm(true);
    };
    const handleConfirmUpdate = async () => {
        const rate = Number(inputRate);
        try {
            setSavingRate(true);
            await apiSaveCommissionRate(rate, token);
            setCurrentRate(rate);
            toast.success(`Commission rate updated to ${rate}%. All new bookings will use this rate.`);
        }
        catch (error) {
            toast.error(error.message || "Failed to save commission rate");
        }
        finally {
            setSavingRate(false);
            setShowConfirm(false);
        }
    };
    const commissionRows = bookings.map((booking) => ({
        booking,
        ...getCommissionDetails(booking)
    }));
    const totalRevenue = commissionRows.reduce((sum, row) => sum + row.revenue, 0);
    const totalAdminEarnings = commissionRows.reduce((sum, row) => sum + row.adminEarning, 0);
    const totalMerchantPayout = commissionRows.reduce((sum, row) => sum + row.payout, 0);
    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="h-8 w-8 text-primary"/>
              <div>
                <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
                  Commission <span className="text-gradient">Management</span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Set the platform commission rate. Changes only apply to future bookings.
                </p>
              </div>
            </div>
          </div>

          {/* Commission Rate Settings */}
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary"/>
                Commission Rate Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div>
                    <Label htmlFor="commission-rate">New Commission Rate (%)</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input id="commission-rate" type="number" value={inputRate} onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
                setInputRate(val);
                return;
            }
            const rate = Math.trunc(Number(val));
            if (Number.isNaN(rate))
                return;
            setInputRate(Math.min(100, Math.max(1, rate)).toString());
        }} className="w-28" min="1" max="100" step="1"/>
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <Button onClick={validateAndConfirm} disabled={savingRate} className="w-full sm:w-auto">
                    Update Rate
                    <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-400">
                  <Info className="h-4 w-4 mt-0.5 shrink-0"/>
                  <div className="space-y-1">
                    <p><strong>Current active rate: {currentRate}%</strong></p>
                    <p>Example at {inputRate || currentRate}%: ₹1,000 booking → Platform gets ₹{((Number(inputRate) || currentRate) * 10).toFixed(0)} | Merchant gets ₹{(1000 - (Number(inputRate) || currentRate) * 10).toFixed(0)}</p>
                    <p className="text-blue-300">⚠ Updating the rate will NOT change any previous payments or earnings. Only new bookings after this update will use the new rate.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/15 p-3">
                    <DollarSign className="h-5 w-5 text-blue-400"/>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/15 p-3">
                    <TrendingUp className="h-5 w-5 text-green-400"/>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Admin Earnings</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalAdminEarnings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-500/15 p-3">
                    <Wallet className="h-5 w-5 text-purple-400"/>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant Payouts</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{formatCurrency(totalMerchantPayout)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-orange-500/15 p-3">
                    <Calculator className="h-5 w-5 text-orange-400"/>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Bookings</p>
                    <p className="font-display text-xs sm:text-2xl font-bold truncate">{bookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground">
                  Loading commission data...
                </div>) : bookings.length === 0 ? (<div className="py-16 text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p>No paid bookings to show commissions.</p>
                </div>) : (<div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Service / Event</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Commission Rate</TableHead>
                        <TableHead>Admin Earnings</TableHead>
                        <TableHead>Merchant Payout</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionRows.map(({ booking, adminEarning, payout, rateLabel, isSaved, isAdminBooking }) => {
                return (<TableRow key={booking._id}>
                            <TableCell className="font-mono text-xs">{booking._id.slice(-8)}</TableCell>
                            <TableCell>
                              <p className="font-medium">
                                {booking.service?.name || booking.serviceName || booking.event?.title || "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{booking.customer?.name}</p>
                              <p className="text-xs text-muted-foreground">{booking.customer?.email}</p>
                            </TableCell>
                            <TableCell>
                              {booking.assignedTo ? (<>
                                  <p className="font-medium">{booking.assignedTo.name}</p>
                                  <p className="text-xs text-muted-foreground">{booking.assignedTo.email}</p>
                                </>) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(booking.price)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={isAdminBooking ? "bg-blue-500/15 text-blue-400" : isSaved ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}>
                                {rateLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-500 font-semibold">
                              {formatCurrency(adminEarning, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-purple-500 font-semibold">
                              {formatCurrency(payout, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(booking.datetime).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={booking.status === "completed"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-blue-500/15 text-blue-400"}>
                                {booking.status}
                              </Badge>
                            </TableCell>
                          </TableRow>);
            })}
                    </TableBody>
                  </Table>
                </div>)}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Commission Rate?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are changing the commission rate from <strong>{currentRate}%</strong> to <strong>{inputRate}%</strong>.
              </p>
              <p className="text-yellow-500 font-medium">
                ⚠ This will NOT affect any previous payments or earnings. All existing transaction records remain unchanged.
              </p>
              <p>
                Only new bookings created after this update will use the new <strong>{inputRate}%</strong> rate.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate} disabled={savingRate}>
              {savingRate ? "Updating..." : "Yes, Update Rate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>);
};
export default AdminCommissions;
