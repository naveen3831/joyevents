import { formatCurrency } from "@/lib/utils";
import { Trash2, Pencil, Plus, ImageIcon, Loader2, AlertCircle, Ticket, Calendar, MapPin, Eye } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useGsapStagger } from "@/lib/gsapAnimations";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiListMyEvents, apiDeleteEvent } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const AdminMyEvents = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const loadEvents = async () => {
        try {
            const eventsRes = await apiListMyEvents(token).catch(() => ({ events: [] }));
            setEvents(eventsRes.events || []);
        }
        catch {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadEvents(); }, []);

    const handleDelete = async (id) => {
        if (!confirm("Delete this event?"))
            return;
        setDeletingId(id);
        try {
            await apiDeleteEvent(id, token);
            toast.success("Event deleted");
            loadEvents();
        }
        catch (e) {
            toast.error(e?.message || "Failed to delete event");
        }
        finally {
            setDeletingId(null);
        }
    };

    const gridRef = useGsapStagger([events, loading]);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              My <span className="text-gradient">Events</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your created events — edit or delete only what you own</p>
          </div>
          <Button onClick={() => navigate("/admin-dashboard/my-events/new")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow min-h-[44px]">
            <Plus className="mr-2 h-4 w-4"/> Add Event
          </Button>
        </div>

        {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading…
          </div>) : events.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-30"/>
            <p className="text-muted-foreground">No events yet. Create your first event to get started. Only your events are shown here.</p>
          </div>) : (<div ref={gridRef} className="grid grid-cols-1 xs:grid-cols-2 gap-6 lg:grid-cols-3">
            {events.map((ev) => {
              const itemName = ev.title;
              const formattedDate = ev.datetime
                ? new Date(ev.datetime).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : null;
              const formattedTime = ev.datetime
                ? new Date(ev.datetime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              const allTickets = [];
              if (ev.hasMultipleSessions && ev.sessions) {
                  ["day", "night"].forEach((s) => {
                      if (ev.sessions[s]?.enabled && ev.sessions[s]?.tickets) {
                          ev.sessions[s].tickets.forEach((t) => {
                              const existing = allTickets.find(x => x.type === t.type);
                              if (existing) {
                                  existing.available += t.available || 0;
                                  existing.sold += t.sold || 0;
                              }
                              else
                                  allTickets.push({ type: t.type, available: t.available || 0, sold: t.sold || 0 });
                          });
                      }
                  });
              }
              else if (ev.tickets?.length) {
                  ev.tickets.forEach((t) => allTickets.push({ type: t.type, available: t.available || 0, sold: t.sold || 0 }));
              }
              const totalSold = allTickets.reduce((s, t) => s + t.sold, 0);
              const totalCapacity = allTickets.reduce((s, t) => s + t.available, 0);

              return (
                <div
                  key={ev._id}
                  onClick={() => navigate(`/admin-dashboard/events/${ev._id}`)}
                  className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-secondary flex-shrink-0 h-[180px] w-full">
                    {imgSrc(ev.image) ? (<img src={imgSrc(ev.image)} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                        <ImageIcon className="h-10 w-10 opacity-30"/>
                      </div>)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"/>
                    <span className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize backdrop-blur-md shadow-xs ${ev.status === "upcoming" ? "bg-blue-500/80 text-white" : ev.status === "ongoing" ? "bg-green-500/80 text-white" : "bg-gray-500/80 text-white"}`}>
                      {ev.status}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {ev.category}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1 min-w-0 justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-base text-foreground line-clamp-2 h-[44px] leading-tight" title={itemName}>{itemName}</h3>
                      
                      {/* Date & Location Metadata */}
                      <div className="space-y-[6px] text-xs text-muted-foreground mt-2.5">
                        {formattedDate && (
                          <div className="flex items-center gap-1.5 h-[18px]">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{formattedDate} at {formattedTime}</span>
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1.5 h-[18px]" title={ev.location}>
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                        {/* Summary Line */}
                        {ev.eventType === "ticketed" ? (
                          <div className="flex items-center gap-1.5 h-[18px]">
                            <Ticket className="h-3.5 w-3.5 text-primary shrink-0"/>
                            <span className="truncate">
                              Tickets Booked: <span className="font-semibold text-foreground">{totalSold}</span> / {totalCapacity}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 h-[18px]">
                            <span className="text-primary shrink-0">👥</span>
                            <span className="truncate">
                              Attendees: <span className="font-semibold text-foreground">{ev.attendeesCount || 0}</span>
                              {ev.maxAttendees > 0 && ` / ${ev.maxAttendees}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-h-[12px]"/>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-bold text-primary">
                        {ev.eventType === "ticketed"
                      ? (() => {
                          const allPrices = [];
                          if (ev.hasMultipleSessions && ev.sessions) {
                              ["day", "night"].forEach((s) => { if (ev.sessions[s]?.enabled)
                                  ev.sessions[s].tickets?.forEach((t) => { if (t.price > 0)
                                      allPrices.push(t.price); }); });
                          }
                          else {
                              (ev.tickets || []).forEach((t) => { if (t.price > 0)
                                  allPrices.push(t.price); });
                          }
                          if (!allPrices.length)
                              return "Free";
                          const min = Math.min(...allPrices), max = Math.max(...allPrices);
                          return min === max ? `${formatCurrency(min)}` : `${formatCurrency(min)} – ${formatCurrency(max)}`;
                      })()
                      : `${formatCurrency(ev.price)}`}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ev.status === "upcoming" ? "bg-blue-500/15 text-blue-400" : ev.status === "ongoing" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}`}>
                        {ev.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2 border-t border-border/50 pt-2.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-[36px] rounded-xl font-semibold border-border/80 hover:bg-secondary text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin-dashboard/my-events/${ev._id}/edit`);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3"/> Edit Event
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-white hover:bg-red-500 shrink-0 h-[36px] w-[36px] p-0 rounded-xl cursor-pointer"
                        disabled={deletingId === ev._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ev._id);
                        }}
                      >
                        {deletingId === ev._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminMyEvents;
