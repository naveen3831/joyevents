import { motion } from "framer-motion";
import { Trash2, AlertTriangle, Loader2, Settings } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiDeleteAdminEvents } from "@/lib/api";
import { toast } from "sonner";

const AdminUtilities = () => {
  const { token } = useAuth() as any;
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAdminEvents = async () => {
    if (!confirm("⚠️ DANGER: Are you sure you want to delete ALL admin-created events?\n\nThis will permanently remove all events created by admin users from the entire system.\n\nThis action cannot be undone!")) {
      return;
    }
    
    // Double confirmation
    if (!confirm("This is your final confirmation. Type 'DELETE' in the next prompt to proceed.")) {
      return;
    }

    const confirmation = prompt("Type 'DELETE' to confirm deletion of all admin events:");
    if (confirmation !== "DELETE") {
      toast.error("Deletion cancelled - confirmation text did not match");
      return;
    }
    
    setDeleting(true);
    try {
      const result = await apiDeleteAdminEvents(token);
      toast.success(result.message);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete admin events");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <h1 className="font-display text-xs sm:text-3xl font-bold flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              Admin <span className="text-gradient">Utilities</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">System maintenance and cleanup tools</p>
          </div>

          {/* Danger Zone */}
          <div className="max-w-2xl">
            <div className="border-2 border-red-500/30 rounded-xl p-6 bg-red-500/5">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                    Danger Zone
                  </h2>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    These actions are irreversible and will permanently affect the system data.
                  </p>
                </div>
              </div>

              <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/10">
                <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All Admin-Created Events
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  This will permanently delete all events that were created by admin users across the entire platform. 
                  This includes events in all merchant dashboards, customer views, and booking systems.
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 mb-4 space-y-1">
                  <li>• Removes events from all user interfaces</li>
                  <li>• Affects existing bookings for admin-created events</li>
                  <li>• Cannot be undone once executed</li>
                  <li>• Merchant-created events will remain untouched</li>
                </ul>
                
                <Button
                  variant="destructive"
                  onClick={handleDeleteAdminEvents}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 border-red-500"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting Admin Events...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Admin Events
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 max-w-2xl">
            <div className="border border-border rounded-xl p-6 bg-card">
              <h3 className="font-semibold mb-2">How it works</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. The system identifies all users with "admin" role</p>
                <p>2. Finds all events where createdBy matches admin user IDs</p>
                <p>3. Permanently deletes those events from the database</p>
                <p>4. Events created by merchants remain completely unaffected</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </AdminLayout>
  );
};

export default AdminUtilities;
