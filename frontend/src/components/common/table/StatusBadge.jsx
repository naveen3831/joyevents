import React from "react";

const STATUS_MAP = {
  // Account Statuses
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  deactivated: { label: "Deactivated", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  inactive: { label: "Inactive", className: "bg-secondary text-muted-foreground border-border" },

  // Booking & Order Statuses
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  approved: { label: "Approved", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  assigned: { label: "Assigned", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  accepted: { label: "Accepted", className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  processing: { label: "Processing", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
  awaiting_final_payment: { label: "Awaiting Final Payment", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  paid: { label: "Paid", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  unpaid: { label: "Unpaid", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  completed: { label: "Completed", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  refunded: { label: "Refunded", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  rejected: { label: "Rejected", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },

  // Role Badges
  admin: { label: "Admin", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  merchant: { label: "Merchant", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  customer: { label: "Customer", className: "bg-secondary text-foreground border-border" },
  user: { label: "User", className: "bg-secondary text-foreground border-border" },
};

export const StatusBadge = ({ status, label: customLabel, className = "" }) => {
  if (!status) return null;
  const key = String(status).toLowerCase().trim();
  const config = STATUS_MAP[key] || {
    label: customLabel || key.replace(/_/g, " "),
    className: "bg-secondary text-muted-foreground border-border",
  };

  const displayText = customLabel || config.label;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-2xs whitespace-nowrap capitalize ${config.className} ${className}`}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;
