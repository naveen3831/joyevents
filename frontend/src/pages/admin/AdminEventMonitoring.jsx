import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiListEvents, apiSuspendEvent, apiCancelEvent, apiFeatureEvent } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertCircle, Calendar, PowerOff, Ban, Star, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { useGsapReveal } from "@/lib/gsapAnimations";
import { StatusBadge } from "@/components/common/table/StatusBadge";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/common/table/DataTable";
const AdminEventMonitoring = () => {
    const { token } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [processingId, setProcessingId] = useState(null);
    const loadEvents = async () => {
        try {
            setLoading(true);
            const res = await apiListEvents(token);
            setEvents(res.events || []);
        }
        catch {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadEvents(); }, []);
    const handleAction = async (id, action) => {
        if (!token)
            return;
        setProcessingId(id);
        try {
            if (action === "suspend")
                await apiSuspendEvent(id, true, token);
            else if (action === "unsuspend")
                await apiSuspendEvent(id, false, token);
            else if (action === "cancel")
                await apiCancelEvent(id, token);
            else if (action === "feature")
                await apiFeatureEvent(id, true, token);
            else if (action === "unfeature")
                await apiFeatureEvent(id, false, token);
            toast.success(`Event ${action} successful`);
            loadEvents();
        }
        catch (e) {
            toast.error(e?.message || `Failed to ${action} event`);
        }
        finally {
            setProcessingId(null);
        }
    };
    const filteredEvents = events.filter(ev => {
        if (filter === "all")
            return true;
        if (filter === "active")
            return ev.status === "upcoming" || ev.status === "ongoing";
        if (filter === "completed")
            return ev.status === "completed";
        if (filter === "cancelled")
            return ev.status === "cancelled";
        return true;
    });
    const stats = {
        total: events.length,
        active: events.filter(e => e.status === "upcoming" || e.status === "ongoing").length,
        completed: events.filter(e => e.status === "completed").length,
        cancelled: events.filter(e => e.status === "cancelled").length,
    };
    const tableRef = useGsapReveal();
    return (<AdminLayout>
            <section className="py-2 sm:py-8 lg:py-10">
                <div className="mb-6 sm:mb-8">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                        Events
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Real-time overview and management of all platform events</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <StatCard index={0} title="Total Events" value={stats.total} icon={<Calendar />} />
                    <StatCard index={1} title="Active Events" value={stats.active} icon={<PlayCircle />} />
                    <StatCard index={2} title="Completed" value={stats.completed} icon={<CheckCircle />} />
                    <StatCard index={3} title="Cancelled" value={stats.cancelled} icon={<XCircle />} />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6 p-1 bg-secondary rounded-lg w-max">
                    {["all", "active", "completed", "cancelled"].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                            <span className="capitalize">{f}</span>
                        </button>))}
                </div>

                {/* Event List */}
                {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin"/> Loading Events...
                    </div>) : filteredEvents.length === 0 ? (<div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40"/>
                        No events found for this filter.
                    </div>) : (
                      <div ref={tableRef} className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs w-full">
                        <DataTable minWidth="100%">
                          <TableHeader>
                            <TableHeaderCell className="w-[30%]">Event</TableHeaderCell>
                            <TableHeaderCell className="w-[22%] whitespace-nowrap">Date & Time</TableHeaderCell>
                            <TableHeaderCell className="w-[15%]">Status</TableHeaderCell>
                            <TableHeaderCell className="w-[18%]">Flags</TableHeaderCell>
                            <TableHeaderCell align="right" className="w-[15%]">Actions</TableHeaderCell>
                          </TableHeader>
                          <TableBody>
                            {filteredEvents.map(ev => {
                              const isProcessing = processingId === ev._id;
                              return (
                                <TableRow key={ev._id}>
                                  <TableCell>
                                    <div className="font-semibold text-xs text-foreground truncate max-w-[220px]" title={ev.title}>{ev.title}</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{ev.category}</div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                    {new Date(ev.datetime).toLocaleDateString()} at {new Date(ev.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge status={ev.status} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {ev.isFeatured && <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"><Star className="h-3 w-3"/> Featured</span>}
                                      {ev.isSuspended && <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20"><PowerOff className="h-3 w-3"/> Suspended</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell align="right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button disabled={isProcessing} onClick={() => handleAction(ev._id, ev.isFeatured ? "unfeature" : "feature")} className={`p-1.5 rounded-lg border text-xs transition-colors ${ev.isFeatured ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" : "hover:bg-secondary text-muted-foreground"}`} title={ev.isFeatured ? "Unfeature Event" : "Feature Event"}>
                                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Star className="h-3.5 w-3.5"/>}
                                      </button>
                                      <button disabled={isProcessing} onClick={() => handleAction(ev._id, ev.isSuspended ? "unsuspend" : "suspend")} className={`p-1.5 rounded-lg border text-xs transition-colors ${ev.isSuspended ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"}`} title={ev.isSuspended ? "Unsuspend Event" : "Suspend Event"}>
                                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <PowerOff className="h-3.5 w-3.5"/>}
                                      </button>
                                      {ev.status !== "cancelled" && (
                                        <button disabled={isProcessing} onClick={() => {
                                          if (confirm("Are you sure you want to cancel this event?")) {
                                            handleAction(ev._id, "cancel");
                                          }
                                        }} className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs transition-colors" title="Cancel Event">
                                          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Ban className="h-3.5 w-3.5"/>}
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </DataTable>
                      </div>
                    )}
            </section>
        </AdminLayout>);
};
export default AdminEventMonitoring;
