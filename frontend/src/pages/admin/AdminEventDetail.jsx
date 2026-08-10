import { formatCurrency } from "@/lib/utils";
import { ImageIcon, Loader2, AlertCircle, Ticket, MapPin, CalendarDays, Store, Mail, Phone, Tag, Users2, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiGetEventById } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const getEventTickets = (ev) => ev.hasMultipleSessions
    ? [...(ev.sessions?.day?.tickets || []), ...(ev.sessions?.night?.tickets || [])]
    : (ev.tickets || []);

const getEventPriceLabel = (ev) => {
    if (ev.eventType !== "ticketed")
        return formatCurrency(ev.price);
    const prices = getEventTickets(ev).map((t) => t.price).filter((p) => p > 0);
    if (prices.length === 0)
        return "Free";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const STATUS_STYLES = {
    upcoming: "bg-blue-500/15 text-blue-400",
    ongoing: "bg-green-500/15 text-green-400",
    completed: "bg-gray-500/15 text-gray-400",
    cancelled: "bg-red-500/15 text-red-400",
};

const AdminEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiGetEventById(id)
            .then((res) => { if (!cancelled) setEvent(res.event || null); })
            .catch((e) => { if (!cancelled) { setError(e?.message || "Failed to load event"); toast.error(e?.message || "Failed to load event"); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10 max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4 sm:mb-6">
          <ArrowLeft className="h-4 w-4"/> Back to Events
        </button>

        {loading ? (<div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading…
          </div>) : error || !event ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            {error || "Event not found."}
            <div className="mt-4">
              <Link to="/admin-dashboard/events" className="text-primary text-sm font-medium hover:underline">Go back to Events</Link>
            </div>
          </div>) : (<div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="relative h-52 sm:h-72 w-full overflow-hidden bg-secondary">
              {imgSrc(event.image) ? (<img src={imgSrc(event.image)} alt={event.title} className="h-full w-full object-cover"/>) : (<div className="flex h-full items-center justify-center bg-gradient-mesh text-primary/30">
                  <ImageIcon className="h-14 w-14 opacity-30"/>
                </div>)}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
              <span className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold capitalize backdrop-blur-sm ${STATUS_STYLES[event.status] || "bg-gray-500/15 text-gray-400"}`}>
                {event.status}
              </span>
              <div className="absolute bottom-4 left-5 right-5">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground mb-2">
                  <Tag className="h-3 w-3"/> {event.category}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{event.title}</h1>
              </div>
            </div>

            <div className="p-5 sm:p-8 space-y-6 text-sm">
              {/* Organizer */}
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5"/> Organized By
                </p>
                <p className="font-semibold text-foreground text-base">{event.createdBy?.name || "Unknown merchant"}</p>
                {event.createdBy?.email && (<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Mail className="h-3 w-3"/>{event.createdBy.email}</p>)}
                {event.createdBy?.mobile && (<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Phone className="h-3 w-3"/>{event.createdBy.mobile}</p>)}
              </div>

              {event.description && (<div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Description</p>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{event.description}</p>
                </div>)}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5"/>Location</p>
                  <p className="text-foreground font-medium">{event.location}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5"/>Date & Time</p>
                  <p className="text-foreground font-medium">{new Date(event.datetime).toLocaleString()}</p>
                </div>
                {typeof event.attendeesCount === "number" && (<div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5"/>Attendees</p>
                    <p className="text-foreground font-medium">{event.attendeesCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ""}</p>
                  </div>)}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Price</p>
                  <p className="text-primary font-bold">{getEventPriceLabel(event)}</p>
                </div>
              </div>

              {/* Ticket tiers */}
              {getEventTickets(event).length > 0 && (<div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5"/>Ticket Tiers</p>
                  <div className="space-y-1.5">
                    {getEventTickets(event).map((ticket, idx) => {
                        const remaining = (ticket.available || 0) - (ticket.sold || 0);
                        const isSoldOut = remaining <= 0;
                        return (<div key={`${ticket.type}-${idx}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                            <span className="capitalize font-medium text-foreground">{ticket.type}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-primary font-semibold">{formatCurrency(ticket.price)}</span>
                              <span className={isSoldOut ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                                {isSoldOut ? "Sold Out" : `${remaining} left`}
                              </span>
                            </div>
                          </div>);
                    })}
                  </div>
                </div>)}
            </div>
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminEventDetail;
