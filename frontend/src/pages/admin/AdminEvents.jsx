import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ImageIcon, Loader2, AlertCircle, Ticket } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { apiListEvents } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) => !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadEvents = async () => {
        try {
            const eventsRes = await apiListEvents().catch(() => ({ events: [] }));
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

    return (<AdminLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xs sm:text-3xl font-bold truncate">
              Events
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-semibold">View all events</p>
          </div>
        </div>

        {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/> Loading…
          </div>) : events.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
            No events available.
          </div>) : (<div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {events.map((ev) => {
                return (<motion.div key={ev._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="group rounded-xl border border-border bg-card overflow-hidden hover-lift flex flex-col h-full">
                {/* Image - fixed height */}
                <div className="relative h-44 flex-shrink-0 overflow-hidden bg-secondary">
                  {imgSrc(ev.image) ? (<img src={imgSrc(ev.image)} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 opacity-30"/>
                    </div>)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"/>
                  <span className="absolute bottom-3 left-3 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {ev.category}
                  </span>
                </div>

                {/* Info - flex-grow so all cards stretch to same height */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-base leading-tight">{ev.title}</h3>

                  {/* Available Tickets - fixed height scrollable area */}
                  {ev.eventType === "ticketed" && ((() => {
                    const allTickets = ev.hasMultipleSessions
                        ? [
                            ...(ev.sessions?.day?.tickets || []),
                            ...(ev.sessions?.night?.tickets || []),
                        ]
                        : (ev.tickets || []);
                    if (allTickets.length === 0)
                        return null;
                    return (<div className="mt-2 border-b border-border pb-2">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                            <Ticket className="h-3 w-3"/> Available Tickets:
                          </p>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {allTickets.map((ticket, idx) => {
                            const remaining = (ticket.available || 0) - (ticket.sold || 0);
                            const isSoldOut = remaining <= 0;
                            return (<div key={`${ticket.type}-${idx}`} className="flex items-center justify-between text-xs">
                                  <span className="capitalize text-muted-foreground">{ticket.type}:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-primary font-semibold">{formatCurrency(ticket.price)}</span>
                                    <span className={isSoldOut ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                                      {isSoldOut ? "Sold Out" : `${remaining} left`}
                                    </span>
                                  </div>
                                </div>);
                        })}
                          </div>
                        </div>);
                })())}

                  {/* Spacer pushes footer to bottom */}
                  <div className="flex-1 flex flex-col justify-end mt-2 gap-0.5">
                    <p className="text-xs text-muted-foreground truncate">{ev.location}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.datetime).toLocaleString()}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">
                        {ev.eventType === "ticketed"
                    ? (() => {
                        const allTickets = ev.hasMultipleSessions
                            ? [
                                ...(ev.sessions?.day?.tickets || []),
                                ...(ev.sessions?.night?.tickets || []),
                            ]
                            : (ev.tickets || []);
                        const prices = allTickets.map((t) => t.price).filter((p) => p > 0);
                        if (prices.length === 0)
                            return "Free";
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        return min === max ? `${formatCurrency(min)}` : `${formatCurrency(min)} – ${formatCurrency(max)}`;
                    })()
                    : `${formatCurrency(ev.price)}`}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${ev.status === "upcoming" ? "bg-blue-500/15 text-blue-400" :
                    ev.status === "ongoing" ? "bg-green-500/15 text-green-400" :
                        "bg-gray-500/15 text-gray-400"}`}>
                        {ev.status}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>);
            })}
          </div>)}
      </section>
    </AdminLayout>);
};

export default AdminEvents;
