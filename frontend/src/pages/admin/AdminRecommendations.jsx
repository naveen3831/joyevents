import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Calendar, TrendingUp, Loader2, AlertCircle, Eye, BookOpen } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetAdminRecommendationData } from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";

const AdminRecommendations = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGetAdminRecommendationData(token)
      .then((res) => setData(res))
      .catch(() => toast.error("Failed to load recommendation data"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-5 font-sans">
        {/* Page Title & Subtitle */}
        <div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                AI Recommendation Overview
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Platform-wide recommendation activity and top recommended events
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading recommendation metrics...
          </div>
        ) : !data ? null : (
          <div className="space-y-5">
            {/* KPI Cards (4 equal cards in 1 row on desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                {
                  label: "Total Customers",
                  value: data.totalCustomers?.toLocaleString(),
                  icon: Users,
                  color: "text-blue-600 dark:text-blue-400",
                },
                {
                  label: "Total Bookings",
                  value: data.totalBookings?.toLocaleString(),
                  icon: BookOpen,
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Active Events",
                  value: data.totalEvents?.toLocaleString(),
                  icon: Calendar,
                  color: "text-indigo-600 dark:text-indigo-400",
                },
                {
                  label: "Est. Total Reach",
                  value: data.topRecommended
                    ?.reduce((s, e) => s + e.estimatedReach, 0)
                    ?.toLocaleString(),
                  icon: Eye,
                  color: "text-amber-600 dark:text-amber-400",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-border/70 bg-card p-4 flex items-center gap-3.5 h-[95px] shadow-xs min-w-0"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate font-medium">{card.label}</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground truncate mt-0.5">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Recommended Events Card & Table */}
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs w-full">
              <div className="px-4 sm:px-5 py-3.5 border-b border-border/70 flex items-center gap-2 bg-muted/20">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-xs sm:text-sm text-foreground">Top Recommended Events</h2>
              </div>
              {data.topRecommended?.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-xs">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-foreground">No events available</p>
                </div>
              ) : (
                <DataTable minWidth="100%">
                  <TableHeader>
                    <TableHeaderCell className="w-[22%]">Event</TableHeaderCell>
                    <TableHeaderCell className="w-[20%]">Merchant</TableHeaderCell>
                    <TableHeaderCell className="w-[12%]">Category</TableHeaderCell>
                    <TableHeaderCell className="w-[13%] whitespace-nowrap">Date</TableHeaderCell>
                    <TableHeaderCell className="w-[11%]">Attendees</TableHeaderCell>
                    <TableHeaderCell className="w-[11%] whitespace-nowrap">Est. Reach</TableHeaderCell>
                    <TableHeaderCell align="center" className="w-[11%] text-center">Status</TableHeaderCell>
                  </TableHeader>
                  <TableBody>
                    {data.topRecommended.map((event) => (
                      <TableRow key={event._id}>
                        {/* Event Name & Badges */}
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground truncate max-w-[200px]" title={event.title}>
                            {event.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {event.isFeatured && <span className="text-[10px] text-amber-600 font-semibold">⭐ Featured</span>}
                            {event.live && <span className="text-[10px] text-rose-600 font-semibold">🔴 Live</span>}
                          </div>
                        </TableCell>

                        {/* Merchant Details */}
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground truncate max-w-[160px]" title={event.merchant}>
                            {event.merchant}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[160px] font-mono" title={event.merchantEmail}>
                            {event.merchantEmail || "—"}
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                            {event.category || "General"}
                          </span>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {event.datetime
                            ? new Date(event.datetime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </TableCell>

                        {/* Attendees */}
                        <TableCell className="font-semibold text-xs text-foreground">
                          {event.attendeesCount}
                          {event.maxAttendees > 0 && <span className="text-[10px] text-muted-foreground font-normal"> / {event.maxAttendees}</span>}
                        </TableCell>

                        {/* Estimated Reach */}
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1 text-primary font-semibold whitespace-nowrap">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <span>~{event.estimatedReach}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center" className="text-center">
                          <StatusBadge
                            status={event.status === "upcoming" ? "active" : event.status === "ongoing" ? "processing" : "pending"}
                            label={event.status}
                            className="w-[96px] h-[28px] px-0 inline-flex items-center justify-center text-center font-semibold text-[11px] rounded-full border shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              * Estimated reach is calculated from booking patterns and category popularity.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRecommendations;
