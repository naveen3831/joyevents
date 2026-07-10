import { motion } from "framer-motion";
import { Users, CheckCircle, AlertTriangle, Search, Filter, UserX, UserCheck, KeyRound, Ticket, Phone, FileText, CheckCircle2, RefreshCw, DollarSign } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { 
  apiCreateUser, apiListUsers, apiUpdateUser, apiDeleteUser, apiResetPassword,
  apiSendMerchantQuotation, apiActivateMerchant, apiGetTickets, apiSendTicketQuotation, apiApproveTicket
} from "@/lib/api";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  validateEmail,
  validateSignupForm,
  validateNewPasswordForm,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

type UserData = { 
  _id: string; 
  name: string; 
  email: string; 
  role: string; 
  createdAt: string; 
  status?: string; 
  mobile?: string;
  merchantStatus?: string;
  merchantDetails?: {
    businessName: string;
    businessDescription: string;
    experienceYears: number;
    address: string;
    eventTypes: string[];
    serviceTypes: string[];
  };
  quotationAmount?: number;
  maxEvents?: number;
  maxServices?: number;
};

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{ id: string; name: string; email: string } | null>(null);

  const [formState, setFormState] = useState({ id: "", name: "", email: "", password: "", role: "merchant", mobile: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // New States for Onboarding and Ticketing Flow
  const queryParams = new URLSearchParams(window.location.search);
  const initialTab = (queryParams.get("tab") as "users" | "tickets" | "billing") || "users";
  const [activeTab, setActiveTab] = useState<"users" | "tickets" | "billing">(initialTab);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Merchant details viewing
  const [selectedMerchantDetails, setSelectedMerchantDetails] = useState<UserData | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Onboarding Quotation dialog states
  const [selectedMerchantForQuote, setSelectedMerchantForQuote] = useState<UserData | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);

  // Onboarding Activation dialog states
  const [selectedMerchantForActivation, setSelectedMerchantForActivation] = useState<UserData | null>(null);
  const [maxEvents, setMaxEvents] = useState("5");
  const [maxServices, setMaxServices] = useState("5");
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [activatingMerchant, setActivatingMerchant] = useState(false);

  // Ticket Upgrade Quotation dialog states
  const [selectedTicketForQuote, setSelectedTicketForQuote] = useState<any | null>(null);
  const [ticketQuoteAmount, setTicketQuoteAmount] = useState("");
  const [isTicketQuoteDialogOpen, setIsTicketQuoteDialogOpen] = useState(false);
  const [sendingTicketQuote, setSendingTicketQuote] = useState(false);

  const loadUsers = async () => {
    if (!token) return;
    try {
      const res = await apiListUsers(token);
      setUsers(res.users || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
    }
  };

  const loadTickets = async () => {
    if (!token) return;
    setLoadingTickets(true);
    try {
      const res = await apiGetTickets(token);
      setTickets(res.tickets || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load upgrade tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadUsers();
    if (token) {
      loadTickets();
    }
  }, [token]);

  const handleOpenCreate = () => {
    setFormState({ id: "", name: "", email: "", password: "", role: "merchant", mobile: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setFormState({ id: user._id, name: user.name, email: user.email, password: "", role: user.role, mobile: user.mobile || "" });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const emailErr = validateEmail(formState.email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }

    if (formState.role === "merchant" && (!formState.mobile || formState.mobile.length !== 12)) {
      toast.error("Mobile number must be exactly 12 digits.");
      return;
    }

    if (formState.mobile && formState.mobile.length !== 12) {
      toast.error("Mobile number must be exactly 12 digits.");
      return;
    }

    if (!formState.id) {
      const signupErr = validateSignupForm(formState.email, formState.password, {
        name: formState.name,
      });
      if (signupErr) {
        toast.error(signupErr);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (formState.id) {
        // Update user - include password if provided
        const updateData: any = {
          name: formState.name,
          email: formState.email,
          role: formState.role,
          mobile: formState.mobile
        };

        // If password is provided, include it in the update
        if (formState.password && formState.password.trim() !== "") {
          const pwdErr = validateNewPasswordForm(formState.password);
          if (pwdErr) {
            toast.error(pwdErr);
            setIsSubmitting(false);
            return;
          }
          await apiResetPassword(formState.id, formState.password, token);
          toast.success("User updated successfully! Password has been reset.");
        } else {
          await apiUpdateUser(formState.id, updateData, token);
          toast.success("User updated successfully!");
        }

        setIsEditDialogOpen(false);
      } else {
        await apiCreateUser({ name: formState.name, email: formState.email, password: formState.password, role: formState.role, mobile: formState.mobile } as any, token);
        toast.success("User created successfully!");
        setIsDialogOpen(false);
      }
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions for Onboarding and limits
  const handleSendQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedMerchantForQuote) return;
    const amt = Number(quoteAmount);
    if (isNaN(amt) || amt < 1 || amt > 1000000) {
      toast.error("Quotation amount must be a number between 1 and 1,000,000.");
      return;
    }
    setSendingQuote(true);
    try {
      await apiSendMerchantQuotation(selectedMerchantForQuote._id, amt, token);
      toast.success("Onboarding quotation sent to merchant!");
      setIsQuoteDialogOpen(false);
      setSelectedMerchantForQuote(null);
      setQuoteAmount("");
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send quotation");
    } finally {
      setSendingQuote(false);
    }
  };

  const handleActivateMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedMerchantForActivation) return;
    const maxEv = Number(maxEvents);
    const maxSe = Number(maxServices);
    if (isNaN(maxEv) || maxEv < 1 || maxEv > 1000 || isNaN(maxSe) || maxSe < 1 || maxSe > 1000) {
      toast.error("Limits must be numbers between 1 and 1000.");
      return;
    }
    setActivatingMerchant(true);
    try {
      await apiActivateMerchant(selectedMerchantForActivation._id, {
        maxEvents: maxEv,
        maxServices: maxSe
      }, token);
      toast.success("Merchant activated and slot limits set successfully!");
      setIsActivationDialogOpen(false);
      setSelectedMerchantForActivation(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate merchant");
    } finally {
      setActivatingMerchant(false);
    }
  };

  const handleSendTicketQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTicketForQuote) return;
    const amt = Number(ticketQuoteAmount);
    if (isNaN(amt) || amt < 1 || amt > 1000000) {
      toast.error("Quotation amount must be a number between 1 and 1,000,000.");
      return;
    }
    setSendingTicketQuote(true);
    try {
      await apiSendTicketQuotation(selectedTicketForQuote._id, amt, token);
      toast.success("Limit upgrade quotation sent to merchant!");
      setIsTicketQuoteDialogOpen(false);
      setSelectedTicketForQuote(null);
      setTicketQuoteAmount("");
      loadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send ticket quotation");
    } finally {
      setSendingTicketQuote(false);
    }
  };

  const handleApproveTicketClick = async (ticketId: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to approve this ticket and upgrade slot limits?")) return;
    try {
      await apiApproveTicket(ticketId, token);
      toast.success("Ticket approved and slot limits upgraded successfully!");
      loadTickets();
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve ticket");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setIsDeleting(id);
      await apiDeleteUser(id, token);
      toast.success("User deleted successfully");
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === "active" ? "deactivated" : "active";
    const action = newStatus === "deactivated" ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setIsTogglingStatus(userId);
      await apiUpdateUser(userId, { status: newStatus } as any, token);
      toast.success(`User ${action}d successfully`);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} user`);
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleOpenResetPassword = (user: UserData) => {
    setSelectedUserForReset({ id: user._id, name: user.name, email: user.email });
    setResetPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUserForReset) return;

    const pwdErr = validateNewPasswordForm(resetPassword);
    if (pwdErr) {
      toast.error(pwdErr);
      return;
    }

    try {
      setIsResettingPassword(true);
      await apiResetPassword(selectedUserForReset.id, resetPassword, token);
      toast.success(`Password reset successfully for ${selectedUserForReset.name}`);
      setIsResetPasswordDialogOpen(false);
      setSelectedUserForReset(null);
      setResetPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
              User <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all platform users, merchants, onboarding, and limit request tickets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Users className="h-4 w-4 mr-2" /> Add Merchant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Merchant</DialogTitle>
                <DialogDescription>Add a new merchant to the platform.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input 
                    type="text" 
                    required 
                    maxLength={12}
                    value={formState.mobile} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setFormState({ ...formState, mobile: val });
                    }} 
                    placeholder="Enter 12-digit mobile number" 
                  />
                  <p className="text-xs text-muted-foreground">Exactly 12 numbers (digits only)</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">{EMAIL_HINT}</p>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" maxLength={30} required value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Account"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Modify user privileges or information.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                  <p className="text-xs text-muted-foreground">Exactly 12 numbers (digits only)</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">{EMAIL_HINT}</p>
                </div>
                <div className="space-y-2">
                  <Label>New Password (Optional)</Label>
                  <Input
                    type="password"
                    maxLength={30}
                    value={formState.password}
                    onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                    placeholder="Leave empty to keep current password"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formState.password ? PASSWORD_HINT : "Leave empty to keep current password"}
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Pending Tickets Alerts */}
        {(() => {
          const pendingTicketsCount = tickets.filter(t => t.status === "pending").length;
          const paidTicketsCount = tickets.filter(t => t.status === "paid").length;
          return (
            <>
              {pendingTicketsCount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mt-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 animate-pulse" />
                    <div>
                      <h4 className="font-semibold text-sm text-yellow-600 dark:text-yellow-400">Action Required: Pending Limit Upgrade Requests</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        There are {pendingTicketsCount} merchant slot upgrade requests waiting for setup quotations.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setActiveTab("tickets")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold whitespace-nowrap"
                  >
                    View Requests
                  </Button>
                </motion.div>
              )}

              {paidTicketsCount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 animate-bounce" />
                    <div>
                      <h4 className="font-semibold text-sm text-green-600 dark:text-green-400">Action Required: Paid Upgrade Tickets Ready for Approval</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        There are {paidTicketsCount} slot upgrade requests that have been paid and are awaiting your approval.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setActiveTab("tickets")}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold whitespace-nowrap"
                  >
                    Review & Approve
                  </Button>
                </motion.div>
              )}
            </>
          );
        })()}

        {/* Tab Headers */}
        <div className="flex gap-4 border-b border-border mt-6 pb-2">
          <button 
            onClick={() => setActiveTab("users")}
            className={`font-semibold text-sm pb-2 border-b-2 transition-all ${
              activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Users & Onboarding
          </button>
          <button 
            onClick={() => {
              setActiveTab("tickets");
              loadTickets();
            }}
            className={`font-semibold text-sm pb-2 border-b-2 transition-all ${
              activeTab === "tickets" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Slots Upgrade Tickets
          </button>
          <button 
            onClick={() => {
              setActiveTab("billing");
              loadUsers();
              loadTickets();
            }}
            className={`font-semibold text-sm pb-2 border-b-2 transition-all ${
              activeTab === "billing" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Billing & Payments History
          </button>
        </div>

        {activeTab === "users" ? (
          <>
            {/* Filters */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search users..." maxLength={30} className="pl-10 bg-card border-border" />
              </div>
              <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
            </motion.div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Mobile</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Onboarding status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 align-middle font-medium">{u.name}</td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">{u.mobile || "—"}</td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-primary/20 text-primary' :
                          u.role === 'merchant' ? 'bg-blue-500/20 text-blue-500' :
                            'bg-secondary text-foreground'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 align-middle hidden md:table-cell">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${u.status === "deactivated" ? "text-orange-500" : "text-green-500"
                          }`}>
                          {u.status === "deactivated" ? (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" /> Deactivated
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </>
                          )}
                        </span>
                      </td>
                      {/* Onboarding status Column */}
                      <td className="px-4 py-3 align-middle">
                        {u.role === "merchant" ? (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              u.merchantStatus === "active" ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : u.merchantStatus === "paid" ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              : u.merchantStatus === "quotation_sent" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                              : u.merchantStatus === "details_submitted" ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : "bg-secondary text-muted-foreground border-border"
                            }`}>
                              {u.merchantStatus === "active" ? "Activated"
                              : u.merchantStatus === "paid" ? "Paid (Awaiting Activation)"
                              : u.merchantStatus === "quotation_sent" ? "Quotation Sent"
                              : u.merchantStatus === "details_submitted" ? "Review Pending"
                              : "Details Pending"}
                            </span>
                            {u.merchantStatus === "quotation_sent" && (
                              <span className="text-[10px] text-muted-foreground font-semibold">Quote: {formatCurrency(u.quotationAmount || 0)}</span>
                            )}
                            {u.merchantStatus === "active" && (
                              <span className="text-[10px] text-muted-foreground">Limits: {u.maxEvents || 5}E / {u.maxServices || 5}S</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap max-w-sm ml-auto">
                          {/* Onboarding actions */}
                          {u.role === "merchant" && (
                            <>
                              {u.merchantDetails?.businessName && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
                                  onClick={() => {
                                    setSelectedMerchantDetails(u);
                                    setIsDetailsModalOpen(true);
                                  }}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1" /> Details
                                </Button>
                              )}
                              {u.merchantStatus !== "active" && u.merchantStatus !== "paid" && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10"
                                  onClick={() => {
                                    setSelectedMerchantForQuote(u);
                                    setQuoteAmount(u.quotationAmount?.toString() || "");
                                    setIsQuoteDialogOpen(true);
                                  }}
                                >
                                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Quote
                                </Button>
                              )}
                            </>
                          )}
                          {u.role === "merchant" && u.merchantStatus === "paid" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                              onClick={() => {
                                setSelectedMerchantForActivation(u);
                                setMaxEvents(u.maxEvents?.toString() || "5");
                                setMaxServices(u.maxServices?.toString() || "5");
                                setIsActivationDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                            </Button>
                          )}
                          {u.role === "merchant" && u.merchantStatus === "active" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                              onClick={() => {
                                setSelectedMerchantForActivation(u);
                                setMaxEvents(u.maxEvents?.toString() || "5");
                                setMaxServices(u.maxServices?.toString() || "5");
                                setIsActivationDialogOpen(true);
                              }}
                              title="Modify account listing limits"
                            >
                              Limits
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenResetPassword(u)}
                            title="Reset Password"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(u._id, u.status || "active")}
                            disabled={isTogglingStatus === u._id}
                            className={u.status === "deactivated" ? "text-green-600 hover:text-green-700" : "text-orange-600 hover:text-orange-700"}
                          >
                            {isTogglingStatus === u._id ? (
                              "..."
                            ) : u.status === "deactivated" ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
                              </>
                            ) : (
                              <>
                                <UserX className="h-3.5 w-3.5 mr-1" /> Deactivate
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>Edit</Button>
                          <Button variant="destructive" size="sm" disabled={isDeleting === u._id} onClick={() => handleDelete(u._id)}>
                            {isDeleting === u._id ? "..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          </>
        ) : activeTab === "tickets" ? (
          <>
            {/* Tickets Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Merchant</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Requested slots</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Explanation Message</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Requested Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ticket status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Quotation Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 align-middle font-medium">
                        <div className="flex flex-col">
                          <span>{t.merchant?.name}</span>
                          <span className="text-xs text-muted-foreground">{t.merchant?.email}</span>
                          {t.merchant?.mobile && <span className="text-[10px] text-muted-foreground">📞 {t.merchant?.mobile}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col text-xs font-semibold">
                          <span>+{t.requestedEvents} Event slots</span>
                          <span>+{t.requestedServices} Service slots</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground italic text-xs max-w-xs truncate" title={t.message}>
                        {t.message ? `"${t.message}"` : "—"}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          t.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : t.status === "paid" ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : t.status === "quotation_sent" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                        }`}>
                          {t.status === "approved" ? "Approved & Upgraded" 
                          : t.status === "paid" ? "Paid (Awaiting Approval)"
                          : t.status === "quotation_sent" ? "Quotation Sent"
                          : "Pending Review"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle font-semibold text-primary">
                        {t.quotationAmount > 0 ? formatCurrency(t.quotationAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "pending" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10"
                              onClick={() => {
                                setSelectedTicketForQuote(t);
                                setTicketQuoteAmount("");
                                setIsTicketQuoteDialogOpen(true);
                              }}
                            >
                                <DollarSign className="h-3.5 w-3.5 mr-1" /> Send Quote
                            </Button>
                          )}
                          {t.status === "paid" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-green-600 border-green-500/30 hover:bg-green-500/10 font-bold"
                              onClick={() => handleApproveTicketClick(t._id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Upgrade
                            </Button>
                          )}
                          {t.status === "quotation_sent" && (
                            <span className="text-xs text-muted-foreground">Awaiting merchant payment</span>
                          )}
                          {t.status === "approved" && (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                              <CheckCircle2 className="h-3 w-3" /> Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {loadingTickets ? "Loading tickets..." : "No upgrade request tickets found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          </>
        ) : (
          <>
            {/* Billing & Payments History Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Merchant</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Payment Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Amount Received</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const billingHistory: any[] = [];
                    // 1. Setup payments
                    users.forEach(u => {
                      if (u.role === "merchant" && (u.merchantStatus === "active" || u.merchantStatus === "paid")) {
                        billingHistory.push({
                          id: `setup-${u._id}`,
                          merchantName: u.name,
                          merchantEmail: u.email,
                          merchantMobile: u.mobile,
                          description: "Onboarding Account Setup Fee",
                          amount: u.quotationAmount || 0,
                          date: u.updatedAt || u.createdAt,
                          status: u.merchantStatus === "active" ? "Activated" : "Paid (Awaiting Activation)",
                          statusColor: u.merchantStatus === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        });
                      }
                    });
                    // 2. Ticket payments
                    tickets.forEach(t => {
                      if (t.status === "paid" || t.status === "approved") {
                        billingHistory.push({
                          id: t._id,
                          merchantName: t.merchant?.name || "Merchant",
                          merchantEmail: t.merchant?.email || "",
                          merchantMobile: t.merchant?.mobile || "",
                          description: `Limit Upgrade (+${t.requestedEvents} Events, +${t.requestedServices} Services)`,
                          amount: t.quotationAmount || 0,
                          date: t.updatedAt || t.createdAt,
                          status: t.status === "approved" ? "Approved & Upgraded" : "Paid (Awaiting Approval)",
                          statusColor: t.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        });
                      }
                    });

                    // Sort descending
                    billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (billingHistory.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payment history found</td>
                        </tr>
                      );
                    }

                    return billingHistory.map(row => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 align-middle font-medium">
                          <div className="flex flex-col">
                            <span>{row.merchantName}</span>
                            <span className="text-xs text-muted-foreground">{row.merchantEmail}</span>
                            {row.merchantMobile && <span className="text-[10px] text-muted-foreground">📞 {row.merchantMobile}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">{row.description}</td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {new Date(row.date).toLocaleDateString()} {new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 align-middle font-bold text-primary">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3 align-middle text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </motion.div>
          </>
        )}

        {/* Password Reset Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                {selectedUserForReset && (
                  <>
                    Reset password for <strong>{selectedUserForReset.name}</strong> ({selectedUserForReset.email})
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  maxLength={30}
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                  disabled={isResettingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isResettingPassword}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Details Review Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Merchant Onboarding Details
              </DialogTitle>
              <DialogDescription>
                Review submitted business qualifications and capabilities.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantDetails && (
              <div className="space-y-4 py-2 text-sm max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Business Name</span>
                    <p className="font-semibold text-base mt-0.5">{selectedMerchantDetails.merchantDetails?.businessName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Experience</span>
                    <p className="font-semibold text-base mt-0.5">{selectedMerchantDetails.merchantDetails?.experienceYears} years</p>
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Business Location / Address</span>
                  <p className="mt-0.5">{selectedMerchantDetails.merchantDetails?.address}</p>
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Business Description</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-line leading-relaxed">
                    {selectedMerchantDetails.merchantDetails?.businessDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Event Types Handled</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.eventTypes?.map((t) => (
                        <span key={t} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">{t}</span>
                      )) || <span className="text-xs text-muted-foreground">None selected</span>}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Services Offered</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.serviceTypes?.map((t) => (
                        <span key={t} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">{t}</span>
                      )) || <span className="text-xs text-muted-foreground">None selected</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => setIsDetailsModalOpen(false)}>Close Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Send Quotation Dialog */}
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
            {selectedMerchantForQuote && (
              <form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForQuote.name}</p>
                  <p><strong>Email:</strong> {selectedMerchantForQuote.email}</p>
                  <p><strong>Business:</strong> {selectedMerchantForQuote.merchantDetails?.businessName}</p>
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
                      setQuoteAmount(val.slice(0, 7)); // max length 7 digits
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
            )}
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Activation / Limits Dialog */}
        <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {selectedMerchantForActivation?.merchantStatus === "active" ? "Configure Merchant Limits" : "Activate Merchant & Configure Limits"}
              </DialogTitle>
              <DialogDescription>
                Set the maximum number of events and services this merchant is allowed to create on the platform.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantForActivation && (
              <form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForActivation.name}</p>
                  <p><strong>Business:</strong> {selectedMerchantForActivation.merchantDetails?.businessName}</p>
                  <p><strong>Quotation Paid:</strong> {formatCurrency(selectedMerchantForActivation.quotationAmount || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxEv">Maximum Events Limit</Label>
                    <Input
                      id="maxEv"
                      type="text"
                      required
                      value={maxEvents}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setMaxEvents(val.slice(0, 4)); // max length 4 digits
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSe">Maximum Services Limit</Label>
                    <Input
                      id="maxSe"
                      type="text"
                      required
                      value={maxServices}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setMaxServices(val.slice(0, 4)); // max length 4 digits
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={activatingMerchant} className="bg-gradient-primary text-white font-semibold">
                    {activatingMerchant ? "Activating..." : selectedMerchantForActivation.merchantStatus === "active" ? "Update Limits" : "Activate Merchant"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Ticket Send Quotation Dialog */}
        <Dialog open={isTicketQuoteDialogOpen} onOpenChange={setIsTicketQuoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-500" /> Send Limit Upgrade Quotation
              </DialogTitle>
              <DialogDescription>
                Set the quotation fee for this limit upgrade request.
              </DialogDescription>
            </DialogHeader>
            {selectedTicketForQuote && (
              <form onSubmit={handleSendTicketQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedTicketForQuote.merchant?.name}</p>
                  <p><strong>Requested slots increase:</strong> +{selectedTicketForQuote.requestedEvents} Events, +{selectedTicketForQuote.requestedServices} Services</p>
                  {selectedTicketForQuote.message && <p><strong>Message:</strong> "{selectedTicketForQuote.message}"</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tqAmount">Quotation Amount (in USD/Credits) *</Label>
                  <Input
                    id="tqAmount"
                    type="text"
                    required
                    placeholder="e.g. 100"
                    value={ticketQuoteAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setTicketQuoteAmount(val.slice(0, 7)); // max length 7 digits
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTicketQuoteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingTicketQuote} className="bg-gradient-primary text-white">
                    {sendingTicketQuote ? "Sending Quote..." : "Send Quote"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

      </section>
    </AdminLayout>
  );
};

export default AdminUsers;

