import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, IndianRupee, Loader2, AlertCircle, Send, Store, Mail, User } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListUsers, apiSendMerchantQuotation } from "@/lib/api";

const AdminUserSendQuote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await apiListUsers(token);
        const found = (res.users || []).find((u) => u._id === id || u.id === id);
        if (found) {
          setUser(found);
          setQuoteAmount(found.quotationAmount?.toString() || "");
        } else {
          setError("Merchant not found.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load merchant details");
        toast.error(err?.message || "Failed to load merchant details");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, token]);

  const handleSubmit = async (e) => {
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
      toast.success("Onboarding quotation sent successfully!");
      navigate(`/admin-dashboard/users/${user._id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to send quotation");
    } finally {
      setSendingQuote(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[850px] mx-auto space-y-4 font-sans">
        <PageHeader
          title="Send Onboarding Quotation"
          subtitle="Set the setup fee amount for this merchant before activation."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: user ? user.name : "User Details", to: `/admin-dashboard/users/${id}` },
            { label: "Send Quotation" },
          ]}
          className="!mb-4"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin-dashboard/users/${id}`)}
              className="h-9 text-xs font-semibold rounded-md gap-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to User Details
            </Button>
          }
        />

        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl p-16 flex items-center justify-center text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading merchant details...
          </div>
        ) : error || !user ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "Merchant Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The merchant account you are trying to send a quotation to does not exist.
            </p>
            <Button
              onClick={() => navigate("/admin-dashboard/users")}
              className="h-9 text-xs font-semibold bg-primary text-primary-foreground rounded-md"
            >
              Return to Users & Merchants
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 w-full space-y-6"
          >
            {/* Header / Merchant Info Banner */}
            <div className="flex items-center gap-3 pb-4 border-b border-border/60">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Send Onboarding Quotation
                </h2>
                <p className="text-xs text-muted-foreground">
                  Set the setup fee amount for this merchant. The merchant will pay this amount before activation.
                </p>
              </div>
            </div>

            {/* Merchant Details Box */}
            <div className="p-4 bg-muted/40 rounded-lg border border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground/70" /> Merchant Name
                </span>
                <span className="font-semibold text-foreground">{user.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground/70" /> Email Address
                </span>
                <span className="font-semibold text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-muted-foreground/70" /> Business Name
                </span>
                <span className="font-semibold text-foreground">{user.merchantDetails?.businessName || "N/A"}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="qAmount" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-primary" /> Quotation Amount (in ₹) *
                </Label>
                <div className="relative">
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
                    className="h-11 text-sm rounded-lg w-full pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    ₹
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Enter a positive number (up to 1,000,000)</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin-dashboard/users/${user._id}`)}
                  className="h-10 px-5 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendingQuote}
                  className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2"
                >
                  {sendingQuote ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Quote...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Quote
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserSendQuote;
