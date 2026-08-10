import { formatCurrency } from "@/lib/utils";
import { Trash2, Pencil, Plus, ImageIcon, Loader2, AlertCircle, Ticket } from "lucide-react";
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
          </div>) : (<div ref={gridRef} className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (<div key={ev._id} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-card transition-all">
                <div className="relative overflow-hidden bg-secondary flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-44">
                  {imgSrc(ev.image) ? (<img src={imgSrc(ev.image)} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                      <ImageIcon className="h-12 w-12 opacity-30"/>
                    </div>)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"/>
                  <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {ev.category}
                  </span>
                  <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur-sm ${ev.status === "upcoming" ? "bg-blue-500/70 text-white" : ev.status === "ongoing" ? "bg-green-500/70 text-white" : "bg-gray-500/70 text-white"}`}>
                    {ev.status}
                  </span>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={() => navigate(`/admin-dashboard/my-events/${ev._id}/edit`)} title="Edit event" className="rounded-full bg-black/60 p-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                      <Pencil className="h-4 w-4"/>
                    </button>
                    <button onClick={() => handleDelete(ev._id)} disabled={deletingId === ev._id} title="Delete event" className="rounded-full bg-black/60 p-2 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
                      {deletingId === ev._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-sm sm:text-base line-clamp-1">{ev.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{ev.location}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ev.datetime).toLocaleString()}</p>

                  {ev.eventType === "ticketed" && (<div className="mt-3 border-t border-border pt-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                        <Ticket className="h-3 w-3"/> Tickets Booked:
                      </p>
                      {(() => {
                        const allTickets = [];
                        if (ev.hasMultipleSessions && ev.sessions) {
                            ["day", "night"].forEach((s) => {
                                if (ev.sessions[s]?.enabled && ev.sessions[s]?.tickets) {
                                    ev.sessions[s].tickets.forEach((t) => {
                                        const existing = allTickets.find((x) => x.type === t.type);
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
                        const totalAvailable = allTickets.reduce((s, t) => s + t.available, 0);
                        return (<>
                            <div className="flex items-center gap-1 text-xs mb-1">
                              <span className="font-semibold text-primary">{totalSold}</span>
                              <span className="text-muted-foreground">/ {totalAvailable} total</span>
                              {totalSold >= totalAvailable && totalAvailable > 0 && <span className="ml-1 text-destructive font-semibold">Sold Out</span>}
                            </div>
                            {allTickets.map((t) => {
                                const remaining = t.available - t.sold;
                                return (<div key={t.type} className="flex items-center justify-between text-xs">
                                  <span className="capitalize text-muted-foreground">{t.type}:</span>
                                  <span className={remaining <= 0 ? "text-destructive font-semibold" : "text-tint-mint-fg font-semibold"}>
                                    {t.sold}/{t.available} {remaining <= 0 ? "· Sold Out" : `· ${remaining} left`}
                                  </span>
                                </div>);
                            })}
                          </>);
                    })()}
                    </div>)}

                  {ev.eventType === "fullService" && (<div className="mt-2 flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">👥 Attendees:</span>
                      <span className="font-semibold text-primary">{ev.attendeesCount || 0}</span>
                      {ev.maxAttendees > 0 && <span className="text-muted-foreground">/ {ev.maxAttendees}</span>}
                    </div>)}

                  <div className="flex-1"/>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
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
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin-dashboard/my-events/${ev._id}/edit`)} className="h-7 text-xs">
                      <Pencil className="h-3 w-3 mr-1"/> Edit
                    </Button>
                  </div>
                </div>
              </div>))}
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminMyEvents;
