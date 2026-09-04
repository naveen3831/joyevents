import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Calendar, Wrench, Save } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListUsers, apiActivateMerchant } from "@/lib/api";

const AdminUserLimits = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [maxEvents, setMaxEvents] = useState("5");
  const [maxServices, setMaxServices] = useState("5");
  const [submitting, setSubmitting] = useState(false);

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
          setMaxEvents(found.maxEvents?.toString() || "5");
          setMaxServices(found.maxServices?.toString() || "5");
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
    const eventsNum = parseInt(maxEvents, 10);
    const servicesNum = parseInt(maxServices, 10);
    if (isNaN(eventsNum) || eventsNum < 1 || isNaN(servicesNum) || servicesNum < 1) {
      toast.error("Please enter valid limits (minimum 1).");
      return;
    }

    setSubmitting(true);
    try {
      await apiActivateMerchant(user._id, { maxEvents: eventsNum, maxServices: servicesNum }, token);
      toast.success("Merchant slot limits updated successfully!");
      navigate(`/admin-dashboard/users/${user._id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to update limits");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[850px] mx-auto space-y-4 font-sans">
        <PageHeader
          title="Configure Merchant Limits"
          subtitle="Set slot limits for maximum events and services allowed on the platform."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "User Management", to: "/admin-dashboard/users" },
            { label: user ? user.name : "User Details", to: `/admin-dashboard/users/${id}` },
            { label: "Configure Limits" },
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
              The merchant account does not exist or has been removed.
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
            <div className="flex items-center gap-3 pb-4 border-b border-border/60">
              <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Configure Merchant Slot Limits - {user.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Set the maximum number of events and services this merchant account can create.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="maxEv" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Maximum Events Limit *
                  </Label>
                  <Input
                    id="maxEv"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(e.target.value)}
                    className="h-11 text-sm rounded-lg w-full"
                  />
                  <p className="text-[11px] text-muted-foreground">Number of active event listings permitted</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxSe" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-primary" /> Maximum Services Limit *
                  </Label>
                  <Input
                    id="maxSe"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={maxServices}
                    onChange={(e) => setMaxServices(e.target.value)}
                    className="h-11 text-sm rounded-lg w-full"
                  />
                  <p className="text-[11px] text-muted-foreground">Number of service offerings permitted</p>
                </div>
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
                  disabled={submitting}
                  className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Limits...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Limits
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

export default AdminUserLimits;
