import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Search, Filter, MapPin, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiListBookings } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const BOOKING_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "assigned", label: "Assigned" },
  { value: "accepted", label: "Accepted" },
  { value: "processing", label: "Processing" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "awaiting_final_payment", label: "Awaiting Final Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "paid", label: "Paid" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  pending_approval: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  approved: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  assigned: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  accepted: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  processing: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  awaiting_payment: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  awaiting_final_payment: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  confirmed: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  completed: "bg-green-500/15 text-green-400 border border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = BOOKING_STATUS_OPTIONS.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {} as Record<string, string>);

const AdminBookings = () => {
  const { token } = useAuth() as any;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiListBookings(undefined, token);
        const sorted = (res.bookings || []).sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
          const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
          return dateB - dateA;
        });
        setBookings(sorted);
      } catch {
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const filtered = bookings.filter((b) => {
    const name = b.service?.name || b.event?.title || b.serviceName || "";
    const customer = b.customer?.name || b.customer?.email || "";
    const merchant = b.assignedTo?.name || b.assignedTo?.email || "";
    const matchSearch = [name, customer, merchant].some(s =>
      s.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xs sm:text-3xl font-bold truncate">All <span className="text-gradient">Bookings</span></h1>
              <p className="text-muted-foreground text-sm">All bookings from all merchants and customers</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-6 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by service, customer, merchant..."
                value={search}
                maxLength={30}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Statuses</option>
                {BOOKING_STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading bookings...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center border border-border rounded-xl bg-card text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No bookings found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service / Event</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Merchant</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b, idx) => (
                      <tr key={b._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium max-w-[180px]">
                          <div className="truncate">{b.service?.name || b.event?.title || b.serviceName || "—"}</div>
                          <div className="mt-0.5">
                            {b.service
                              ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Service</span>
                              : b.event
                              ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Event</span>
                              : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{b.customer?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{b.customer?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {b.assignedTo ? (
                            <>
                              <div className="font-medium">{b.assignedTo.name}</div>
                              <div className="text-xs text-muted-foreground">{b.assignedTo.email}</div>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          {b.customerLocation?.address ? (
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs leading-snug line-clamp-2">{b.customerLocation.address}</p>
                                {b.customerLocation.latitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${b.customerLocation.latitude},${b.customerLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                  >
                                    Maps <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : b.event?.location ? (
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <p className="text-xs leading-snug line-clamp-2">{b.event.location}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">{formatCurrency(b.price)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          <div>{new Date(b.datetime).toLocaleDateString()}</div>
                          <div>{new Date(b.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[b.status] || "bg-secondary text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            b.paymentStatus === "paid" ? "bg-green-500/15 text-green-400" :
                            b.paymentStatus === "refunded" ? "bg-orange-500/15 text-orange-400" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {b.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </AdminLayout>
  );
};

export default AdminBookings;

