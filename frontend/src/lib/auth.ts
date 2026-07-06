import { UserRole } from "@/contexts/AuthContext";

export const dashboardPaths: Record<UserRole, string> = {
  customer: "/customer-dashboard",
  merchant: "/merchant-dashboard",
  admin: "/admin-dashboard",
};

export const roleLabels: Record<UserRole, string> = {
  customer: "Customer",
  merchant: "Merchant",
  admin: "Admin",
};
