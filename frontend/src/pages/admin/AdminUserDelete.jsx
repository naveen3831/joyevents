import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Loader2, AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListUsers, apiDeleteUser } from "@/lib/api";

const AdminUserDelete = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        } else {
          setError("User not found.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load user details");
        toast.error(err?.message || "Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, token]);

  const handleDelete = async () => {
    if (!token || !user) return;
    try {
      setIsDeleting(true);
      await apiDeleteUser(user._id, token);
      toast.success(`${user.role === "merchant" ? "Merchant" : "User"} account deleted successfully`);
      navigate("/admin-dashboard/users");
    } catch (err) {
      toast.error(err?.message || "Failed to delete user account");
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[850px] mx-auto space-y-4 font-sans">
        <PageHeader
          title="Delete Account Confirmation"
          subtitle="Permanently remove this account and all associated platform data."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: user ? user.name : "User Details", to: `/admin-dashboard/users/${id}` },
            { label: "Delete Account" },
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
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading user details...
          </div>
        ) : error || !user ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-muted-foreground shadow-xs">
            <AlertCircle className="mx-auto mb-2.5 h-9 w-9 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground mb-1">{error || "User Not Found"}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The account requested for deletion does not exist or has already been deleted.
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
            className="bg-card border border-rose-200 dark:border-rose-900/60 rounded-xl shadow-sm p-6 sm:p-8 w-full space-y-6"
          >
            {/* Warning Banner */}
            <div className="flex items-center gap-3 pb-4 border-b border-rose-200/60 dark:border-rose-900/40">
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  Delete Account - {user.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Warning: This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            {/* User Account Info Card */}
            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200/70 dark:border-rose-900/40 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-rose-200/40 dark:border-rose-900/30">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-semibold text-foreground">{user.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-rose-200/40 dark:border-rose-900/30">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-semibold text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-rose-200/40 dark:border-rose-900/30">
                <span className="text-muted-foreground">Account Role</span>
                <span className="font-semibold text-foreground capitalize">{user.role}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[11px] text-foreground">{user._id}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this {user.role === "merchant" ? "merchant" : "user"} account? All associated profile information, permissions, and platform history will be permanently deleted.
            </p>

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
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-10 px-6 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserDelete;
