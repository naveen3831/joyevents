import React from "react";

const STATUS_MAP = {
  // Account Statuses
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  deactivated: { label: "Deactivated", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  inactive: { label: "Inactive", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  suspended: { label: "Suspended", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },

  // Booking & Order Statuses
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  approved: { label: "Approved", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  assigned: { label: "Assigned", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  accepted: { label: "Accepted", className: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20" },
  processing: { label: "Processing", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  awaiting_final_payment: { label: "Awaiting Final Payment", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  partially_paid: { label: "Partially Paid", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  unpaid: { label: "Unpaid", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  refunded: { label: "Refunded", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  failed: { label: "Failed", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },

  // Role Badges
  admin: { label: "Admin", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-semibold" },
  merchant: { label: "Merchant", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-semibold" },
  customer: { label: "Customer", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 font-semibold" },
  user: { label: "User", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 font-semibold" },

  // Event / Service Badges
  live: { label: "Live", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-semibold" },
  upcoming: { label: "Upcoming", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  ongoing: { label: "Ongoing", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  event: { label: "Event", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  service: { label: "Service", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  published: { label: "Published", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

export const StatusBadge = ({ status, label: customLabel, className = "" }) => {
  if (!status) return null;
  const key = String(status).toLowerCase().trim();
  const config = STATUS_MAP[key] || {
    label: customLabel || key.replace(/_/g, " "),
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };

  const displayText = customLabel || config.label;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border shadow-none whitespace-nowrap capitalize ${config.className} ${className}`}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;
