import { formatCurrency } from "@/lib/utils";
import {
  ImageIcon,
  Loader2,
  AlertCircle,
  Ticket,
  MapPin,
  CalendarDays,
  Store,
  Eye,
  Plus,
  ToggleLeft,
  ToggleRight,
  Video,
  Pencil,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import ActionMenu from "@/components/common/ActionMenu";
import TableToolbar from "@/components/common/table/TableToolbar";
import StatusBadge from "@/components/common/table/StatusBadge";
import DataTable, { TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
import TableEmptyState from "@/components/common/table/TableEmptyState";
import TableSkeleton from "@/components/common/table/TableSkeleton";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiListEvents, apiUpdateEvent } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const imgSrc = (image) => (!image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`);

const getEventTickets = (ev) =>
  ev.hasMultipleSessions
    ? [...(ev.sessions?.day?.tickets || []), ...(ev.sessions?.night?.tickets || [])]
    : ev.tickets || [];

const getEventPriceLabel = (ev) => {
  if (ev.eventType !== "ticketed") return formatCurrency(ev.price);
  const prices = getEventTickets(ev)
    .map((t) => t.price)
    .filter((p) => p > 0);
  if (prices.length === 0) return "Free";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const AdminEvents = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialFilter =
    queryParams.get("filter") ||
    queryParams.get("status") ||
    (queryParams.get("live") === "true" ? "live" : "all");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [togglingLiveId, setTogglingLiveId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const f =
      params.get("filter") ||
      params.get("status") ||
      (params.get("live") === "true" ? "live" : "all");
    if (f) setFilter(f);
  }, [location.search]);

  const loadEvents = async () => {
    try {
      const eventsRes = await apiListEvents().catch(() => ({ events: [] }));
      setEvents(eventsRes.events || []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleToggleLive = async (ev) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    const newLiveState = !ev.live;
    setTogglingLiveId(ev._id);
    try {
      await apiUpdateEvent(ev._id, { live: newLiveState }, token);
      setEvents((prev) =>
        prev.map((item) =>
          item._id === ev._id ? { ...item, live: newLiveState } : item
        )
      );
      if (newLiveState) {
        toast.success("Event is now Live");
      } else {
        toast.success("Event removed from Live Events");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to update Live status");
    } finally {
      setTogglingLiveId(null);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const title = ev.title || "";
    const locationStr = ev.location || "";
    const category = ev.category || "";
    const merchant = ev.createdBy?.name || ev.createdBy?.email || "";
    const matchSearch = [title, locationStr, category, merchant].some((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );

    let matchFilter = true;
    if (filter === "live") {
      matchFilter = ev.live === true;
    } else if (filter !== "all") {
      matchFilter = ev.status === filter;
    }

    return matchSearch && matchFilter;
  });

  const hasActiveFilters = filter !== "all" || search.trim() !== "";

  return (
    <AdminLayout>
      <div className="w-full min-w-0 space-y-5">
        <PageHeader
          title={filter === "live" ? "Live Event Streams" : "All Platform Events"}
          subtitle="Monitor, filter, and manage events published by merchants across the platform."
          breadcrumbs={[{ label: "Admin Portal" }, { label: "Events" }]}
          actions={
            <Button
              size="sm"
              onClick={() => navigate("/admin-dashboard/my-events/new")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-3.5"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Event
            </Button>
          }
        />

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, location, merchant..."
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setFilter("all");
            setSearch("");
          }}
          filters={
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="all">All Statuses</option>
                <option value="live">🔴 Live Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          }
        />

        {loading ? (
          <TableSkeleton columns={7} rows={6} minWidth="100%" />
        ) : filteredEvents.length === 0 ? (
          <DataTable minWidth="100%">
            <TableBody>
              <TableRow>
                <TableCell colSpan={7}>
                  <TableEmptyState
                    title="No events found"
                    description="No events match your current filter or search criteria."
                    actionLabel="Clear Filters"
                    onAction={() => {
                      setFilter("all");
                      setSearch("");
                    }}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </DataTable>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto md:overflow-x-hidden w-full no-scrollbar">
              <table className="w-full text-xs border-collapse min-w-[780px] md:min-w-full" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="bg-muted/40 border-b border-border/70">
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "25%" }}>Event</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "12%" }}>Category</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "15%" }}>Organizer</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "11%" }}>Price</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "20%" }}>Date & Location</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-left align-middle" style={{ width: "11%" }}>Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider text-center align-middle" style={{ width: "6%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvents.map((ev) => {
                    const image = imgSrc(ev.image);
                    const isToggling = togglingLiveId === ev._id;
                    return (
                      <tr key={ev._id} className="hover:bg-muted/30 transition-colors" style={{ height: "72px" }}>
                        {/* Event */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/60 flex items-center justify-center">
                              {image ? (
                                <img src={image} alt={ev.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-foreground truncate" title={ev.title}>
                                {ev.title}
                              </p>
                              {ev.live && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                                  LIVE NOW
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium border border-border/40 whitespace-nowrap max-w-full truncate">
                            {ev.category || "General"}
                          </span>
                        </td>

                        {/* Organizer */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium min-w-0">
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{ev.createdBy?.name || "Merchant"}</span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 align-middle">
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {getEventPriceLabel(ev)}
                          </span>
                        </td>

                        {/* Date & Location */}
                        <td className="px-4 py-3 align-middle">
                          <div className="space-y-1 text-xs text-muted-foreground min-w-0">
                            <p className="flex items-center gap-1.5 min-w-0">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{ev.location || "—"}</span>
                            </p>
                            <p className="flex items-center gap-1.5 min-w-0">
                              <CalendarDays className="h-3 w-3 shrink-0" />
                              <span className="whitespace-nowrap">
                                {ev.datetime
                                  ? new Date(ev.datetime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                  : "—"}
                              </span>
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 align-middle">
                          <StatusBadge
                            status={ev.live ? "live" : ev.status}
                            className="w-[88px] min-w-[88px] h-[28px] px-0"
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 align-middle text-center">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const createdRole = ev.createdByRole || (typeof ev.createdBy === "object" ? ev.createdBy?.role : null);
                              const isCreatedByAdmin = createdRole === "admin" || ev.permissions?.canEdit === true;
                              const menuItems = [
                                {
                                  label: "View Event",
                                  icon: Eye,
                                  onClick: () => navigate(`/admin-dashboard/events/${ev._id}`),
                                }
                              ];
                              if (isCreatedByAdmin) {
                                menuItems.push({
                                  label: isToggling
                                    ? "Updating..."
                                    : ev.live
                                    ? "Stop Live"
                                    : "Go Live",
                                  icon: ev.live ? ToggleRight : ToggleLeft,
                                  disabled: isToggling,
                                  onClick: () => handleToggleLive(ev),
                                });
                              }
                              return <ActionMenu items={menuItems} />;
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
