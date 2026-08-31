import { motion } from "framer-motion";
import { Plus, Users, CheckCircle, AlertTriangle, Search, Filter, UserX, UserCheck, KeyRound, FileText, CheckCircle2, IndianRupee, Sparkles, XCircle, Eye, Pencil, Trash2, MessageSquare, Download, X, MoreHorizontal } from "lucide-react";
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
import { sanitizeEmailInput, sanitizeNameInput, validateEmail, validateSignupForm, validateNewPasswordForm, validateMobileNumber, formatMobileForApi, formatMobileForInput, EMAIL_HINT, PASSWORD_HINT, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import { TableEmptyState } from "@/components/common/table/TableEmptyState";
import { TableToolbar } from "@/components/common/table/TableToolbar";
import { TableSkeleton } from "@/components/common/table/TableSkeleton";
import ActionMenu from "@/components/common/ActionMenu";
import PageHeader from "@/components/common/PageHeader";

const formatJoinedDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const renderRoleBadge = (role) => {
  const r = (role || "user").toLowerCase();
  if (r === "merchant") {
    return (
      <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
        Merchant
      </span>
    );
  }
  if (r === "admin") {
    return (
      <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
        Admin
      </span>
    );
  }
  return (
    <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      {r === "customer" ? "Customer" : "User"}
    </span>
  );
};

const renderStatusBadge = (status) => {
  const s = (status || "active").toLowerCase();
  if (s === "active") {
    return (
      <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
        Active
      </span>
    );
  }
  if (s === "suspended") {
    return (
      <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
        Suspended
      </span>
    );
  }
  if (s === "pending" || s === "details_submitted") {
    return (
      <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
        Pending
      </span>
    );
  }
  return (
    <span className="h-6 px-2.5 rounded-md text-[11px] font-medium border inline-flex items-center justify-center bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
      {s === "deactivated" ? "Deactivated" : "Inactive"}
    </span>
  );
};

const UsersTableBody = ({
  list,
  loading = false,
  emptyMessage = "No users found",
  navigate,
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Search users by name or email...",
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, list.length]);

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = list.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    if (!list || list.length === 0) {
      toast.info("No user records to export.");
      return;
    }
    const headers = ["User ID", "Name", "Email", "Mobile", "Role", "Status", "Joined Date"];
    const rows = list.map((u) => [
      u._id,
      `"${u.name || ""}"`,
      `"${u.email || ""}"`,
      `"${u.mobile || ""}"`,
      u.role || "user",
      u.status || "active",
      formatJoinedDate(u.createdAt),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Users exported successfully!");
  };

  return (
    <div className="w-full space-y-4 font-sans">
      {/* 1. Clean Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-[340px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-card border-border/80 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery && setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right Action: Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3.5 text-xs gap-1.5 rounded-lg border-border/80 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Table Card Container */}
      <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
        {loading ? (
          <TableSkeleton columns={7} rows={6} minWidth="100%" />
        ) : (
          <>
            <DataTable minWidth="100%">
              <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs sticky top-0 z-10 border-b border-border/80">
                <TableHeaderCell className="w-[25%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3">
                  User
                </TableHeaderCell>
                <TableHeaderCell className="w-[30%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3">
                  Contact
                </TableHeaderCell>
                <TableHeaderCell className="w-[11%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3">
                  Role
                </TableHeaderCell>
                <TableHeaderCell className="w-[11%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3">
                  Status
                </TableHeaderCell>
                <TableHeaderCell className="w-[15%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3 whitespace-nowrap">
                  Joined
                </TableHeaderCell>
                <TableHeaderCell align="right" className="w-[8%] text-xs font-semibold text-muted-foreground tracking-wider uppercase py-3">
                  Actions
                </TableHeaderCell>
              </TableHeader>
              <TableBody>
                {paginatedList.map((u) => {
                  const initials = (u.name || "User").slice(0, 2).toUpperCase();
                  const shortId = u._id ? u._id.slice(-6) : "------";
                  return (
                    <TableRow
                      key={u._id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-slate-900/60 transition-colors h-[60px]"
                    >
                      {/* User Column */}
                      <TableCell className="w-[25%] py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[14px] text-foreground truncate" title={u.name}>
                              {u.name}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground font-mono truncate cursor-help"
                              title={`Full User ID: ${u._id}`}
                            >
                              ID: {shortId}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Column (Email + Mobile if available) */}
                      <TableCell className="w-[30%] py-3">
                        <div className="min-w-0 space-y-0.5">
                          <span
                            className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate block max-w-full"
                            title={u.email}
                          >
                            {u.email}
                          </span>
                          {u.mobile && (
                            <span className="text-[12px] text-slate-500 font-mono block truncate">
                              {u.mobile}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Role Column */}
                      <TableCell className="w-[11%] py-3">
                        {renderRoleBadge(u.role)}
                      </TableCell>

                      {/* Status Column */}
                      <TableCell className="w-[11%] py-3">
                        {renderStatusBadge(u.status || "active")}
                      </TableCell>

                      {/* Joined Date Column */}
                      <TableCell className="w-[15%] py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatJoinedDate(u.createdAt)}
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell align="right" className="w-[8%] py-3">
                        <ActionMenu
                          items={[
                            {
                              label: "View Details",
                              icon: Eye,
                              onClick: () => navigate(`/admin-dashboard/users/${u._id}`),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Empty State */}
                {paginatedList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <TableEmptyState
                        title="No users found"
                        description="Try adjusting your search query or filters."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </DataTable>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/70 text-xs text-muted-foreground bg-muted/20">
                <div>
                  Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems} users
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs rounded-md cursor-pointer"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, currentPage - 2),
                      Math.min(totalPages, currentPage + 1)
                    )
                    .map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 p-0 text-xs rounded-md cursor-pointer ${
                          page === currentPage
                            ? "bg-primary text-primary-foreground font-semibold"
                            : ""
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 text-xs rounded-md cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AdminUsers = () => {
    const { token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
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
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
    const [loadingUsers, setLoadingUsers] = useState(false);
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
    const [selectedTicketMessage, setSelectedTicketMessage] = useState(null);

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
            (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u._id && u._id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.mobile && u.mobile.includes(searchQuery));

        const role = (u.role || "user").toLowerCase();
        const matchesRole = selectedRoleFilter === "all" || role === selectedRoleFilter.toLowerCase() || (selectedRoleFilter === "customer" && role !== "merchant" && role !== "admin");

        const status = (u.status || "active").toLowerCase();
        const matchesStatus = selectedStatusFilter === "all" || status === selectedStatusFilter.toLowerCase();

        if (activeTab === "registrations") {
            return matchesSearch && matchesRole && matchesStatus && u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid");
        }
        if (roleFilter === "merchant")
            return matchesSearch && matchesRole && matchesStatus && u.role === "merchant";
        if (roleFilter === "customer")
            return matchesSearch && matchesRole && matchesStatus && u.role !== "merchant" && u.role !== "admin";
        return matchesSearch && matchesRole && matchesStatus && u.role !== "admin";
    });

    const loadUsers = async () => {
        if (!token)
            return;
        setLoadingUsers(true);
        try {
            const res = await apiListUsers(token);
            setUsers(res.users || []);
        }
        catch (e) {
            toast.error(e?.message || "Failed to load users");
        }
        finally {
            setLoadingUsers(false);
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
        setFormState({ id: user._id, name: user.name, email: user.email, password: "", role: user.role, mobile: formatMobileForInput(user.mobile) });
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
        const mobErr = validateMobileNumber(formState.mobile, formState.role === "merchant");
        if (mobErr) {
            toast.error(mobErr);
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
                    mobile: formatMobileForApi(formState.mobile)
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
                await apiCreateUser({ name: formState.name, email: formState.email, password: formState.password, role: formState.role, mobile: formatMobileForApi(formState.mobile) }, token);
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
      navigate,
      setSelectedMerchantDetails,
      setIsDetailsModalOpen,
      setSelectedMerchantForQuote,
      setQuoteAmount,
      setIsQuoteDialogOpen,
      setSelectedMerchantForActivation,
      setMaxEvents,
      setMaxServices,
      setIsActivationDialogOpen,
    };

    return (
    <AdminLayout>
      <PageHeader
        title={roleFilter === "merchant" ? "Merchant Management" : "User Management"}
        subtitle={
          roleFilter === "merchant"
            ? "Manage merchant accounts, onboarding requests, slot upgrades, and billing."
            : "Manage platform users, merchants, onboarding, and system access."
        }
        breadcrumbs={[
          { label: "Admin Portal", to: "/admin-dashboard" },
          { label: "User Management" },
          { label: roleFilter === "merchant" ? "Merchants" : "Users" },
        ]}
        actions={
          roleFilter === "merchant" ? (
            <Button
              onClick={() => navigate("/admin-dashboard/users/create-merchant")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-4 rounded-md gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Merchant
            </Button>
          ) : null
        }
      />

      <div className="space-y-6">
        {/* Edit User Modal */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Account</DialogTitle>
              <DialogDescription>Modify user privileges or information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input maxLength={NAME_MAX_LENGTH} required value={formState.name} onChange={(e) => setFormState({ ...formState, name: sanitizeNameInput(e.target.value) })} className="h-9 text-xs rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number (Optional)</Label>
                <Input type="text" maxLength={12} value={formState.mobile} onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setFormState({ ...formState, mobile: val });
                }} placeholder="Enter 12-digit mobile number" className="h-9 text-xs rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} required value={formState.email} onChange={(e) => setFormState({ ...formState, email: sanitizeEmailInput(e.target.value) })} className="h-9 text-xs rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Password (Optional)</Label>
                <Input type="password" maxLength={30} value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} placeholder="Leave empty to keep current password" className="h-9 text-xs rounded-md" />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isSubmitting} className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Clean Category Navigation Tabs Bar */}
        {roleFilter !== "customer" && (
          <div className="border-b border-border/70 w-full overflow-x-auto no-scrollbar">
            <nav className="flex items-center gap-6 min-w-max">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-3 text-xs font-semibold transition-all border-b-2 ${
                  activeTab === "users"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                All Merchants
              </button>
              <button
                onClick={() => setActiveTab("registrations")}
                className={`py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "registrations"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Registration Requests</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted font-bold text-muted-foreground">
                  {users.filter((u) => u.role === "merchant" && (u.merchantStatus === "details_submitted" || u.merchantStatus === "paid")).length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("custom-services");
                  loadCustomRequests();
                }}
                className={`py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "custom-services"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Service Enquiries</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted font-bold text-muted-foreground">
                  {customRequests.filter((r) => r.status === "pending").length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("tickets");
                  loadTickets();
                }}
                className={`py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "tickets"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Slot Upgrades</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted font-bold text-muted-foreground">
                  {tickets.filter((t) => t.status === "pending" || t.status === "paid").length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("billing");
                  loadUsers();
                  loadTickets();
                  loadCustomRequests();
                }}
                className={`py-3 text-xs font-semibold transition-all border-b-2 ${
                  activeTab === "billing"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Billing History
              </button>
            </nav>
          </div>
        )}

        {/* TAB CONTENT: USERS / REGISTRATIONS */}
        {(activeTab === "users" || activeTab === "registrations") && (
          <div className="space-y-4 font-sans">
            <UsersTableBody
              list={filteredUsers}
              loading={loadingUsers}
              emptyMessage={
                activeTab === "registrations"
                  ? "No pending registration requests found."
                  : roleFilter === "merchant"
                  ? "No merchants found."
                  : "No users found."
              }
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder={
                roleFilter === "merchant"
                  ? "Search merchants by name or email..."
                  : "Search users by name or email..."
              }
              roleFilter={selectedRoleFilter}
              setRoleFilter={setSelectedRoleFilter}
              statusFilter={selectedStatusFilter}
              setStatusFilter={setSelectedStatusFilter}
              {...userRowHandlers}
            />
          </div>
        )}

        {/* TAB CONTENT: CUSTOM SERVICES */}
        {activeTab === "custom-services" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <DataTable minWidth="100%">
              <TableHeader>
                <TableHeaderCell className="w-[20%]">Customer</TableHeaderCell>
                <TableHeaderCell className="w-[18%]">Service Title</TableHeaderCell>
                <TableHeaderCell className="w-[15%]">Event & Location</TableHeaderCell>
                <TableHeaderCell className="w-[22%]">Description</TableHeaderCell>
                <TableHeaderCell className="w-[12%]">Status</TableHeaderCell>
                <TableHeaderCell className="w-[7%]">Quote / Budget</TableHeaderCell>
                <TableHeaderCell align="right" className="w-[6%]">Actions</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {customRequests.map((r) => {
                  const customerInitials = (r.user?.name || "Customer").slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {customerInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{r.user?.name || "Customer"}</p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">{r.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{r.serviceTitle}</p>
                          <p className="text-[10px] text-muted-foreground">{r.category || "General"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.eventDate && <p>📅 {new Date(r.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        {r.location && <p className="truncate max-w-[130px]">📍 {r.location}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p className="line-clamp-2 max-w-[200px]" title={r.description}>
                          {r.description || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            r.status === "paid"
                              ? "completed"
                              : r.status === "quoted"
                              ? "active"
                              : r.status === "rejected"
                              ? "cancelled"
                              : "pending"
                          }
                          label={
                            r.status === "paid"
                              ? "Confirmed & Paid"
                              : r.status === "quoted"
                              ? "Quotation Sent"
                              : r.status === "rejected"
                              ? "Declined"
                              : "Pending Review"
                          }
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                        {r.quotationAmount > 0
                          ? formatCurrency(r.quotationAmount)
                          : r.budget > 0
                          ? formatCurrency(r.budget)
                          : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <ActionMenu
                          items={[
                            {
                              label: "View Details",
                              icon: Eye,
                              onClick: () => {
                                setSelectedCustomForDetails(r);
                                setIsCustomDetailsOpen(true);
                              },
                            },
                            ...(r.status === "pending"
                              ? [
                                  {
                                    label: "Send Quote",
                                    icon: IndianRupee,
                                    onClick: () => {
                                      setSelectedCustomForQuote(r);
                                      setCustomQuoteAmount(r.budget ? String(r.budget) : "");
                                      setCustomQuoteNote("");
                                      setIsCustomQuoteOpen(true);
                                    },
                                  },
                                  {
                                    label: "Decline Request",
                                    icon: XCircle,
                                    destructive: true,
                                    onClick: () => {
                                      setSelectedCustomForReject(r);
                                      setRejectionReason("");
                                      setIsRejectOpen(true);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {customRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center">
                      <TableEmptyState
                        title="No Custom Service Enquiries"
                        description={loadingCustomRequests ? "Loading custom service requests..." : "There are currently no custom service enquiries."}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </DataTable>
          </motion.div>
        )}

        {/* TAB CONTENT: SLOT UPGRADE TICKETS (Exact Requirements Redesign) */}
        {activeTab === "tickets" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <DataTable minWidth="100%">
              <TableHeader>
                <TableHeaderCell className="w-[27%]">Merchant</TableHeaderCell>
                <TableHeaderCell className="w-[22%]">Slot Request</TableHeaderCell>
                <TableHeaderCell align="center" className="w-[100px] min-w-[100px] text-center">Message</TableHeaderCell>
                <TableHeaderCell className="w-[13%] whitespace-nowrap">Requested On</TableHeaderCell>
                <TableHeaderCell className="w-[11%]">Status</TableHeaderCell>
                <TableHeaderCell className="w-[10%] whitespace-nowrap">Quote</TableHeaderCell>
                <TableHeaderCell align="right" className="w-[7%]">Actions</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => {
                  const merchantName = t.merchant?.name || "Merchant";
                  const merchantInitials = merchantName.slice(0, 2).toUpperCase();
                  const formattedDate = t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "—";

                  return (
                    <TableRow key={t._id}>
                      {/* Merchant Identity Cell */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {merchantInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{merchantName}</p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">{t.merchant?.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Side-by-Side Compact Slot Request Cell */}
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {t.requestedEvents > 0 && (
                            <span className="inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shrink-0">
                              Events +{t.requestedEvents}
                            </span>
                          )}
                          {t.requestedServices > 0 && (
                            <span className="inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                              Services +{t.requestedServices}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Fixed Compact Centered Message Cell */}
                      <TableCell align="center" className="w-[100px] min-w-[100px] text-center">
                        <div className="flex items-center justify-center w-full">
                          {t.message && t.message.trim() ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTicketMessage(t)}
                              className="h-8 w-8 rounded-md bg-background hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border hover:border-primary/30 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-xs"
                              title="View message"
                              aria-label="View message"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs font-medium text-center">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Requested Date Cell */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                        {formattedDate}
                      </TableCell>

                      {/* Compact Semantic Status Badge Cell */}
                      <TableCell>
                        <StatusBadge
                          status={
                            t.status === "approved"
                              ? "completed"
                              : t.status === "paid"
                              ? "active"
                              : t.status === "quotation_sent"
                              ? "pending"
                              : "inactive"
                          }
                          label={
                            t.status === "approved"
                              ? "Approved"
                              : t.status === "paid"
                              ? "Paid (Pending)"
                              : t.status === "quotation_sent"
                              ? "Quotation Sent"
                              : "Pending Review"
                          }
                        />
                      </TableCell>

                      {/* Quotation Amount Cell */}
                      <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                        {t.quotationAmount > 0 ? formatCurrency(t.quotationAmount) : "—"}
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell align="right">
                        <ActionMenu
                          items={[
                            ...(t.status === "pending"
                              ? [
                                  {
                                    label: "Send Quote",
                                    icon: IndianRupee,
                                    onClick: () => {
                                      setSelectedTicketForQuote(t);
                                      setTicketQuoteAmount("");
                                      setIsTicketQuoteDialogOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            ...(t.status === "paid"
                              ? [
                                  {
                                    label: "Approve & Upgrade",
                                    icon: CheckCircle2,
                                    onClick: () => handleApproveTicketClick(t._id),
                                  },
                                ]
                              : []),
                            {
                              label: "View Merchant",
                              icon: Eye,
                              onClick: () => navigate(`/admin-dashboard/users/${t.merchant?._id}`),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center">
                      <TableEmptyState
                        title="No Slot Upgrade Tickets"
                        description={loadingTickets ? "Loading upgrade tickets..." : "No limit upgrade request tickets found."}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </DataTable>
          </motion.div>
        )}

        {/* TAB CONTENT: BILLING & PAYMENTS HISTORY */}
        {activeTab === "billing" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <DataTable minWidth="100%">
              <TableHeader>
                <TableHeaderCell className="w-[22%]">Payer</TableHeaderCell>
                <TableHeaderCell className="w-[35%]">Description</TableHeaderCell>
                <TableHeaderCell className="w-[18%] whitespace-nowrap">Payment Date</TableHeaderCell>
                <TableHeaderCell className="w-[13%] whitespace-nowrap">Amount</TableHeaderCell>
                <TableHeaderCell align="right" className="w-[12%]">Status</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {(() => {
                  const billingHistory = [];
                  // 1. Setup payments
                  users.forEach((u) => {
                    if (u.role === "merchant" && (u.merchantStatus === "active" || u.merchantStatus === "paid")) {
                      billingHistory.push({
                        id: `setup-${u._id}`,
                        merchantName: u.name,
                        merchantEmail: u.email,
                        description: "Onboarding Account Setup Fee",
                        amount: u.quotationAmount || 0,
                        date: u.updatedAt || u.createdAt,
                        status: u.merchantStatus === "active" ? "Activated" : "Paid (Awaiting Activation)",
                        statusType: u.merchantStatus === "active" ? "active" : "pending",
                      });
                    }
                  });
                  // 2. Ticket payments
                  tickets.forEach((t) => {
                    if (t.status === "paid" || t.status === "approved") {
                      billingHistory.push({
                        id: t._id,
                        merchantName: t.merchant?.name || "Merchant",
                        merchantEmail: t.merchant?.email || "",
                        description: `Slot Limit Upgrade (+${t.requestedEvents} Events, +${t.requestedServices} Services)`,
                        amount: t.quotationAmount || 0,
                        date: t.updatedAt || t.createdAt,
                        status: t.status === "approved" ? "Approved & Upgraded" : "Paid (Awaiting Approval)",
                        statusType: t.status === "approved" ? "active" : "pending",
                      });
                    }
                  });
                  // 3. Custom service payments
                  customRequests.forEach((r) => {
                    if (r.status === "paid") {
                      billingHistory.push({
                        id: `custom-${r._id}`,
                        merchantName: r.user?.name || "Customer",
                        merchantEmail: r.user?.email || "",
                        description: `Custom Service: ${r.serviceTitle}`,
                        amount: r.quotationAmount || 0,
                        date: r.paidAt || r.updatedAt || r.createdAt,
                        status: "Confirmed & Paid",
                        statusType: "completed",
                      });
                    }
                  });

                  billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (billingHistory.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center">
                          <TableEmptyState title="No Billing History" description="No billing transactions or payment records found." />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return billingHistory.map((row) => {
                    const initials = (row.merchantName || "User").slice(0, 2).toUpperCase();
                    const dateFormatted = new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate">{row.merchantName}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{row.merchantEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                          {dateFormatted}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell align="right">
                          <StatusBadge status={row.statusType} label={row.status} />
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </DataTable>
          </motion.div>
        )}
      </div>

      {/* Custom Service Details Modal */}
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
                      <IndianRupee className="h-4 w-4 mr-1"/> Send Quote
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
              <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary"/>
                  <span>Merchant Profile & Details</span>
                </div>
                {selectedMerchantDetails && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    selectedMerchantDetails.status === "deactivated" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-600 border border-green-500/20"
                  }`}>
                    {selectedMerchantDetails.status === "deactivated" ? "Deactivated" : "Active Account"}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                Full business overview, qualifications, contact info, and account management actions.
              </DialogDescription>
            </DialogHeader>

            {selectedMerchantDetails && (<div className="space-y-4 py-2 text-sm max-h-[70vh] overflow-y-auto pr-1">
                {/* Account & Contact Information Card */}
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Account & Contact Info
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Account Holder</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">{selectedMerchantDetails.name}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Email Address</span>
                      <p className="font-medium text-xs mt-0.5 text-foreground truncate" title={selectedMerchantDetails.email}>{selectedMerchantDetails.email}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Mobile Number</span>
                      <p className="font-medium text-xs mt-0.5 text-foreground">{selectedMerchantDetails.mobile || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Business Profile Card */}
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Business Profile
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Business Name</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">{selectedMerchantDetails.merchantDetails?.businessName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Experience</span>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">
                        {selectedMerchantDetails.merchantDetails?.experienceYears ? `${selectedMerchantDetails.merchantDetails.experienceYears} years` : "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Business Location / Address</span>
                    <p className="text-xs mt-0.5 text-foreground/90">{selectedMerchantDetails.merchantDetails?.address || "—"}</p>
                  </div>

                  {selectedMerchantDetails.merchantDetails?.businessDescription && (
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Business Description</span>
                      <p className="text-xs mt-1 text-muted-foreground whitespace-pre-line leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/40">
                        {selectedMerchantDetails.merchantDetails.businessDescription}
                      </p>
                    </div>
                  )}
                </div>

                {/* Capability Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/20 rounded-xl border border-border/60">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Event Types Handled</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.eventTypes?.map((t) => (<span key={t} className="text-xs bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border/70 font-medium">{t}</span>)) || <span className="text-xs text-muted-foreground italic">None selected</span>}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-xl border border-border/60">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Services Offered</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMerchantDetails.merchantDetails?.serviceTypes?.map((t) => (<span key={t} className="text-xs bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border/70 font-medium">{t}</span>)) || <span className="text-xs text-muted-foreground italic">None selected</span>}
                    </div>
                  </div>
                </div>

                {/* Onboarding & Limits Card */}
                <div className="p-3.5 bg-secondary/20 rounded-xl border border-border/60 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Onboarding & Account Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Onboarding Status: </span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          selectedMerchantDetails.merchantStatus === "active" ? "bg-tint-mint text-tint-mint-fg" :
                          selectedMerchantDetails.merchantStatus === "paid" ? "bg-tint-violet text-tint-violet-fg" :
                          selectedMerchantDetails.merchantStatus === "quotation_sent" ? "bg-tint-orange text-tint-orange-fg" :
                          selectedMerchantDetails.merchantStatus === "details_submitted" ? "bg-tint-orange text-tint-orange-fg" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {selectedMerchantDetails.merchantStatus === "active" ? "Activated" :
                           selectedMerchantDetails.merchantStatus === "paid" ? "Paid (Awaiting Activation)" :
                           selectedMerchantDetails.merchantStatus === "quotation_sent" ? "Quotation Sent" :
                           selectedMerchantDetails.merchantStatus === "details_submitted" ? "Review Pending" :
                           "Details Pending"}
                        </span>
                      </div>
                    </div>
                    {selectedMerchantDetails.role === "merchant" && (
                      <div>
                        <span className="text-[11px] text-muted-foreground uppercase font-semibold">Slot Limits: </span>
                        <p className="font-semibold text-xs mt-1 text-foreground">
                          {selectedMerchantDetails.maxEvents || 5} Events / {selectedMerchantDetails.maxServices || 5} Services
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>)}

            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-border pt-4 mt-2">
              {selectedMerchantDetails && (
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {/* Reset Password Action with Key Symbol */}
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenResetPassword(selectedMerchantDetails);
                  }} title="Reset Password" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-500/30">
                    <KeyRound className="h-4 w-4 mr-1"/> Reset Password
                  </Button>

                  {/* Limits Action Button */}
                  {selectedMerchantDetails.role === "merchant" && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsDetailsModalOpen(false);
                      setSelectedMerchantForActivation(selectedMerchantDetails);
                      setMaxEvents(selectedMerchantDetails.maxEvents?.toString() || "5");
                      setMaxServices(selectedMerchantDetails.maxServices?.toString() || "5");
                      setIsActivationDialogOpen(true);
                    }} className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-500/30" title="Modify account listing limits">
                      Limits
                    </Button>
                  )}

                  {/* Edit Action */}
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(selectedMerchantDetails);
                  }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5"/> Edit
                  </Button>

                  {/* Deactivate / Activate Action */}
                  {selectedMerchantDetails.role !== "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTogglingStatus === selectedMerchantDetails._id}
                      onClick={() => handleToggleStatus(selectedMerchantDetails._id, selectedMerchantDetails.status || "active")}
                      className={`${selectedMerchantDetails.status === "deactivated" ? "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-500/30" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-500/30"}`}
                    >
                      {isTogglingStatus === selectedMerchantDetails._id ? ("...") : selectedMerchantDetails.status === "deactivated" ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5"/> Activate
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5 mr-1.5"/> Deactivate
                        </>
                      )}
                    </Button>
                  )}

                  {/* Delete Action */}
                  {selectedMerchantDetails.role !== "admin" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting === selectedMerchantDetails._id}
                      onClick={() => handleDelete(selectedMerchantDetails._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5"/>
                      {isDeleting === selectedMerchantDetails._id ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Merchant Onboarding Send Quotation Dialog */}
        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary"/> Send Onboarding Quotation
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
                  <Label htmlFor="qAmount">Quotation Amount (in ₹) *</Label>
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
                <IndianRupee className="h-5 w-5 text-indigo-500"/> Send Limit Upgrade Quotation
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
                  <Label htmlFor="tqAmount">Quotation Amount (in ₹) *</Label>
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

        {/* Slot Upgrade Ticket Message View Modal */}
        <Dialog open={!!selectedTicketMessage} onOpenChange={(open) => !open && setSelectedTicketMessage(null)}>
          <DialogContent className="max-w-md w-full rounded-xl bg-card border border-border p-6 shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                <span>Request Message</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Explanation provided by merchant for limit upgrade request.
              </DialogDescription>
            </DialogHeader>

            {selectedTicketMessage && (
              <div className="space-y-4 py-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Merchant</span>
                    <p className="font-semibold text-sm text-foreground mt-0.5">{selectedTicketMessage.merchant?.name || "Merchant"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedTicketMessage.merchant?.email || "—"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Requested</span>
                    <div className="flex items-center gap-1.5 justify-end">
                      {selectedTicketMessage.requestedEvents > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                          Events +{selectedTicketMessage.requestedEvents}
                        </span>
                      )}
                      {selectedTicketMessage.requestedServices > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          Services +{selectedTicketMessage.requestedServices}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Message</span>
                  <div className="p-3.5 rounded-lg bg-background border border-border/70 text-foreground text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                    "{selectedTicketMessage.message}"
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicketMessage(null)}
                className="w-full sm:w-auto h-9 text-xs font-semibold rounded-md"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </AdminLayout>);
};
export default AdminUsers;
