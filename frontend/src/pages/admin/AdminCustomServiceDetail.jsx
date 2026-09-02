import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  IndianRupee,
  XCircle,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Wallet,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  User,
  Mail,
  Phone,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  apiGetAdminCustomServiceRequests,
  apiSendCustomServiceQuote,
  apiRejectCustomServiceRequest,
} from "@/lib/api";

const STATUS_CONFIG = {
  paid: {
    label: "Paid & Confirmed",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  quoted: {
    label: "Quotation Sent",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    icon: Send,
    iconClass: "text-blue-500",
  },
  rejected: {
    label: "Declined",
    className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    icon: XCircle,
    iconClass: "text-red-500",
  },
  pending: {
    label: "Pending Review",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 animate-pulse",
    icon: Clock,
    iconClass: "text-amber-500",
  },
};

const InfoRow = ({ icon: Icon, label, value, valueClass = "" }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-foreground leading-snug ${valueClass}`}>{value || "—"}</p>
    </div>
  </div>
);

const AdminCustomServiceDetail = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // View mode: "details" | "quote" | "reject"
  const [mode, setMode] = useState("details");

  useEffect(() => {
    const loadRequest = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await apiGetAdminCustomServiceRequests(token);
        const found = (res.requests || []).find((r) => r._id === id);
        if (!found) {
          toast.error("Custom service request not found.");
          navigate("/admin-dashboard/users?tab=custom");
          return;
        }
        setRequest(found);
        // Pre-fill quote amount from budget if available
        if (found.budget > 0) setQuoteAmount(String(found.budget));
      } catch (err) {
        toast.error(err?.message || "Failed to load request details.");
        navigate("/admin-dashboard/users?tab=custom");
      } finally {
        setLoading(false);
      }
    };
    loadRequest();
  }, [token, id]);

  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!token || !request) return;
    const amt = Number(quoteAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Quotation amount must be a positive number.");
      return;
    }
    setSendingQuote(true);
    try {
      await apiSendCustomServiceQuote(request._id, { quotationAmount: amt, quotationNote: quoteNote }, token);
      toast.success("Quotation sent successfully to the customer!");
      navigate("/admin-dashboard/users?tab=custom");
    } catch (err) {
      toast.error(err?.message || "Failed to send quotation.");
    } finally {
      setSendingQuote(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!token || !request) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for declining this request.");
      return;
    }
    setRejecting(true);
    try {
      await apiRejectCustomServiceRequest(request._id, { rejectionReason }, token);
      toast.success("Custom service request declined.");
      navigate("/admin-dashboard/users?tab=custom");
    } catch (err) {
      toast.error(err?.message || "Failed to decline request.");
    } finally {
      setRejecting(false);
    }
  };

  const statusCfg = request ? (STATUS_CONFIG[request.status] || STATUS_CONFIG.pending) : STATUS_CONFIG.pending;

  return (
    <AdminLayout>
      <div className="w-full max-w-[900px] mx-auto space-y-5 pb-16">
        {/* Page Header */}
        <PageHeader
          title="Custom Service Request"
          subtitle="Review the customer's requirements and take action — send a quotation or decline the request."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: "Custom Enquiries", to: "/admin-dashboard/users?tab=custom" },
            { label: "Request Details" },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin-dashboard/users?tab=custom")}
              className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Enquiries
            </Button>
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading request details…</p>
          </div>
        ) : request ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="space-y-5"
          >
            {/* Status Banner */}
            {(() => {
              const Icon = statusCfg.icon;
              return (
                <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${statusCfg.className}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${statusCfg.iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Status: {statusCfg.label}</p>
                    {request.status === "quoted" && (
                      <p className="text-xs opacity-80 mt-0.5">
                        Quotation of {formatCurrency(request.quotationAmount)} sent — awaiting customer payment.
                        {request.quotationNote && ` Note: "${request.quotationNote}"`}
                      </p>
                    )}
                    {request.status === "paid" && (
                      <p className="text-xs opacity-80 mt-0.5">
                        Customer paid {formatCurrency(request.quotationAmount)}.
                        {request.paymentId && ` Payment ID: ${request.paymentId}`}
                      </p>
                    )}
                    {request.status === "rejected" && request.rejectionReason && (
                      <p className="text-xs opacity-80 mt-0.5">Reason: "{request.rejectionReason}"</p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT: Request Details Card */}
              <div className="lg:col-span-7 space-y-4">
                {/* Customer Info */}
                <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-border/60 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Customer Information</p>
                      <p className="text-[11px] text-muted-foreground">Who submitted this request</p>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <InfoRow icon={User} label="Full Name" value={request.user?.name || "Customer"} />
                    <InfoRow icon={Mail} label="Email Address" value={request.user?.email} />
                    {request.user?.mobile && (
                      <InfoRow icon={Phone} label="Mobile" value={request.user.mobile} />
                    )}
                  </div>
                </div>

                {/* Service Details */}
                <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-border/60 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Service Request Details</p>
                      <p className="text-[11px] text-muted-foreground">Full requirements and parameters</p>
                    </div>
                  </div>
                  <div className="px-5 py-2">
                    <InfoRow
                      icon={Sparkles}
                      label="Service Title"
                      value={
                        <span className="flex items-center gap-2 flex-wrap">
                          <span>{request.serviceTitle}</span>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 capitalize">
                            {request.category || "General"}
                          </span>
                        </span>
                      }
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Event Date"
                      value={new Date(request.eventDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    />
                    <InfoRow icon={MapPin} label="Event Location" value={request.location} />
                    <InfoRow
                      icon={Users}
                      label="Guest Count / Quantity"
                      value={
                        <span className="text-primary font-bold">
                          👥 {request.quantity || 1} person{(request.quantity || 1) !== 1 ? "s" : ""}
                        </span>
                      }
                    />
                    <InfoRow
                      icon={Wallet}
                      label="Customer's Expected Budget"
                      value={
                        request.budget > 0 ? (
                          <span className="text-primary font-bold">{formatCurrency(request.budget)}</span>
                        ) : (
                          "Not specified"
                        )
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="px-5 pb-5">
                    <div className="flex items-start gap-3 pt-3 border-t border-border/60">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Detailed Requirements
                        </p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-secondary/40 rounded-xl border border-border/60 px-4 py-3">
                          {request.description || "No detailed description provided."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Action Card */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                {request.status === "pending" ? (
                  <>
                    {/* Mode Switcher */}
                    <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                      <div className="px-5 pt-5 pb-3 border-b border-border/60">
                        <p className="text-sm font-bold text-foreground">Take Action</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Send a price quotation or decline this request
                        </p>
                      </div>
                      <div className="p-4 flex gap-2.5">
                        <button
                          onClick={() => setMode("quote")}
                          className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all text-center ${
                            mode === "quote"
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:bg-secondary/50"
                          }`}
                        >
                          <IndianRupee
                            className={`h-5 w-5 ${mode === "quote" ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <span className={`text-xs font-bold ${mode === "quote" ? "text-primary" : "text-foreground"}`}>
                            Send Quote
                          </span>
                        </button>
                        <button
                          onClick={() => setMode("reject")}
                          className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all text-center ${
                            mode === "reject"
                              ? "border-destructive bg-destructive/5 shadow-sm"
                              : "border-border bg-card hover:bg-secondary/50"
                          }`}
                        >
                          <XCircle
                            className={`h-5 w-5 ${mode === "reject" ? "text-destructive" : "text-muted-foreground"}`}
                          />
                          <span
                            className={`text-xs font-bold ${mode === "reject" ? "text-destructive" : "text-foreground"}`}
                          >
                            Decline
                          </span>
                        </button>
                      </div>

                      {/* Quote Form */}
                      {mode === "quote" && (
                        <form onSubmit={handleSendQuote} className="px-5 pb-5 space-y-4 border-t border-border/60 pt-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="quoteAmt" className="text-xs font-semibold">
                              Quotation Price (₹) <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                                ₹
                              </span>
                              <Input
                                id="quoteAmt"
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="e.g. 25000"
                                value={quoteAmount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setQuoteAmount(val.slice(0, 8));
                                }}
                                className="h-11 pl-8 font-mono rounded-xl border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                              />
                            </div>
                            {quoteAmount && Number(quoteAmount) >= 1 && (
                              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5 flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">Quotation amount</p>
                                <p className="text-base font-extrabold text-primary font-display">
                                  {formatCurrency(Number(quoteAmount))}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="quoteNote" className="text-xs font-semibold">
                              Notes / Terms{" "}
                              <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Textarea
                              id="quoteNote"
                              rows={3}
                              placeholder="e.g., Includes full setup, sound system, 4 hours, travel expenses..."
                              value={quoteNote}
                              onChange={(e) => setQuoteNote(e.target.value)}
                              className="rounded-xl text-sm"
                            />
                          </div>

                          <div className="flex gap-2.5 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setMode("details")}
                              className="flex-1 h-11 text-xs font-semibold rounded-xl"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={sendingQuote}
                              className="flex-1 h-11 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                            >
                              {sendingQuote ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Sending…
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  Send Quotation
                                </span>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Reject Form */}
                      {mode === "reject" && (
                        <form onSubmit={handleReject} className="px-5 pb-5 space-y-4 border-t border-border/60 pt-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="rejectReason" className="text-xs font-semibold">
                              Reason for Declining <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="rejectReason"
                              rows={4}
                              required
                              placeholder="e.g., No available service partners or team for the selected date and location."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="rounded-xl text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              This reason will be shared with the customer via notification.
                            </p>
                          </div>

                          <div className="flex gap-2.5 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setMode("details")}
                              className="flex-1 h-11 text-xs font-semibold rounded-xl"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={rejecting}
                              variant="destructive"
                              className="flex-1 h-11 text-xs font-bold rounded-xl shadow-sm"
                            >
                              {rejecting ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Declining…
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Decline Request
                                </span>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                ) : (
                  /* Non-pending: Summary Card */
                  <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-border/60 flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${statusCfg.className}`}>
                        {(() => {
                          const Icon = statusCfg.icon;
                          return <Icon className={`h-4 w-4 ${statusCfg.iconClass}`} />;
                        })()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Request Resolved</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          This request has already been {request.status === "paid" ? "fulfilled" : request.status}.
                        </p>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-3 text-sm">
                      {request.quotationAmount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Quotation Amount</span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(request.quotationAmount)}
                          </span>
                        </div>
                      )}
                      {request.quotationNote && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            Admin Notes
                          </p>
                          <p className="text-xs text-foreground italic">"{request.quotationNote}"</p>
                        </div>
                      )}
                      {request.paymentId && (
                        <div className="flex items-center justify-between border-t border-border/60 pt-3">
                          <span className="text-muted-foreground text-xs">Payment ID</span>
                          <span className="font-mono text-xs text-foreground">{request.paymentId}</span>
                        </div>
                      )}
                      {request.rejectionReason && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            Decline Reason
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 italic">
                            "{request.rejectionReason}"
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="px-5 pb-5">
                      <Button
                        variant="outline"
                        className="w-full h-10 text-xs font-semibold rounded-xl"
                        onClick={() => navigate("/admin-dashboard/users?tab=custom")}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to All Enquiries
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Info Summary */}
                <div className="rounded-[18px] border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-border/60">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Summary</p>
                  </div>
                  <div className="px-5 py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-semibold text-foreground truncate max-w-[160px] text-right">
                        {request.user?.name || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-semibold text-foreground truncate max-w-[160px] text-right">
                        {request.serviceTitle || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Event Date</span>
                      <span className="font-semibold text-foreground">
                        {new Date(request.eventDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-semibold text-primary">
                        {request.budget > 0 ? formatCurrency(request.budget) : "Unspecified"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Submitted</span>
                      <span className="font-semibold text-foreground">
                        {new Date(request.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomServiceDetail;
