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
  AlertTriangle,
  KeyRound,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Shield,
  Building,
  Sparkles
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
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  validateEmail,
  validateSignupForm,
  validateNewPasswordForm,
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

  // Modals & Action States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
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

  const handleOpenEdit = () => {
    if (!user) return;
    setFormState({
      id: user._id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      mobile: user.mobile || ""
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
    if (formState.mobile && formState.mobile.length !== 12) {
      toast.error("Mobile number must be exactly 12 digits.");
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData = {
        name: formState.name,
        email: formState.email,
        role: formState.role,
        mobile: formState.mobile
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
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setIsTogglingStatus(true);
      await apiUpdateUser(user._id, { status: newStatus }, token);
      toast.success(`User ${action}d successfully`);
      loadUserDetail();
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} user`);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !user) return;
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

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

  return (
    <AdminLayout>
      <section className="py-4 sm:py-6 lg:py-8 max-w-4xl mx-auto space-y-6">
        {/* Navigation / Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Users
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading user profile details...
          </div>
        ) : error || !user ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-lg font-bold text-foreground mb-1">{error || "User Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">The requested user profile does not exist or has been removed.</p>
            <Link to="/admin-dashboard/users" className="text-primary font-semibold text-sm hover:underline">
              Return to User Management
            </Link>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* User Profile Header Banner */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-2xl font-bold text-white shadow-glow shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{user.name}</h1>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-primary/20 text-primary' :
                        user.role === 'merchant' ? 'bg-tint-blue text-tint-blue-fg' :
                        'bg-secondary text-foreground'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        user.status === "deactivated" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
                      }`}>
                        {user.status === "deactivated" ? "Deactivated" : "Active"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {user.email}
                    </p>
                  </div>
                </div>

                {/* Top Quick Actions Bar */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {user.role === "merchant" && user.merchantStatus !== "active" && user.merchantStatus !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuoteAmount(user.quotationAmount?.toString() || "");
                        setIsQuoteDialogOpen(true);
                      }}
                      className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-500/30"
                      title="Send Onboarding Quotation"
                    >
                      <DollarSign className="h-4 w-4 mr-1.5" /> Quote
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
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-500/30"
                      title="Activate Merchant"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Activate
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResetPassword("");
                      setIsResetPasswordDialogOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-500/30"
                    title="Reset Password"
                  >
                    <KeyRound className="h-4 w-4 mr-1.5" /> Reset Password
                  </Button>

                  {user.role === "merchant" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMaxEvents(user.maxEvents?.toString() || "5");
                        setMaxServices(user.maxServices?.toString() || "5");
                        setIsActivationDialogOpen(true);
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-500/30"
                      title="Set Slot Limits"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Limits
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>

                  {user.role !== "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTogglingStatus}
                      onClick={handleToggleStatus}
                      className={user.status === "deactivated" ? "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-500/30" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-500/30"}
                    >
                      {isTogglingStatus ? "..." : user.status === "deactivated" ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Activate
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                        </>
                      )}
                    </Button>
                  )}

                  {user.role !== "admin" && (
                    <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Contact Info Card */}
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> Account & Contact Info
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Account Name:</span>
                      <span className="font-semibold text-foreground">{user.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Email:</span>
                      <span className="font-semibold text-foreground">{user.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Mobile:</span>
                      <span className="font-semibold text-foreground">{user.mobile || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Joined Date:</span>
                      <span className="font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-medium">User ID:</span>
                      <span className="font-mono text-[11px] text-foreground/80">{user._id}</span>
                    </div>
                  </div>
                </div>

                {/* Onboarding & Limits Card */}
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Onboarding & Account Status
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Onboarding Status:</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        user.merchantStatus === "active" ? "bg-tint-mint text-tint-mint-fg" :
                        user.merchantStatus === "paid" ? "bg-tint-violet text-tint-violet-fg" :
                        user.merchantStatus === "quotation_sent" ? "bg-tint-orange text-tint-orange-fg" :
                        user.merchantStatus === "details_submitted" ? "bg-tint-orange text-tint-orange-fg" :
                        "bg-secondary text-muted-foreground"
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
                        <span className="text-muted-foreground font-medium">Slot Limits:</span>
                        <span className="font-bold text-foreground">
                          {user.maxEvents || 5} Events / {user.maxServices || 5} Services
                        </span>
                      </div>
                    )}
                    {user.quotationAmount > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">Quotation Fee:</span>
                        <span className="font-bold text-primary">{formatCurrency(user.quotationAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground font-medium">Account Status:</span>
                      <span className={`font-semibold ${user.status === "deactivated" ? "text-red-500" : "text-green-600"}`}>
                        {user.status === "deactivated" ? "Deactivated" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Business Profile (If Applicable) */}
              {user.role === "merchant" && (
                <div className="p-5 bg-secondary/20 rounded-xl border border-border/60 space-y-4 mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Business Profile & Overview
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Name</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">{user.merchantDetails?.businessName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Experience</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">
                        {user.merchantDetails?.experienceYears ? `${user.merchantDetails.experienceYears} years` : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Location</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">{user.merchantDetails?.address || "—"}</p>
                    </div>
                  </div>

                  {user.merchantDetails?.businessDescription && (
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Business Description</span>
                      <p className="mt-1 text-xs text-foreground/90 leading-relaxed bg-background/50 p-3 rounded-lg border border-border/40 whitespace-pre-line">
                        {user.merchantDetails.businessDescription}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Event Types Handled</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {user.merchantDetails?.eventTypes?.map((t) => (
                          <span key={t} className="text-xs bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border font-medium">
                            {t}
                          </span>
                        )) || <span className="text-xs text-muted-foreground italic">None specified</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium uppercase text-[10px]">Services Offered</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {user.merchantDetails?.serviceTypes?.map((t) => (
                          <span key={t} className="text-xs bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border font-medium">
                            {t}
                          </span>
                        )) || <span className="text-xs text-muted-foreground italic">None specified</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>Modify user privileges or information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number (Optional)</Label>
                <Input
                  type="text"
                  maxLength={12}
                  value={formState.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFormState({ ...formState, mobile: val });
                  }}
                  placeholder="Enter 12-digit mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>New Password (Optional)</Label>
                <Input type="password" maxLength={30} value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} placeholder="Leave empty to keep current password" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" /> Reset Password
              </DialogTitle>
              <DialogDescription>
                Set a new password for {user?.name} ({user?.email})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" maxLength={30} required value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isResettingPassword} className="bg-gradient-primary text-white">
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Limits Configuration Dialog */}
        <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Configure Merchant Limits
              </DialogTitle>
              <DialogDescription>
                Set slot limits for maximum events and services allowed on the platform.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxEv">Maximum Events Limit</Label>
                  <Input
                    id="maxEv"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSe">Maximum Services Limit</Label>
                  <Input
                    id="maxSe"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxServices}
                    onChange={(e) => setMaxServices(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={activatingMerchant} className="bg-gradient-primary text-white">
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
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Send Onboarding Quotation
              </DialogTitle>
              <DialogDescription>
                Set the setup fee amount for this merchant. The merchant will pay this amount before activation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
              <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                <p><strong>Merchant:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Business:</strong> {user?.merchantDetails?.businessName || "—"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qAmount">Quotation Amount (in USD/Credits) *</Label>
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
                />
                <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={sendingQuote} className="bg-gradient-primary text-white">
                  {sendingQuote ? "Sending Quote..." : "Send Quote"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </AdminLayout>
  );
};

export default AdminUserDetail;
