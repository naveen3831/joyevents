import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Info,
  CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings, apiListUsers, apiProcessMerchantPayout } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";

const cleanBookingTitle = (title) => {
  if (!title) return "Booking";
  return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, "").trim();
};

const AdminMerchantPayoutPage = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [merchant, setMerchant] = useState(null);
  const [merchantBookings, setMerchantBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payoutNote, setPayoutNote] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!token || !merchantId) return;
    loadMerchantData();
  }, [token, merchantId]);

  const loadMerchantData = async () => {
    try {
      setLoading(true);
      const [usersData, bookingsData] = await Promise.all([
        apiListUsers(token),
        apiListBookings(undefined, token),
      ]);

      const foundMerchant = (usersData.users || []).find((u) => u._id === merchantId);
      if (!foundMerchant) {
        toast.error("Merchant not found");
        navigate("/admin-dashboard/payouts");
        return;
      }
      setMerchant(foundMerchant);

      // Completed & paid bookings assigned to this merchant
      const assignedBookings = (bookingsData.bookings || []).filter(
        (b) =>
          b.assignedTo?._id === merchantId &&
          b.status === "completed" &&
          b.paymentStatus === "paid"
      );
      setMerchantBookings(assignedBookings);
    } catch {
      toast.error("Failed to load merchant payout details");
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const grossEarnings = merchantBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const totalCommission = merchantBookings.reduce(
    (sum, b) => sum + (Number(b.commissionSummary?.commissionAmount) || 0),
    0
  );
  const netPayout = merchantBookings.reduce(
    (sum, b) =>
      sum +
      (Number(b.commissionSummary?.merchantPayout) ||
        (b.price || 0) - (Number(b.commissionSummary?.commissionAmount) || 0)),
    0
  );
  const isUnpaid = merchantBookings.some((b) => !b.payoutProcessed);

  const executePayoutProcess = async () => {
    if (!merchant || merchantBookings.length === 0) {
      toast.error("No eligible bookings to process payout for");
      return;
    }

    setProcessing(true);
    try {
      const merchantBookingIds = merchantBookings.map((b) => b._id);
      const roundedNetPayout = Math.round(netPayout * 100) / 100;

      await apiProcessMerchantPayout(
        merchant._id,
        roundedNetPayout,
        merchantBookingIds,
        token
      );

      toast.success(`${formatCurrency(roundedNetPayout)} payout processed for ${merchant.name}!`);
      setShowConfirmModal(false);
      navigate("/admin-dashboard/payouts");
    } catch (error) {
      toast.error(error.message || "Failed to process merchant payout");
    } finally {
      setProcessing(false);
    }
  };

  const initials = (merchant?.name || "?").slice(0, 2).toUpperCase();

  return (
    <AdminLayout>
      <div className="w-full max-w-[1140px] mx-auto space-y-5 pb-10">
        {/* ── 1. PAGE HEADER (Fixed Top Position, No Clipping) ───────── */}
        <PageHeader
          title="Process Merchant Payout"
          subtitle="Review earnings and confirm the final settlement for this merchant."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "Payouts", to: "/admin-dashboard/payouts" },
            { label: "Process Merchant Payout" },
          ]}
          actions={
            <button
              onClick={() => navigate("/admin-dashboard/payouts")}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg border border-border/80 bg-card text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Payouts
            </button>
          }
        />

        {/* ── 2. ONE PRIMARY CONTENT WORKSPACE ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden divide-y divide-border/60"
        >
          {/* ── 3. MERCHANT HEADER ──────────────────────────────────── */}
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {merchant?.name || "Merchant"}
                </h2>
                <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                  {merchant?.email || "—"}
                </p>
              </div>
            </div>

            <StatusBadge
              status={isUnpaid ? "pending" : "completed"}
              label={isUnpaid ? "Payout Pending" : "Payout Settled"}
              className="text-[11px] font-semibold px-3 h-6 rounded-full shrink-0"
            />
          </div>

          {/* ── 4 & 5. FINANCIAL SUMMARY (Clean Horizontal Split) ───── */}
          <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60 gap-4 md:gap-0">
              {/* GROSS EARNINGS */}
              <div className="md:pr-6 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  GROSS EARNINGS
                </p>
                <p className="text-xl font-semibold text-foreground font-mono tabular-nums">
                  {loading ? "…" : formatCurrency(grossEarnings)}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {merchantBookings.length} completed booking{merchantBookings.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* PLATFORM COMMISSION */}
              <div className="pt-3 md:pt-0 md:px-6 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  PLATFORM COMMISSION
                </p>
                <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {loading ? "…" : `− ${formatCurrency(totalCommission)}`}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Platform fee deduction
                </p>
              </div>

              {/* NET PAYOUT */}
              <div className="pt-3 md:pt-0 md:pl-6 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  NET PAYOUT
                </p>
                <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
                  {loading ? "…" : formatCurrency(netPayout)}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Final settlement amount
                </p>
              </div>
            </div>
          </div>

          {/* ── 8. INFORMATION STRIP ─────────────────────────────────── */}
          <div className="px-5 sm:px-6 py-3 bg-blue-500/5 text-blue-700 dark:text-blue-300 flex items-center gap-2.5 text-xs">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="leading-snug text-[11.5px]">
              Confirmation records the payout and generates a transaction ID. Both admin and merchant will receive instant confirmation notifications.
            </p>
          </div>

          {/* ── 6. INCLUDED BOOKINGS TABLE (No Scrollbar, Native Flow) ─ */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Included Bookings
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                {merchantBookings.length} booking{merchantBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <TableSkeleton columns={3} rows={4} minWidth="100%" />
            ) : merchantBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No completed paid bookings found for this merchant.
              </p>
            ) : (
              <div className="rounded-lg border border-border/70 overflow-hidden">
                <DataTable minWidth="500px">
                  <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-border/70 h-[44px]">
                    <TableHeaderCell className="w-[50%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                      BOOKING
                    </TableHeaderCell>
                    <TableHeaderCell className="w-[30%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                      CUSTOMER
                    </TableHeaderCell>
                    <TableHeaderCell align="right" className="w-[20%] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 text-right">
                      AMOUNT
                    </TableHeaderCell>
                  </TableHeader>

                  <TableBody>
                    {merchantBookings.map((b) => {
                      const rawTitle =
                        b.serviceName || b.eventName || b.event?.title || b.service?.name || "Booking";
                      const title = cleanBookingTitle(rawTitle);
                      const bCommission = Number(b.commissionSummary?.commissionAmount) || 0;
                      const bPayout = Number(b.commissionSummary?.merchantPayout) || (b.price || 0) - bCommission;

                      return (
                        <TableRow
                          key={b._id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors h-[50px]"
                        >
                          <TableCell className="w-[50%] py-2.5">
                            <p className="font-semibold text-xs sm:text-[13px] text-foreground truncate max-w-[320px]" title={title}>
                              {title}
                            </p>
                          </TableCell>

                          <TableCell className="w-[30%] py-2.5 text-xs text-muted-foreground truncate max-w-[180px]">
                            {b.customer?.name || "Customer"}
                          </TableCell>

                          <TableCell align="right" className="w-[20%] py-2.5 text-right">
                            <span className="font-semibold text-xs sm:text-[13px] text-foreground font-mono tabular-nums whitespace-nowrap">
                              {formatCurrency(bPayout)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </DataTable>
              </div>
            )}
          </div>

          {/* ── 9. PAYOUT NOTE (Compact Height 76px) ─────────────────── */}
          <div className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="payout-note" className="text-xs font-semibold text-foreground">
                Payout note (optional)
              </label>
              <span className="text-[11px] text-muted-foreground font-normal">
                Visible to admins only.
              </span>
            </div>
            <Textarea
              id="payout-note"
              placeholder="Add an internal note or reference ID..."
              value={payoutNote}
              onChange={(e) => setPayoutNote(e.target.value)}
              className="text-xs h-[76px] min-h-[76px] max-h-[100px] resize-none rounded-lg border-border/70"
            />
          </div>

          {/* ── 10 & 11 & 12. FINAL CONFIRMATION FOOTER ─────────────── */}
          <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Amount to transfer
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums mt-0.5">
                {loading ? "…" : formatCurrency(netPayout)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/payouts")}
                disabled={processing}
                className="h-10 px-5 text-xs font-semibold rounded-lg border border-border/80 bg-card text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={processing || merchantBookings.length === 0 || loading}
                className="h-10 w-[160px] text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center cursor-pointer"
              >
                {processing ? "Processing..." : "Confirm Payout"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── 13. SAFETY CONFIRMATION DIALOG ──────────────────────────── */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Merchant Payout?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                You are processing a net payout of <strong>{formatCurrency(netPayout)}</strong> for merchant <strong>{merchant?.name}</strong>.
              </p>
              <p>
                This settlement includes <strong>{merchantBookings.length} completed bookings</strong>. Once confirmed, a transaction ID will be generated and funds will be marked as paid.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executePayoutProcess}
              disabled={processing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {processing ? "Processing..." : "Confirm Payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminMerchantPayoutPage;
