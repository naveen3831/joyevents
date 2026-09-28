import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiDeleteSelfAccount } from "@/lib/api";

const DeleteAccountModal = ({ isOpen, onClose, userRole = "customer" }) => {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter your current password to confirm identity.");
      return;
    }
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setLoading(true);
    try {
      await apiDeleteSelfAccount(password, token);
      toast.success("Your account has been deleted successfully.");
      logout();
      onClose();
      navigate("/");
    } catch (err) {
      toast.error(err?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete your account?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Explanation Warning */}
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2 text-xs text-destructive-foreground">
            <p className="font-medium leading-relaxed">
              This action may permanently delete your account and associated personal data. Some transaction or legally required records may need to be retained according to the Privacy Policy.
            </p>
            {userRole === "merchant" && (
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-destructive/20">
                Note: Merchant accounts with active client bookings or unwithdrawn wallet balances cannot be deleted until all transactions are settled.
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Confirm Password *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  disabled={loading}
                  className="h-11 pr-10 rounded-xl bg-background border-border text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Type <span className="text-destructive font-extrabold">DELETE</span> to confirm *
              </Label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                required
                disabled={loading}
                className="h-11 rounded-xl bg-background border-border text-xs sm:text-sm tracking-wider font-mono"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading || confirmText.trim().toUpperCase() !== "DELETE" || !password.trim()}
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteAccountModal;
