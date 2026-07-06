import { motion } from "framer-motion";
import { Users, CheckCircle, AlertTriangle, Search, Filter, UserX, UserCheck, KeyRound } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { apiCreateUser, apiListUsers, apiUpdateUser, apiDeleteUser, apiResetPassword } from "@/lib/api";
import {
  sanitizeEmailInput,
  validateEmail,
  validateSignupForm,
  validateNewPasswordForm,
  EMAIL_HINT,
  PASSWORD_HINT,
  EMAIL_MAX_LENGTH,
} from "@/lib/validation";

type UserData = { _id: string; name: string; email: string; role: string; createdAt: string; status?: string; events?: number };

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{ id: string; name: string; email: string } | null>(null);

  const [formState, setFormState] = useState({ id: "", name: "", email: "", password: "", role: "merchant" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const loadUsers = async () => {
    if (!token) return;
    try {
      const res = await apiListUsers(token);
      setUsers(res.users || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const handleOpenCreate = () => {
    setFormState({ id: "", name: "", email: "", password: "", role: "merchant" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setFormState({ id: user._id, name: user.name, email: user.email, password: "", role: user.role });
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
          role: formState.role
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
        await apiCreateUser({ name: formState.name, email: formState.email, password: formState.password, role: formState.role }, token);
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
            <p className="text-muted-foreground text-sm mt-1">Manage all platform users and merchants</p>
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
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 align-middle font-medium">{u.name}</td>
                  <td className="px-4 py-3 align-middle text-muted-foreground">{u.email}</td>
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
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>

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

      </section>
    </AdminLayout>
  );
};

export default AdminUsers;

