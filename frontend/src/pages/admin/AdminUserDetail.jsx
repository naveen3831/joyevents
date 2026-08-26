import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  CheckCircle2,
  KeyRound,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  DollarSign,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  Shield
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  apiListUsers,
  apiUpdateUser,
  apiDeleteUser,
  apiResetPassword,
  apiActivateMerchant,
  apiSendMerchantQuotation
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  validateEmail,
  validateNewPasswordForm,
  validateMobileNumber,
  formatMobileForApi,
  formatMobileForInput,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH
} from "@/lib/validation";

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Modals & Action States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);

  const [formState, setFormState] = useState({ id: "", name: "", email: "", password: "", role: "merchant", mobile: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [maxEvents, setMaxEvents] = useState("5");
  const [maxServices, setMaxServices] = useState("5");
  const [activatingMerchant, setActivatingMerchant] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUserDetail = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiListUsers(token);
      const found = (res.users || []).find((u) => u._id === id || u.id === id);
      if (found) {
        setUser(found);
      } else {
        setError("User not found.");
      }
    } catch (e) {
      setError(e?.message || "Failed to load user details");
      toast.error(e?.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetail();
  }, [id, token]);

  const handleCopyId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    setCopiedId(true);
    toast.success("User ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenEdit = () => {
    if (!user) return;
    setFormState({
      id: user._id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      mobile: formatMobileForInput(user.mobile)
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) return;

    const emailErr = validateEmail(formState.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    if (formState.mobile) {
      const mobErr = validateMobileNumber(formState.mobile, formState.role === "merchant");
      if (mobErr) {
        toast.error(mobErr);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const updateData = {
        name: formState.name,
        email: formState.email,
        role: formState.role,
        mobile: formatMobileForApi(formState.mobile)
      };

      if (formState.password && formState.password.trim() !== "") {
        const pwdErr = validateNewPasswordForm(formState.password);
        if (pwdErr) {
          toast.error(pwdErr);
          setIsSubmitting(false);
          return;
        }
        await apiResetPassword(user._id, formState.password, token);
      }

      await apiUpdateUser(user._id, updateData, token);
      toast.success("User updated successfully!");
      setIsEditDialogOpen(false);
      loadUserDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) return;
    const pwdErr = validateNewPasswordForm(resetPassword);
    if (pwdErr) {
      toast.error(pwdErr);
      return;
    }
    try {
      setIsResettingPassword(true);
      await apiResetPassword(user._id, resetPassword, token);
      toast.success(`Password reset successfully for ${user.name}`);
      setIsResetPasswordDialogOpen(false);
      setResetPassword("");
    } catch (err) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleActivateMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) return;
    const maxEv = Number(maxEvents);
    const maxSe = Number(maxServices);
    if (isNaN(maxEv) || maxEv < 1 || maxEv > 1000 || isNaN(maxSe) || maxSe < 1 || maxSe > 1000) {
      toast.error("Limits must be numbers between 1 and 1000.");
      return;
    }
    setActivatingMerchant(true);
    try {
      await apiActivateMerchant(user._id, { maxEvents: maxEv, maxServices: maxSe }, token);
      toast.success("Limits configured successfully!");
      setIsActivationDialogOpen(false);
      loadUserDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to update limits");
    } finally {
      setActivatingMerchant(false);
    }
  };

  const handleSendQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!token || !user) return;
    const amt = Number(quoteAmount);
    if (isNaN(amt) || amt < 1 || amt > 1000000) {
      toast.error("Quotation amount must be a number between 1 and 1,000,000.");
      return;
    }
    setSendingQuote(true);
    try {
      await apiSendMerchantQuotation(user._id, amt, token);
      toast.success("Onboarding quotation sent!");
      setIsQuoteDialogOpen(false);
      loadUserDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to send quotation");
    } finally {
      setSendingQuote(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!token || !user) return;
    const newStatus = user.status === "active" ? "deactivated" : "active";
    const action = newStatus === "deactivated" ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

    try {
      setIsTogglingStatus(true);
      await apiUpdateUser(user._id, { status: newStatus }, token);
      toast.success(`Account ${action}d successfully`);
      loadUserDetail();
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} account`);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!token || !user) return;
    try {
      setIsDeleting(true);
      await apiDeleteUser(user._id, token);
      toast.success("User deleted successfully");
      navigate("/admin-dashboard/users");
    } catch (err) {
      toast.error(err?.message || "Failed to delete user");
      setIsDeleting(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-4 font-sans">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/admin-dashboard/users")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Users & Merchants
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading user profile details...
          </div>
        ) : error || !user ? (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "User Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-3">The requested user profile does not exist or has been removed.</p>
            <Link to="/admin-dashboard/users" className="text-primary font-semibold text-xs hover:underline">
              Return to User Management
            </Link>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Main User Card with Profile Header */}
            <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-5">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-semibold text-lg text-foreground leading-tight truncate">{user.name}</h1>
                      <StatusBadge status={user.role} />
                      <StatusBadge status={user.status || "active"} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{user.email}</span>
                      {user.mobile && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span>{user.mobile}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Primary Actions Bar */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                  {/* Merchant-specific contextual actions */}
                  {user.role === "merchant" && user.merchantStatus !== "active" && user.merchantStatus !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuoteAmount(user.quotationAmount?.toString() || "");
                        setIsQuoteDialogOpen(true);
                      }}
                      className="h-9 px-3 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 rounded-md"
                      title="Send Onboarding Quotation"
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Quote
                    </Button>
                  )}

                  {user.role === "merchant" && user.merchantStatus === "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMaxEvents(user.maxEvents?.toString() || "5");
                        setMaxServices(user.maxServices?.toString() || "5");
                        setIsActivationDialogOpen(true);
                      }}
                      className="h-9 px-3 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/60 rounded-md"
                      title="Activate Merchant"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                    </Button>
                  )}

                  {user.role === "merchant" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMaxEvents(user.maxEvents?.toString() || "5");
                        setMaxServices(user.maxServices?.toString() || "5");
                        setIsActivationDialogOpen(true);
                      }}
                      className="h-9 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 rounded-md"
                      title="Configure Slot Limits"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Limits
                    </Button>
                  )}
                </div>
              </div>

              {/* Information Cards Side-by-Side Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account & Contact Info Card */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Account & Contact Info
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Account Name</span>
                      <span className="font-semibold text-foreground">{user.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Email Address</span>
                      <span className="font-semibold text-foreground truncate max-w-[180px]" title={user.email}>{user.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Mobile Number</span>
                      <span className="font-semibold text-foreground">{user.mobile || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Joined Date</span>
                      <span className="font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground font-medium">User ID</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11px] text-foreground/80">{user._id.slice(0, 8)}...{user._id.slice(-6)}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Copy User ID"
                        >
                          {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Onboarding & Status Card */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Onboarding & Account Status
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Onboarding Status</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        user.merchantStatus === "active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                        user.merchantStatus === "paid" ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                        user.merchantStatus === "quotation_sent" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        user.merchantStatus === "details_submitted" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {user.merchantStatus === "active" ? "Activated" :
                         user.merchantStatus === "paid" ? "Paid (Awaiting Activation)" :
                         user.merchantStatus === "quotation_sent" ? "Quotation Sent" :
                         user.merchantStatus === "details_submitted" ? "Review Pending" :
                         "Details Pending"}
                      </span>
                    </div>
                    {user.role === "merchant" && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Slot Limits</span>
                        <span className="font-semibold text-foreground">
                          {user.maxEvents || 5} Events / {user.maxServices || 5} Services
                        </span>
                      </div>
                    )}
                    {user.quotationAmount > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Quotation Fee</span>
                        <span className="font-semibold text-foreground">{formatCurrency(user.quotationAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground font-medium">Account Status</span>
                      <StatusBadge status={user.status || "active"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Business Profile (If Applicable) */}
              {user.role === "merchant" && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Business Profile & Overview
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Name</span>
                      <p className="font-semibold text-xs mt-0.5 text-foreground">{user.merchantDetails?.businessName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Experience</span>
                      <p className="font-semibold text-xs mt-0.5 text-foreground">
                        {user.merchantDetails?.experienceYears ? `${user.merchantDetails.experienceYears} years` : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Location</span>
                      <p className="font-semibold text-xs mt-0.5 text-foreground truncate">{user.merchantDetails?.address || "—"}</p>
                    </div>
                  </div>

                  {user.merchantDetails?.businessDescription && (
                    <div className="pt-1">
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Description</span>
                      <p className="mt-1 text-xs text-foreground/90 leading-relaxed bg-background p-3 rounded-md border border-border/50 whitespace-pre-line max-h-32 overflow-y-auto">
                        {user.merchantDetails.businessDescription}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Event Types Handled</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {user.merchantDetails?.eventTypes?.map((t) => (
                          <span key={t} className="text-[11px] bg-background text-foreground px-2.5 py-0.5 rounded-md border border-border/60 font-medium">
                            {t}
                          </span>
                        )) || <span className="text-xs text-muted-foreground italic">None specified</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Services Offered</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {user.merchantDetails?.serviceTypes?.map((t) => (
                          <span key={t} className="text-[11px] bg-background text-foreground px-2.5 py-0.5 rounded-md border border-border/60 font-medium">
                            {t}
                          </span>
                        )) || <span className="text-xs text-muted-foreground italic">None specified</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Actions Section */}
            {!isAdmin && (
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Account Actions
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEdit}
                    className="h-9 px-4 text-xs font-semibold border-border rounded-md"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit User
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResetPassword("");
                      setIsResetPasswordDialogOpen(true);
                    }}
                    className="h-9 px-4 text-xs font-semibold border-border rounded-md"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset Password
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isTogglingStatus}
                    onClick={handleToggleStatus}
                    className={`h-9 px-4 text-xs font-semibold rounded-md ${
                      user.status === "deactivated"
                        ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                        : "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                    }`}
                  >
                    {user.status === "deactivated" ? (
                      <><UserCheck className="h-3.5 w-3.5 mr-1.5" /> {isTogglingStatus ? "Activating..." : "Activate Account"}</>
                    ) : (
                      <><UserX className="h-3.5 w-3.5 mr-1.5" /> {isTogglingStatus ? "Deactivating..." : "Deactivate Account"}</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {!isAdmin && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-card p-5 sm:p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently remove this {user.role === "merchant" ? "merchant" : "user"} and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="h-9 px-4 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 dark:hover:bg-rose-950/60 rounded-md shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete User
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>Modify user privileges or information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Name</Label>
                <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })} className="h-9 text-xs rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number (Optional)</Label>
                <Input
                  type="text"
                  maxLength={12}
                  value={formState.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFormState({ ...formState, mobile: val });
                  }}
                  placeholder="Enter 12-digit mobile number"
                  className="h-9 text-xs rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })} className="h-9 text-xs rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Password (Optional)</Label>
                <Input type="password" maxLength={30} value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} placeholder="Leave empty to keep current password" className="h-9 text-xs rounded-md" />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-9 text-xs rounded-md">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4.5 w-4.5 text-primary" /> Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set a new password for {user?.name} ({user?.email})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Password</Label>
                <Input type="password" maxLength={30} required value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Enter new password" className="h-9 text-xs rounded-md" />
                <p className="text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)} className="h-9 text-xs rounded-md">Cancel</Button>
                <Button type="submit" disabled={isResettingPassword} className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-4.5 w-4.5" /> Delete Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-md border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1.5">
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role === "merchant" ? "Merchant" : "User"}</p>
                <p><strong>ID:</strong> <span className="font-mono text-[11px]">{user?._id}</span></p>
              </div>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to permanently delete this {user?.role === "merchant" ? "merchant" : "user"} account? All associated data will be removed.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting} className="h-9 text-xs rounded-md">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Limits Configuration Dialog */}
        <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Configure Merchant Limits
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set slot limits for maximum events and services allowed on the platform.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxEv" className="text-xs font-semibold">Maximum Events Limit</Label>
                  <Input
                    id="maxEv"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(e.target.value)}
                    className="h-9 text-xs rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxSe" className="text-xs font-semibold">Maximum Services Limit</Label>
                  <Input
                    id="maxSe"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxServices}
                    onChange={(e) => setMaxServices(e.target.value)}
                    className="h-9 text-xs rounded-md"
                  />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)} className="h-9 text-xs rounded-md">Cancel</Button>
                <Button type="submit" disabled={activatingMerchant} className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {activatingMerchant ? "Saving..." : "Save Limits"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Send Onboarding Quotation Dialog */}
        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4.5 w-4.5 text-primary" /> Send Onboarding Quotation
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set the setup fee amount for this merchant. The merchant will pay this amount before activation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-md text-xs space-y-1 border border-border/60">
                <p><strong>Merchant:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Business:</strong> {user?.merchantDetails?.businessName || "—"}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qAmount" className="text-xs font-semibold">Quotation Amount (in USD/Credits) *</Label>
                <Input
                  id="qAmount"
                  type="text"
                  required
                  placeholder="e.g. 250"
                  value={quoteAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setQuoteAmount(val.slice(0, 7));
                  }}
                  className="h-9 text-xs rounded-md"
                />
                <p className="text-[11px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsQuoteDialogOpen(false)} className="h-9 text-xs rounded-md">Cancel</Button>
                <Button type="submit" disabled={sendingQuote} className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {sendingQuote ? "Sending Quote..." : "Send Quote"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUserDetail;
