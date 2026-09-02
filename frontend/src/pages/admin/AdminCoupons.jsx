import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Ticket,
  Search,
  Filter,
  Trash2,
  Power,
  Tag,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Percent,
  IndianRupee,
  Layers,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetPromoCodes, apiUpdatePromoCode, apiDeletePromoCode } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";

const AdminCoupons = () => {
  const { token } = useAuth();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    if (!token) return;
    loadPromoCodes();
  }, [token]);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const res = await apiGetPromoCodes(token);
      setPromoCodes(res.promoCodes || []);
    } catch (error) {
      toast.error(error?.message || "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (promo) => {
    setActionId(promo._id);
    try {
      const newStatus = !promo.isActive;
      await apiUpdatePromoCode(promo._id, { isActive: newStatus }, token);
      toast.success(`Promo code ${promo.code} set to ${newStatus ? "Active" : "Inactive"}`);
      setPromoCodes((prev) =>
        prev.map((p) => (p._id === promo._id ? { ...p, isActive: newStatus } : p))
      );
    } catch (error) {
      toast.error(error?.message || "Failed to update promo status");
    } finally {
      setActionId(null);
    }
  };

  const handleDeletePromo = async (promo) => {
    if (!confirm(`Are you sure you want to delete promo code "${promo.code}"?`)) return;

    setActionId(promo._id);
    try {
      await apiDeletePromoCode(promo._id, token);
      toast.success(`Promo code ${promo.code} deleted`);
      setPromoCodes((prev) => prev.filter((p) => p._id !== promo._id));
    } catch (error) {
      toast.error(error?.message || "Failed to delete promo code");
    } finally {
      setActionId(null);
    }
  };

  // Filtered list
  const filteredPromos = promoCodes.filter((promo) => {
    const codeMatch = (promo.code || "").toLowerCase().includes(search.toLowerCase());
    const descMatch = (promo.description || "").toLowerCase().includes(search.toLowerCase());
    const merchantMatch = (promo.merchant?.name || "").toLowerCase().includes(search.toLowerCase());
    const searchMatch = codeMatch || descMatch || merchantMatch;

    let statusMatch = true;
    if (statusFilter === "active") statusMatch = promo.isActive !== false;
    if (statusFilter === "inactive") statusMatch = promo.isActive === false;

    let typeMatch = true;
    if (typeFilter === "percentage") typeMatch = promo.discountType === "percentage";
    if (typeFilter === "fixed") typeMatch = promo.discountType === "fixed" || promo.discountType === "flat";

    return searchMatch && statusMatch && typeMatch;
  });

  // Calculate Metrics
  const activeCount = promoCodes.filter((p) => p.isActive !== false).length;
  const totalUsages = promoCodes.reduce((sum, p) => sum + (p.currentUses || 0), 0);
  const totalDiscountGiven = promoCodes.reduce((sum, p) => {
    if (p.totalDiscountGiven) return sum + p.totalDiscountGiven;
    if (p.discountType === "fixed" || p.discountType === "flat") {
      return sum + (p.currentUses || 0) * (p.discountValue || 0);
    }
    return sum + (p.currentUses || 0) * 150; // estimate for percentage
  }, 0);

  return (
    <AdminLayout>
      <div className="w-full max-w-[1280px] mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Coupons & Offers"
          subtitle="Monitor, filter, and manage merchant promo codes to boost bookings across the platform."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "Growth" },
            { label: "Coupons & Offers" },
          ]}
        />

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Active Promo Codes
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {loading ? "…" : activeCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Out of {promoCodes.length} total created codes
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Tag className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Discounts Given
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {loading ? "…" : formatCurrency(totalDiscountGiven)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Cumulative discount savings applied
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Promo Code Usage
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {loading ? "…" : totalUsages}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Successful booking redemptions
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Main Content Workspace Card */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="relative flex-1 min-w-[240px] max-w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search promo code, merchant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg border-border/80"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs rounded-lg border-border/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs rounded-lg border-border/80">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : filteredPromos.length === 0 ? (
            <TableEmptyState
              title="No Promo Codes Found"
              description="No promo codes match your search criteria or none have been created yet."
              icon={Ticket}
            />
          ) : (
            <DataTable minWidth="850px">
              <TableHeader>
                <TableHeaderCell className="w-[18%]">PROMO CODE</TableHeaderCell>
                <TableHeaderCell className="w-[22%]">MERCHANT</TableHeaderCell>
                <TableHeaderCell className="w-[16%]">DISCOUNT</TableHeaderCell>
                <TableHeaderCell className="w-[14%]">USAGE</TableHeaderCell>
                <TableHeaderCell className="w-[12%]">APPLIES TO</TableHeaderCell>
                <TableHeaderCell align="center" className="w-[10%] text-center">STATUS</TableHeaderCell>
                <TableHeaderCell align="right" className="w-[8%] text-right">ACTIONS</TableHeaderCell>
              </TableHeader>

              <TableBody>
                {filteredPromos.map((promo) => {
                  const isActive = promo.isActive !== false;
                  const discountDisplay =
                    promo.discountType === "percentage"
                      ? `${promo.discountValue}% OFF`
                      : `${formatCurrency(promo.discountValue)} OFF`;

                  const maxUsesText = promo.maxUses ? `${promo.currentUses || 0} / ${promo.maxUses}` : `${promo.currentUses || 0} / ∞`;

                  return (
                    <TableRow key={promo._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 h-[52px]">
                      {/* Code */}
                      <TableCell className="w-[18%]">
                        <div className="flex items-center gap-2">
                          <code className="px-2.5 py-1 rounded-md bg-secondary border border-border font-mono font-bold text-xs text-primary tracking-wide">
                            {promo.code}
                          </code>
                        </div>
                        {promo.description && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px] mt-0.5" title={promo.description}>
                            {promo.description}
                          </p>
                        )}
                      </TableCell>

                      {/* Merchant */}
                      <TableCell className="w-[22%]">
                        <p className="font-semibold text-xs text-foreground truncate max-w-[180px]">
                          {promo.merchant?.name || "Platform Admin"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                          {promo.merchant?.email || "System"}
                        </p>
                      </TableCell>

                      {/* Discount Value */}
                      <TableCell className="w-[16%]">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                          {discountDisplay}
                        </span>
                        {promo.minBookingAmount > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Min: {formatCurrency(promo.minBookingAmount)}
                          </p>
                        )}
                      </TableCell>

                      {/* Usage */}
                      <TableCell className="w-[14%]">
                        <span className="text-xs font-semibold text-foreground font-mono">
                          {maxUsesText}
                        </span>
                        <p className="text-[10px] text-muted-foreground">redemptions</p>
                      </TableCell>

                      {/* Applies To */}
                      <TableCell className="w-[12%]">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground capitalize">
                          <Layers className="h-3 w-3 text-primary shrink-0" />
                          {promo.appliesTo || "All Items"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center" className="w-[10%] text-center">
                        <StatusBadge
                          status={isActive ? "active" : "inactive"}
                          label={isActive ? "Active" : "Inactive"}
                          className="w-[90px] h-[26px] px-0 inline-flex items-center justify-center text-[11px] font-semibold rounded-full"
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" className="w-[8%] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(promo)}
                            disabled={actionId === promo._id}
                            title={isActive ? "Deactivate Promo Code" : "Activate Promo Code"}
                            className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors ${
                              isActive
                                ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePromo(promo)}
                            disabled={actionId === promo._id}
                            title="Delete Promo Code"
                            className="h-7 w-7 rounded-md border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCoupons;
