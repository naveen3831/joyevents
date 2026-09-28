import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UserX, ShieldAlert, ArrowLeft, Clock, Mail, CheckCircle2, AlertTriangle, Lock, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { usePlatformName } from "@/hooks/usePlatformName";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/lib/config";
import { apiDeleteSelfAccount } from "@/lib/api";
import { toast } from "sonner";

const AccountDeletion = () => {
  const settings = useHomepageSettings();
  const platformName = usePlatformName();
  const navigate = useNavigate();
  const { isLoggedIn, user, token, logout } = useAuth();

  // State for in-app deletion (if logged in)
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // State for request form (if not logged in)
  const [requestEmail, setRequestEmail] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Handle self-service deletion when logged in
  const handleDeleteSelfAccount = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter your current password to confirm deletion.");
      return;
    }
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm account deletion.");
      return;
    }

    setIsDeleting(true);
    try {
      await apiDeleteSelfAccount(password, token);
      toast.success("Your account has been deleted successfully.");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err?.message || "Failed to delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle deletion request form submission when not logged in
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestEmail || !requestEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Send request message to admin API
      const res = await fetch(`${API_URL}/api/contact/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Account Deletion Request",
          email: requestEmail,
          subject: `Account Deletion Request for ${requestEmail}`,
          message: `Account Deletion Request for ${requestEmail}.\nReason: ${requestReason || "User requested account deletion via public Web portal."}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit request. Please email support directly.");
      }

      setRequestSubmitted(true);
      toast.success("Account deletion request submitted successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border bg-card"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>

        {/* Hero Section */}
        <div className="border-b border-border pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 dark:text-rose-400 mb-3">
            <UserX className="h-3.5 w-3.5" /> Account & Data Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Account Deletion
          </h1>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Permanent Removal & Data Erasure Policy
          </p>
        </div>

        {/* Informational Guidance Cards */}
        <div className="space-y-6 text-foreground/90 text-sm leading-relaxed">
          <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
            <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> What happens when you delete your account?
            </h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Deleting your account is permanent. Once deleted, you will immediately lose access to your profile, digital event tickets, booking history, and active wallet balance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Data Purged Immediately
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Account profile, name, email & phone</li>
                <li>Saved favorites & cart items</li>
                <li>Firebase Push notification registration tokens</li>
                <li>Merchant business listings & custom settings</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" /> Statutory Retention
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Financial transaction receipts (retained for tax/audit rules)</li>
                <li>Completed booking invoices & withdrawal audit logs</li>
              </ul>
            </div>
          </div>

          {/* SECTION A: Logged In Self-Deletion Flow */}
          {isLoggedIn ? (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6 mt-8">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-rose-500" /> Self-Service Account Deletion
                </h3>
                <p className="text-xs text-muted-foreground">
                  You are currently logged in as <strong>{user?.email}</strong>. Enter your password to permanently delete your account.
                </p>
              </div>

              <form onSubmit={handleDeleteSelfAccount} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Current Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Type <span className="font-extrabold text-rose-500">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDeleting || confirmText.trim().toUpperCase() !== "DELETE"}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <UserX className="h-4 w-4" />
                  {isDeleting ? "Deleting Account..." : "Permanently Delete My Account"}
                </button>
              </form>
            </div>
          ) : (
            /* SECTION B: Non-logged in Request Flow */
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6 mt-8">
              {/* Sign in Prompt for Quick Self-Deletion */}
              <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" /> Sign in to delete your account
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If you have an active account, sign in to perform instant self-service account deletion from your profile security settings.
                  </p>
                </div>
                <Link
                  to="/login?redirect=/account-deletion"
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  Sign In to Delete Account →
                </Link>
              </div>

              <div className="space-y-1 pt-2">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" /> Or Request Account Deletion via Form
                </h3>
                <p className="text-xs text-muted-foreground">
                  If you cannot log into the mobile app or website, submit an account deletion request below. Our support team will verify your ownership and process the deletion within 48 hours.
                </p>
              </div>

              {requestSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold space-y-1">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Deletion Request Submitted Successfully!</p>
                  <p className="text-muted-foreground font-normal">
                    We have received your deletion request for <strong>{requestEmail}</strong>. A confirmation email will be sent once processed.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Registered Account Email</label>
                    <input
                      type="email"
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Reason for Deletion (Optional)</label>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Tell us why you want to delete your account..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {isSubmittingRequest ? "Submitting Request..." : "Submit Deletion Request"}
                  </button>
                </form>
              )}

              <div className="pt-2 text-xs text-muted-foreground">
                Alternatively, you may email your account deletion request directly to{" "}
                <a href={`mailto:${settings.contactEmail}`} className="text-primary font-semibold hover:underline">
                  {settings.contactEmail}
                </a>{" "}
                from your registered email address.
              </div>
            </div>
          )}

        </div>

        {/* Footer links sub-nav */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground justify-between items-center">
          <p>© 2026 {platformName}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountDeletion;
