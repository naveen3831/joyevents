import { motion } from "framer-motion";
import { Users, CheckCircle, AlertTriangle, Search, Filter, UserX, UserCheck, KeyRound, FileText, CheckCircle2, DollarSign, Sparkles, XCircle, Eye } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useGsapReveal } from "@/lib/gsapAnimations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiCreateUser, apiListUsers, apiUpdateUser, apiDeleteUser, apiResetPassword, apiSendMerchantQuotation, apiActivateMerchant, apiGetTickets, apiSendTicketQuotation, apiApproveTicket, apiGetAdminCustomServiceRequests, apiSendCustomServiceQuote, apiRejectCustomServiceRequest } from "@/lib/api";
import { sanitizeEmailInput, sanitizeNameInput, validateEmail, validateSignupForm, validateNewPasswordForm, EMAIL_HINT, PASSWORD_HINT, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

const UsersTableBody = ({ list, emptyMessage, setSelectedMerchantDetails, setIsDetailsModalOpen, setSelectedMerchantForQuote, setQuoteAmount, setIsQuoteDialogOpen, setSelectedMerchantForActivation, setMaxEvents, setMaxServices, setIsActivationDialogOpen, handleOpenResetPassword, handleToggleStatus, isTogglingStatus, handleOpenEdit, handleDelete, isDeleting }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="bg-secondary">
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Name</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Email</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Mobile</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Role</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Joined</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Status</th>
        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Onboarding status</th>
        <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">Actions</th>
      </tr>
    </thead>
    <tbody>
      {list.map((u) => (
        <tr key={u._id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
          <td className="px-2 py-2.5 align-middle font-medium text-xs">{u.name}</td>
          <td className="px-2 py-2.5 align-middle text-muted-foreground text-xs">{u.email}</td>
          <td className="px-2 py-2.5 align-middle text-muted-foreground text-xs">{u.mobile || "—"}</td>
          <td className="px-2 py-2.5 align-middle">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              u.role === 'admin' ? 'bg-primary/20 text-primary' :
              u.role === 'merchant' ? 'bg-tint-blue text-tint-blue-fg' :
              'bg-secondary text-foreground'
            }`}>
              {u.role}
            </span>
          </td>
          <td className="px-2 py-2.5 align-middle text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
          <td className="px-2 py-2.5 align-middle hidden md:table-cell">
            <span className={`flex items-center gap-1.5 text-xs font-medium ${u.status === "deactivated" ? "text-tint-orange-fg" : "text-tint-mint-fg"}`}>
              {u.status === "deactivated" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5"/> Deactivated
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5"/> Active
                </>
              )}
            </span>
          </td>
          <td className="px-2 py-2.5 align-middle">
            {u.role === "merchant" ? (
              <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  u.merchantStatus === "active" ? "bg-tint-mint text-tint-mint-fg" :
                  u.merchantStatus === "paid" ? "bg-tint-violet text-tint-violet-fg" :
                  u.merchantStatus === "quotation_sent" ? "bg-tint-orange text-tint-orange-fg" :
                  u.merchantStatus === "details_submitted" ? "bg-tint-orange text-tint-orange-fg" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {u.merchantStatus === "active" ? "Activated" :
                   u.merchantStatus === "paid" ? "Paid (Awaiting Activation)" :
                   u.merchantStatus === "quotation_sent" ? "Quotation Sent" :
                   u.merchantStatus === "details_submitted" ? "Review Pending" :
                   "Details Pending"}
                </span>
                {u.merchantStatus === "quotation_sent" && (<span className="text-[10px] text-muted-foreground font-semibold">Quote: {formatCurrency(u.quotationAmount || 0)}</span>)}
                {u.merchantStatus === "active" && (<span className="text-[10px] text-muted-foreground">Limits: {u.maxEvents || 5}E / {u.maxServices || 5}S</span>)}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </td>
          <td className="px-2 py-2.5 align-middle text-right">
            <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
              {u.role === "merchant" && (
                <>
                  {u.merchantDetails?.businessName && (
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10" onClick={() => {
                      setSelectedMerchantDetails(u);
                      setIsDetailsModalOpen(true);
                    }}>
                      <FileText className="h-3.5 w-3.5 mr-1"/> Details
                    </Button>
                  )}
                  {u.merchantStatus !== "active" && u.merchantStatus !== "paid" && (
                    <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10" onClick={() => {
                      setSelectedMerchantForQuote(u);
                      setQuoteAmount(u.quotationAmount?.toString() || "");
                      setIsQuoteDialogOpen(true);
                    }}>
                      <DollarSign className="h-3.5 w-3.5 mr-1"/> Quote
                    </Button>
                  )}
                </>
              )}
              {u.role === "merchant" && u.merchantStatus === "paid" && (
                <Button variant="outline" size="sm" className="text-purple-600 border-purple-500/30 hover:bg-purple-500/10" onClick={() => {
                  setSelectedMerchantForActivation(u);
                  setMaxEvents(u.maxEvents?.toString() || "5");
                  setMaxServices(u.maxServices?.toString() || "5");
                  setIsActivationDialogOpen(true);
                }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1"/> Activate
                </Button>
              )}
              {u.role === "merchant" && u.merchantStatus === "active" && (
                <Button variant="outline" size="sm" className="text-green-600 border-green-500/30 hover:bg-green-500/10" onClick={() => {
                  setSelectedMerchantForActivation(u);
                  setMaxEvents(u.maxEvents?.toString() || "5");
                  setMaxServices(u.maxServices?.toString() || "5");
                  setIsActivationDialogOpen(true);
                }} title="Modify account listing limits">
                  Limits
                </Button>
              )}

              {u.role === "admin" ? (
                <span className="text-[11px] font-semibold text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">
                  Protected Admin
                </span>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleOpenResetPassword(u)} title="Reset Password" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <KeyRound className="h-4 w-4"/>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleStatus(u._id, u.status || "active")} disabled={isTogglingStatus === u._id} className={u.status === "deactivated" ? "text-green-600 hover:text-green-700" : "text-orange-600 hover:text-orange-700"}>
                    {isTogglingStatus === u._id ? ("...") : u.status === "deactivated" ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1"/> Activate
                      </>
                    ) : (
                      <>
                        <UserX className="h-3.5 w-3.5 mr-1"/> Deactivate
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>Edit</Button>
                  <Button variant="destructive" size="sm" disabled={isDeleting === u._id} onClick={() => handleDelete(u._id)}>
                    {isDeleting === u._id ? "..." : "Delete"}
                  </Button>
                </>
              )}
            </div>
          </td>
        </tr>
      ))}
      {list.length === 0 && (
        <tr>
          <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
            {emptyMessage}
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

const AdminUsers = () => {
    const { token } = useAuth();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(null);
    const [selectedUserForReset, setSelectedUserForReset] = useState(null);
    const [formState, setFormState] = useState({ id: "", name: "", email: "", password: "", role: "merchant", mobile: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resetPassword, setResetPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get("tab") || "users";
    const [activeTab, setActiveTab] = useState(initialTab);
    const roleFilter = queryParams.get("role"); 

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search]);
    const [searchQuery, setSearchQuery] = useState("");
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [selectedMerchantDetails, setSelectedMerchantDetails] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedMerchantForQuote, setSelectedMerchantForQuote] = useState(null);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [sendingQuote, setSendingQuote] = useState(false);
    const [selectedMerchantForActivation, setSelectedMerchantForActivation] = useState(null);
    const [maxEvents, setMaxEvents] = useState("5");
    const [maxServices, setMaxServices] = useState("5");
    const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
    const [activatingMerchant, setActivatingMerchant] = useState(false);
    const [selectedTicketForQuote, setSelectedTicketForQuote] = useState(null);
    const [ticketQuoteAmount, setTicketQuoteAmount] = useState("");
    const [isTicketQuoteDialogOpen, setIsTicketQuoteDialogOpen] = useState(false);
    const [sendingTicketQuote, setSendingTicketQuote] = useState(false);

    // Custom Service Enquiry States
    const [customRequests, setCustomRequests] = useState([]);
    const [loadingCustomRequests, setLoadingCustomRequests] = useState(false);
    const [selectedCustomForQuote, setSelectedCustomForQuote] = useState(null);
    const [customQuoteAmount, setCustomQuoteAmount] = useState("");
    const [customQuoteNote, setCustomQuoteNote] = useState("");
    const [isCustomQuoteOpen, setIsCustomQuoteOpen] = useState(false);
    const [sendingCustomQuote, setSendingCustomQuote] = useState(false);

    const [selectedCustomForReject, setSelectedCustomForReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectingCustom, setRejectingCustom] = useState(false);

    const [selectedCustomForDetails, setSelectedCustomForDetails] = useState(null);
    const [isCustomDetailsOpen, setIsCustomDetailsOpen] = useState(false);

    const filteredUsers = users.filter((u) => {
        const matchesSearch = searchQuery === "" ||
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.mobile && u.mobile.includes(searchQuery));
        if (activeTab === "registrations") {
            return matchesSearch && u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid");
        }
        if (roleFilter === "merchant")
            return matchesSearch && u.role === "merchant";
        if (roleFilter === "customer")
            return matchesSearch && u.role !== "merchant" && u.role !== "admin";
        return matchesSearch && u.role !== "admin";
    });

    const loadUsers = async () => {
        if (!token)
            return;
        try {
            const res = await apiListUsers(token);
            setUsers(res.users || []);
        }
        catch (e) {
            toast.error(e?.message || "Failed to load users");
        }
    };

    const loadTickets = async () => {
        if (!token)
            return;
        setLoadingTickets(true);
        try {
            const res = await apiGetTickets(token);
            setTickets(res.tickets || []);
        }
        catch (e) {
            toast.error(e?.message || "Failed to load upgrade tickets");
        }
        finally {
            setLoadingTickets(false);
        }
    };

    const loadCustomRequests = async () => {
        if (!token)
            return;
        setLoadingCustomRequests(true);
        try {
            const res = await apiGetAdminCustomServiceRequests(token);
            setCustomRequests(res.requests || []);
        }
        catch (e) {
            toast.error(e?.message || "Failed to load custom service enquiries");
        }
        finally {
            setLoadingCustomRequests(false);
        }
    };

    useEffect(() => {
        loadUsers();
        if (token) {
            loadTickets();
            loadCustomRequests();
        }
    }, [token]);

    useRealtimeRefresh(["auth", "merchant", "notifications", "custom-service-requests"], () => {
        loadUsers();
        loadTickets();
        loadCustomRequests();
    });

    useEffect(() => {
        if (activeTab === "tickets" && queryParams.get("action") === "approve" && tickets.length > 0) {
            const firstPaid = tickets.find(t => t.status === "paid");
            if (firstPaid) {
                const newUrl = window.location.pathname + `?tab=tickets`;
                window.history.replaceState({ path: newUrl }, "", newUrl);
                handleApproveTicketClick(firstPaid._id);
            }
        }
    }, [tickets, activeTab]);

    const handleOpenCreate = () => {
        setFormState({ id: "", name: "", email: "", password: "", role: "merchant", mobile: "" });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user) => {
        setFormState({ id: user._id, name: user.name, email: user.email, password: "", role: user.role, mobile: user.mobile || "" });
        setIsEditDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token)
            return;
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
                    await apiResetPassword(formState.id, formState.password, token);
                    toast.success("User updated successfully! Password has been reset.");
                }
                else {
                    await apiUpdateUser(formState.id, updateData, token);
                    toast.success("User updated successfully!");
                }
                setIsEditDialogOpen(false);
            }
            else {
                await apiCreateUser({ name: formState.name, email: formState.email, password: formState.password, role: formState.role, mobile: formState.mobile }, token);
                toast.success("User created successfully!");
                setIsDialogOpen(false);
            }
            loadUsers();
        }
        catch (err) {
            toast.error(err?.message || "Operation failed");
        }
        finally {
            setIsSubmitting(false);
        }
    };

    const handleSendQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedMerchantForQuote)
            return;
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
        }
        catch (err) {
            toast.error(err?.message || "Failed to send quotation");
        }
        finally {
            setSendingQuote(false);
        }
    };

    const handleActivateMerchantSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedMerchantForActivation)
            return;
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
        }
        catch (err) {
            toast.error(err?.message || "Failed to activate merchant");
        }
        finally {
            setActivatingMerchant(false);
        }
    };

    const handleSendTicketQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedTicketForQuote)
            return;
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
        }
        catch (err) {
            toast.error(err?.message || "Failed to send ticket quotation");
        }
        finally {
            setSendingTicketQuote(false);
        }
    };

    // Custom Service Quotation Submit Handler
    const handleSendCustomQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedCustomForQuote)
            return;
        const amt = Number(customQuoteAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error("Quotation amount must be a positive number.");
            return;
        }
        setSendingCustomQuote(true);
        try {
            await apiSendCustomServiceQuote(selectedCustomForQuote._id, { quotationAmount: amt, quotationNote: customQuoteNote }, token);
            toast.success("Quotation sent successfully to customer!");
            setIsCustomQuoteOpen(false);
            setSelectedCustomForQuote(null);
            setCustomQuoteAmount("");
            setCustomQuoteNote("");
            loadCustomRequests();
        }
        catch (err) {
            toast.error(err?.message || "Failed to send custom quotation");
        }
        finally {
            setSendingCustomQuote(false);
        }
    };

    // Custom Service Rejection Submit Handler
    const handleRejectCustomSubmit = async (e) => {
        e.preventDefault();
        if (!token || !selectedCustomForReject)
            return;
        setRejectingCustom(true);
        try {
            await apiRejectCustomServiceRequest(selectedCustomForReject._id, { rejectionReason }, token);
            toast.success("Custom service enquiry declined.");
            setIsRejectOpen(false);
            setSelectedCustomForReject(null);
            setRejectionReason("");
            loadCustomRequests();
        }
        catch (err) {
            toast.error(err?.message || "Failed to reject enquiry");
        }
        finally {
            setRejectingCustom(false);
        }
    };

    const handleApproveTicketClick = async (ticketId) => {
        if (!token)
            return;
        if (!window.confirm("Are you sure you want to approve this ticket and upgrade slot limits?"))
            return;
        try {
            await apiApproveTicket(ticketId, token);
            toast.success("Ticket approved and slot limits upgraded successfully!");
            loadTickets();
            loadUsers();
        }
        catch (err) {
            toast.error(err?.message || "Failed to approve ticket");
        }
    };

    const handleDelete = async (id) => {
        if (!token)
            return;
        if (!window.confirm("Are you sure you want to delete this user?"))
            return;
        try {
            setIsDeleting(id);
            await apiDeleteUser(id, token);
            toast.success("User deleted successfully");
            loadUsers();
        }
        catch (err) {
            toast.error(err?.message || "Failed to delete user");
        }
        finally {
            setIsDeleting(null);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        if (!token)
            return;
        const newStatus = currentStatus === "active" ? "deactivated" : "active";
        const action = newStatus === "deactivated" ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} this user?`))
            return;
        try {
            setIsTogglingStatus(userId);
            await apiUpdateUser(userId, { status: newStatus }, token);
            toast.success(`User ${action}d successfully`);
            loadUsers();
        }
        catch (err) {
            toast.error(err?.message || `Failed to ${action} user`);
        }
        finally {
            setIsTogglingStatus(null);
        }
    };

    const handleOpenResetPassword = (user) => {
        setSelectedUserForReset({ id: user._id, name: user.name, email: user.email });
        setResetPassword("");
        setIsResetPasswordDialogOpen(true);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!token || !selectedUserForReset)
            return;
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
        }
        catch (err) {
            toast.error(err?.message || "Failed to reset password");
        }
        finally {
            setIsResettingPassword(false);
        }
    };

    const userRowHandlers = {
        setSelectedMerchantDetails, setIsDetailsModalOpen, setSelectedMerchantForQuote, setQuoteAmount,
        setIsQuoteDialogOpen, setSelectedMerchantForActivation, setMaxEvents, setMaxServices,
        setIsActivationDialogOpen, handleOpenResetPassword, handleToggleStatus, isTogglingStatus,
        handleOpenEdit, handleDelete, isDeleting,
    };

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {roleFilter === "merchant" ? (<>Merchant <span className="text-gradient">Management</span></>) : roleFilter === "customer" ? (<>User <span className="text-gradient">Management</span></>) : (<>User <span className="text-gradient">Management</span></>)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {roleFilter === "merchant" ? "Manage merchants, onboarding, and limit request tickets" : roleFilter === "customer" ? "Manage customer and admin accounts" : "Manage all platform users, merchants, onboarding, custom service requests, and limit request tickets"}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Users className="h-4 w-4 mr-2"/> Add Merchant
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
                  <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })}/>
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input type="text" required maxLength={12} value={formState.mobile} onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            setFormState({ ...formState, mobile: val });
        }} placeholder="Enter 12-digit mobile number"/>
                  <p className="text-xs text-muted-foreground">Exactly 12 numbers (digits only)</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })}/>
                  <p className="text-xs text-muted-foreground">{EMAIL_HINT}</p>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" maxLength={30} required value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })}/>
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
                  <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })}/>
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number (Optional)</Label>
                  <Input type="text" maxLength={12} value={formState.mobile} onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            setFormState({ ...formState, mobile: val });
        }} placeholder="Enter 12-digit mobile number"/>
                  <p className="text-xs text-muted-foreground">Exactly 12 numbers (digits only)</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })}/>
                  <p className="text-xs text-muted-foreground">{EMAIL_HINT}</p>
                </div>
                <div className="space-y-2">
                  <Label>New Password (Optional)</Label>
                  <Input type="password" maxLength={30} value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} placeholder="Leave empty to keep current password"/>
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
        </div>

        {/* Tab Headers */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={() => setActiveTab("users")} className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all ${activeTab === "users" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            All Users & Onboarding
          </button>
          <button onClick={() => setActiveTab("registrations")} className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all ${activeTab === "registrations" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Registration Requests ({users.filter(u => u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid")).length})
          </button>
          <button onClick={() => {
            setActiveTab("custom-services");
            loadCustomRequests();
        }} className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all ${activeTab === "custom-services" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            ✨ Custom Service Enquiries ({customRequests.filter(r => r.status === "pending").length})
          </button>
          <button onClick={() => {
            setActiveTab("tickets");
            loadTickets();
        }} className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all ${activeTab === "tickets" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Slots Upgrade Tickets
          </button>
          <button onClick={() => {
            setActiveTab("billing");
            loadUsers();
            loadTickets();
            loadCustomRequests();
        }} className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-all ${activeTab === "billing" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Billing & Payments History
          </button>
        </div>

        {activeTab === "users" || activeTab === "registrations" ? (<>
            {/* Filters */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: 0.2 }} className="mt-6 flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input placeholder="Search users..." maxLength={30} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border"/>
              </div>
              <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
            </motion.div>

            {/* Users Table */}
            <div className="mt-6 rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto w-full">
                <UsersTableBody list={filteredUsers} emptyMessage={activeTab === "registrations" ? "No pending registration requests found" : roleFilter === "merchant" ? "No merchants found" : roleFilter === "customer" ? "No users found" : "No users found"} {...userRowHandlers}/>
              </div>
            </div>
          </>) : activeTab === "custom-services" ? (<>
            {/* Custom Service Enquiries Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[850px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Service Title & Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Date & Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Requirements / Details</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Quote Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customRequests.map((r) => (<tr key={r._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 align-middle font-medium">
                        <div className="flex flex-col">
                          <span>{r.user?.name || "Customer"}</span>
                          <span className="text-xs text-muted-foreground">{r.user?.email}</span>
                          {r.user?.mobile && <span className="text-[10px] text-muted-foreground">📞 {r.user?.mobile}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{r.serviceTitle}</span>
                          <span className="inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mt-1">
                            {r.category || "General"} {r.quantity ? `• Count: ${r.quantity}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">📅 {new Date(r.eventDate).toLocaleDateString()}</span>
                          <span className="text-muted-foreground mt-0.5">📍 {r.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground italic text-xs max-w-xs truncate" title={r.description}>
                        {r.description}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${r.status === "paid" ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : r.status === "quoted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : r.status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 animate-pulse"}`}>
                          {r.status === "paid" ? "Paid & Confirmed"
                    : r.status === "quoted" ? "Quoted (Awaiting Payment)"
                        : r.status === "rejected" ? "Declined"
                            : "Pending Review"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle font-semibold text-primary">
                        {r.quotationAmount > 0 ? formatCurrency(r.quotationAmount) : (r.budget > 0 ? `Budget: ${formatCurrency(r.budget)}` : "—")}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button variant="outline" size="sm" className="text-blue-600 border-blue-500/30 hover:bg-blue-500/10 font-medium" onClick={() => {
                            setSelectedCustomForDetails(r);
                            setIsCustomDetailsOpen(true);
                          }}>
                            <Eye className="h-3.5 w-3.5 mr-1"/> Details
                          </Button>
                          {r.status === "pending" && (<>
                              <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-medium" onClick={() => {
                        setSelectedCustomForQuote(r);
                        setCustomQuoteAmount(r.budget ? String(r.budget) : "");
                        setCustomQuoteNote("");
                        setIsCustomQuoteOpen(true);
                    }}>
                                <DollarSign className="h-3.5 w-3.5 mr-1"/> Send Quote
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-500/30 hover:bg-red-500/10 font-medium" onClick={() => {
                        setSelectedCustomForReject(r);
                        setRejectionReason("");
                        setIsRejectOpen(true);
                    }}>
                                <XCircle className="h-3.5 w-3.5 mr-1"/> Decline
                              </Button>
                            </>)}
                          {r.status === "quoted" && (<span className="text-xs text-muted-foreground">Quote sent (₹{r.quotationAmount?.toLocaleString()})</span>)}
                          {r.status === "rejected" && (<span className="text-xs text-red-500 italic truncate max-w-[120px]" title={r.rejectionReason}>Declined: {r.rejectionReason}</span>)}
                          {r.status === "paid" && (<span className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                              <CheckCircle2 className="h-3.5 w-3.5"/> Confirmed
                            </span>)}
                        </div>
                      </td>
                    </tr>))}
                  {customRequests.length === 0 && (<tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {loadingCustomRequests ? "Loading custom service requests..." : "No custom service enquiries found."}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </motion.div>
          </>) : activeTab === "tickets" ? (<>
            {/* Tickets Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
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
                  {tickets.map((t) => (<tr key={t._id} className="border-b border-border hover:bg-muted/50 transition-colors">
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${t.status === "approved" ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : t.status === "paid" ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : t.status === "quotation_sent" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            : "bg-secondary text-muted-foreground border-border"}`}>
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
                          {t.status === "pending" && (<Button variant="outline" size="sm" className="text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10" onClick={() => {
                        setSelectedTicketForQuote(t);
                        setTicketQuoteAmount("");
                        setIsTicketQuoteDialogOpen(true);
                    }}>
                                <DollarSign className="h-3.5 w-3.5 mr-1"/> Send Quote
                            </Button>)}
                          {t.status === "paid" && (<Button variant="outline" size="sm" className="text-green-600 border-green-500/30 hover:bg-green-500/10 font-bold" onClick={() => handleApproveTicketClick(t._id)}>
                               <CheckCircle2 className="h-3.5 w-3.5 mr-1"/> Approve & Upgrade
                            </Button>)}
                          {t.status === "quotation_sent" && (<span className="text-xs text-muted-foreground">Awaiting merchant payment</span>)}
                          {t.status === "approved" && (<span className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                              <CheckCircle2 className="h-3 w-3"/> Completed
                            </span>)}
                        </div>
                      </td>
                    </tr>))}
                  {tickets.length === 0 && (<tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {loadingTickets ? "Loading tickets..." : "No upgrade request tickets found"}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </motion.div>
          </>) : (<>
            {/* Billing & Payments History Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="mt-6 rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Payer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Payment Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Amount Received</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                const billingHistory = [];
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
                // 3. Custom service payments
                customRequests.forEach(r => {
                    if (r.status === "paid") {
                        billingHistory.push({
                            id: `custom-${r._id}`,
                            merchantName: r.user?.name || "Customer",
                            merchantEmail: r.user?.email || "",
                            merchantMobile: r.user?.mobile || "",
                            description: `Custom Service: ${r.serviceTitle}`,
                            amount: r.quotationAmount || 0,
                            date: r.paidAt || r.updatedAt || r.createdAt,
                            status: "Paid & Confirmed",
                            statusColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        });
                    }
                });
                // Sort descending
                billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                if (billingHistory.length === 0) {
                    return (<tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payment history found</td>
                        </tr>);
                }
                return billingHistory.map(row => (<tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
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
                      </tr>));
            })()}
                </tbody>
              </table>
            </motion.div>
          </>)}

        {/* Custom Service Request Full Details Dialog */}
        <Dialog open={isCustomDetailsOpen} onOpenChange={setIsCustomDetailsOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-display font-bold">
                <Sparkles className="h-5 w-5 text-primary shrink-0"/> Custom Service Request Details
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Full requirements and parameters submitted by the customer.
              </DialogDescription>
            </DialogHeader>
            {selectedCustomForDetails && (
              <div className="space-y-4 py-2 text-sm max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-b border-border pb-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Customer Info</span>
                    <p className="font-semibold text-base mt-0.5">{selectedCustomForDetails.user?.name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomForDetails.user?.email}</p>
                    {selectedCustomForDetails.user?.mobile && <p className="text-xs text-muted-foreground">📞 {selectedCustomForDetails.user?.mobile}</p>}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        selectedCustomForDetails.status === "paid" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        selectedCustomForDetails.status === "quoted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        selectedCustomForDetails.status === "rejected" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 animate-pulse"
                      }`}>
                        {selectedCustomForDetails.status === "paid" ? "Paid & Confirmed" :
                         selectedCustomForDetails.status === "quoted" ? "Quoted (Awaiting Payment)" :
                         selectedCustomForDetails.status === "rejected" ? "Declined" :
                         "Pending Review"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-b border-border pb-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Service Title & Category</span>
                    <p className="font-bold text-base mt-0.5 text-foreground">{selectedCustomForDetails.serviceTitle}</p>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mt-1">
                      {selectedCustomForDetails.category || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Event Date & Location</span>
                    <p className="font-semibold text-sm mt-0.5">📅 {new Date(selectedCustomForDetails.eventDate).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">📍 {selectedCustomForDetails.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-b border-border pb-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Requested Count / Quantity</span>
                    <p className="font-semibold text-base mt-0.5 text-primary">👥 {selectedCustomForDetails.quantity || 1}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Expected Budget</span>
                    <p className="font-semibold text-base mt-0.5 text-primary">
                      {selectedCustomForDetails.budget > 0 ? formatCurrency(selectedCustomForDetails.budget) : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Detailed Requirements</span>
                  <p className="mt-1 text-foreground whitespace-pre-line leading-relaxed p-3 bg-secondary/30 rounded-lg border border-border text-xs sm:text-sm">
                    {selectedCustomForDetails.description}
                  </p>
                </div>

                {selectedCustomForDetails.status === "quoted" && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-blue-600 dark:text-blue-400">Quotation Sent: {formatCurrency(selectedCustomForDetails.quotationAmount)}</p>
                    {selectedCustomForDetails.quotationNote && <p className="text-muted-foreground">Note: "{selectedCustomForDetails.quotationNote}"</p>}
                  </div>
                )}

                {selectedCustomForDetails.status === "rejected" && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 space-y-1">
                    <p className="font-bold">Decline Reason:</p>
                    <p>"{selectedCustomForDetails.rejectionReason}"</p>
                  </div>
                )}

                {selectedCustomForDetails.status === "paid" && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-600 dark:text-green-400 space-y-1">
                    <p className="font-bold">✅ Customer Accepted & Paid {formatCurrency(selectedCustomForDetails.quotationAmount)}</p>
                    <p>Payment ID: {selectedCustomForDetails.paymentId || "—"}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
              <div>
                {selectedCustomForDetails && selectedCustomForDetails.status === "pending" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" className="flex-1 sm:flex-none h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => {
                      setIsCustomDetailsOpen(false);
                      setSelectedCustomForQuote(selectedCustomForDetails);
                      setCustomQuoteAmount(selectedCustomForDetails.budget ? String(selectedCustomForDetails.budget) : "");
                      setCustomQuoteNote("");
                      setIsCustomQuoteOpen(true);
                    }}>
                      <DollarSign className="h-4 w-4 mr-1"/> Send Quote
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 sm:flex-none h-10 font-medium" onClick={() => {
                      setIsCustomDetailsOpen(false);
                      setSelectedCustomForReject(selectedCustomForDetails);
                      setRejectionReason("");
                      setIsRejectOpen(true);
                    }}>
                      <XCircle className="h-4 w-4 mr-1"/> Decline
                    </Button>
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" className="w-full sm:w-auto h-10" onClick={() => setIsCustomDetailsOpen(false)}>Close Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Service Send Quotation Dialog */}
        <Dialog open={isCustomQuoteOpen} onOpenChange={setIsCustomQuoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary"/> Send Custom Service Quotation
              </DialogTitle>
              <DialogDescription>
                Set the quotation price and add terms or notes for the customer's request.
              </DialogDescription>
            </DialogHeader>
            {selectedCustomForQuote && (
              <form onSubmit={handleSendCustomQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Customer:</strong> {selectedCustomForQuote.user?.name} ({selectedCustomForQuote.user?.email})</p>
                  <p><strong>Service Title:</strong> {selectedCustomForQuote.serviceTitle} ({selectedCustomForQuote.category})</p>
                  <p><strong>Event Date & Location:</strong> {new Date(selectedCustomForQuote.eventDate).toLocaleDateString()} | {selectedCustomForQuote.location}</p>
                  <p><strong>Count / Quantity:</strong> {selectedCustomForQuote.quantity || 1}</p>
                  <p><strong>Customer Budget:</strong> {selectedCustomForQuote.budget > 0 ? formatCurrency(selectedCustomForQuote.budget) : "Not specified"}</p>
                  <p><strong>Details:</strong> "{selectedCustomForQuote.description}"</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customPrice">Quotation Price (₹) *</Label>
                  <Input
                    id="customPrice"
                    type="text"
                    required
                    placeholder="e.g. 15000"
                    value={customQuoteAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setCustomQuoteAmount(val.slice(0, 8));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customNote">Admin Notes / Terms (Optional)</Label>
                  <Textarea
                    id="customNote"
                    rows={3}
                    placeholder="e.g., Includes full setup, sound system, 4 hours performance, and travel expenses."
                    value={customQuoteNote}
                    onChange={(e) => setCustomQuoteNote(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCustomQuoteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingCustomQuote} className="bg-gradient-primary text-white">
                    {sendingCustomQuote ? "Sending Quote..." : "Send Quotation"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Custom Service Decline / Reject Dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5"/> Decline Custom Service Request
              </DialogTitle>
              <DialogDescription>
                State the reason why this service request cannot be fulfilled at this time.
              </DialogDescription>
            </DialogHeader>
            {selectedCustomForReject && (
              <form onSubmit={handleRejectCustomSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Service Title:</strong> {selectedCustomForReject.serviceTitle}</p>
                  <p><strong>Customer:</strong> {selectedCustomForReject.user?.name}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
                  <Textarea
                    id="rejectionReason"
                    rows={3}
                    required
                    placeholder="e.g., No available service partners or team for the selected date and location."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={rejectingCustom} variant="destructive">
                    {rejectingCustom ? "Declining..." : "Decline Request"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary"/>
                Reset Password
              </DialogTitle>
              <DialogDescription>
                {selectedUserForReset && (<>
                    Reset password for <strong>{selectedUserForReset.name}</strong> ({selectedUserForReset.email})
                  </>)}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" maxLength={30} required value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Enter new password"/>
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)} disabled={isResettingPassword}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isResettingPassword} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
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
                <FileText className="h-5 w-5 text-primary"/> Merchant Onboarding Details
              </DialogTitle>
              <DialogDescription>
                Review submitted business qualifications and capabilities.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantDetails && (<div className="space-y-4 py-2 text-sm max-h-[70vh] overflow-y-auto pr-2">
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
                      {selectedMerchantDetails.merchantDetails?.eventTypes?.map((t) => (<span key={t} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">{t}</span>)) || <span className="text-xs text-muted-foreground">None selected</span>}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Services Offered</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.serviceTypes?.map((t) => (<span key={t} className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">{t}</span>)) || <span className="text-xs text-muted-foreground">None selected</span>}
                    </div>
                  </div>
                </div>
              </div>)}
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
                <DollarSign className="h-5 w-5 text-primary"/> Send Onboarding Quotation
              </DialogTitle>
              <DialogDescription>
                Set the setup fee amount for this merchant. The merchant will pay this amount before activation.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantForQuote && (<form onSubmit={handleSendQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForQuote.name}</p>
                  <p><strong>Email:</strong> {selectedMerchantForQuote.email}</p>
                  <p><strong>Business:</strong> {selectedMerchantForQuote.merchantDetails?.businessName}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qAmount">Quotation Amount (in USD/Credits) *</Label>
                  <Input id="qAmount" type="text" required placeholder="e.g. 250" value={quoteAmount} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setQuoteAmount(val.slice(0, 7));
            }}/>
                  <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingQuote} className="bg-gradient-primary text-white">
                    {sendingQuote ? "Sending Quote..." : "Send Quote"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Activation / Limits Dialog */}
        <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500"/>
                {selectedMerchantForActivation?.merchantStatus === "active" ? "Configure Merchant Limits" : "Activate Merchant & Configure Limits"}
              </DialogTitle>
              <DialogDescription>
                Set the maximum number of events and services this merchant is allowed to create on the platform.
              </DialogDescription>
            </DialogHeader>
            {selectedMerchantForActivation && (<form onSubmit={handleActivateMerchantSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedMerchantForActivation.name}</p>
                  <p><strong>Business:</strong> {selectedMerchantForActivation.merchantDetails?.businessName}</p>
                  <p><strong>Quotation Paid:</strong> {formatCurrency(selectedMerchantForActivation.quotationAmount || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxEv">Maximum Events Limit</Label>
                    <Input id="maxEv" type="text" required value={maxEvents} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setMaxEvents(val.slice(0, 4));
            }}/>
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSe">Maximum Services Limit</Label>
                    <Input id="maxSe" type="text" required value={maxServices} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setMaxServices(val.slice(0, 4));
            }}/>
                    <p className="text-[10px] text-muted-foreground">Between 1 and 1000</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsActivationDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={activatingMerchant} className="bg-gradient-primary text-white font-semibold">
                    {activatingMerchant ? "Activating..." : selectedMerchantForActivation.merchantStatus === "active" ? "Update Limits" : "Activate Merchant"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>

        {/* Ticket Send Quotation Dialog */}
        <Dialog open={isTicketQuoteDialogOpen} onOpenChange={setIsTicketQuoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-500"/> Send Limit Upgrade Quotation
              </DialogTitle>
              <DialogDescription>
                Set the quotation fee for this limit upgrade request.
              </DialogDescription>
            </DialogHeader>
            {selectedTicketForQuote && (<form onSubmit={handleSendTicketQuoteSubmit} className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1 border border-border">
                  <p><strong>Merchant:</strong> {selectedTicketForQuote.merchant?.name}</p>
                  <p><strong>Requested slots increase:</strong> +{selectedTicketForQuote.requestedEvents} Events, +{selectedTicketForQuote.requestedServices} Services</p>
                  {selectedTicketForQuote.message && <p><strong>Message:</strong> "{selectedTicketForQuote.message}"</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tqAmount">Quotation Amount (in USD/Credits) *</Label>
                  <Input id="tqAmount" type="text" required placeholder="e.g. 100" value={ticketQuoteAmount} onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setTicketQuoteAmount(val.slice(0, 7));
            }}/>
                  <p className="text-[10px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTicketQuoteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={sendingTicketQuote} className="bg-gradient-primary text-white">
                    {sendingTicketQuote ? "Sending Quote..." : "Send Quote"}
                  </Button>
                </DialogFooter>
              </form>)}
          </DialogContent>
        </Dialog>

      </section>
    </AdminLayout>);
};
export default AdminUsers;
