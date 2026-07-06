import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  type: string;
  price: number;
  available: number;
  sold: number;
}

interface SeatSelectionProps {
  eventType: "ticketed" | "fullService";
  tickets?: Ticket[];
  maxAttendees?: number;
  attendeesCount?: number;
  price?: number;
  bookedSeats?: string[]; // Add this to track specific booked seats
  onConfirm: (selection: { selectedTickets?: Record<string, number>; quantity?: number; seatNumbers?: string[] }) => void;
  onClose: () => void;
  inline?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIER_ORDER = ["diamond", "gold", "silver"];
const TIER_COLORS: Record<string, { bg: string; border: string; text: string; selected: string; badge: string }> = {
  diamond: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    text: "text-cyan-400",
    selected: "bg-cyan-500 border-cyan-400 text-white",
    badge: "bg-cyan-500/20 text-cyan-300",
  },
  gold: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    selected: "bg-yellow-500 border-yellow-400 text-black",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  silver: {
    bg: "bg-slate-400/10",
    border: "border-slate-400/40",
    text: "text-slate-300",
    selected: "bg-slate-400 border-slate-300 text-black",
    badge: "bg-slate-400/20 text-slate-300",
  },
};
const TIER_EMOJI: Record<string, string> = { diamond: "💎", gold: "🥇", silver: "🥈" };

// Generate seat labels: A1, A2 … B1 …
function generateSeats(available: number, sold: number, prefix: string, bookedSeats: string[] = []) {
  const total = available;
  const seats: { id: string; isSold: boolean }[] = [];
  const cols = 10;
  for (let i = 0; i < total; i++) {
    const row = String.fromCharCode(65 + Math.floor(i / cols));
    const col = (i % cols) + 1;
    const seatNumber = `${row}${col}`;
    const seatId = `${prefix}-${seatNumber}`;
    // Check if this specific seat is in the bookedSeats array (check both with and without prefix)
    const isBooked = bookedSeats.includes(seatNumber) || bookedSeats.includes(seatId);
    seats.push({ id: seatId, isSold: isBooked });
  }
  return seats;
}

// ─── Component ────────────────────────────────────────────────────────────────
const SeatSelection = ({ eventType, tickets = [], maxAttendees = 0, attendeesCount = 0, price = 0, bookedSeats = [], onConfirm, onClose, inline = false }: SeatSelectionProps) => {

  // ── Ticketed state ──────────────────────────────────────────────────────────
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({});

  // ── FullService state ───────────────────────────────────────────────────────
  const [fsSelectedSeats, setFsSelectedSeats] = useState<string[]>([]);

  // ── Sorted tickets: diamond → gold → silver → others ───────────────────────
  const sortedTickets = useMemo(() => {
    const known = TIER_ORDER.map(t => tickets.find(tk => tk.type === t)).filter(Boolean) as Ticket[];
    const others = tickets.filter(t => !TIER_ORDER.includes(t.type));
    return [...known, ...others];
  }, [tickets]);

  // ── Seat maps per tier ──────────────────────────────────────────────────────
  const seatMaps = useMemo(() => {
    const map: Record<string, { id: string; isSold: boolean }[]> = {};
    sortedTickets.forEach(t => {
      map[t.type] = generateSeats(t.available, t.sold, t.type, bookedSeats);
    });
    return map;
  }, [sortedTickets, bookedSeats]);

  // ── FullService seat map ────────────────────────────────────────────────────
  const fsSeats = useMemo(() => {
    const total = maxAttendees > 0 ? maxAttendees : 100;
    return generateSeats(total, attendeesCount, "seat", bookedSeats);
  }, [maxAttendees, attendeesCount, bookedSeats]);

  // ── Toggle seat (ticketed) ──────────────────────────────────────────────────
  const toggleSeat = (tier: string, seatId: string) => {
    setSelectedSeats(prev => {
      const tierSeats = prev[tier] || [];
      const next = tierSeats.includes(seatId)
        ? { ...prev, [tier]: tierSeats.filter(s => s !== seatId) }
        : { ...prev, [tier]: [...tierSeats, seatId] };
      if (inline) {
        const result: Record<string, number> = {};
        const allSeats: string[] = [];
        sortedTickets.forEach(t => {
          const seats = next[t.type] || [];
          if (seats.length > 0) { result[t.type] = seats.length; allSeats.push(...seats); }
        });
        onConfirm({ selectedTickets: result, seatNumbers: allSeats });
      }
      return next;
    });
  };

  // ── Toggle seat (fullService) ───────────────────────────────────────────────
  const toggleFsSeat = (seatId: string) => {
    setFsSelectedSeats(prev => {
      const next = prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId];
      if (inline) onConfirm({ quantity: next.length, seatNumbers: next });
      return next;
    });
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalTicketed = useMemo(() => {
    let total = 0;
    sortedTickets.forEach(t => {
      total += (selectedSeats[t.type]?.length || 0) * t.price;
    });
    return total;
  }, [selectedSeats, sortedTickets]);

  const totalSelected = useMemo(() =>
    Object.values(selectedSeats).reduce((s, arr) => s + arr.length, 0),
    [selectedSeats]
  );

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (eventType === "ticketed") {
      const result: Record<string, number> = {};
      const allSeats: string[] = [];
      sortedTickets.forEach(t => {
        const seats = selectedSeats[t.type] || [];
        if (seats.length > 0) { result[t.type] = seats.length; allSeats.push(...seats); }
      });
      if (Object.keys(result).length === 0) return;
      onConfirm({ selectedTickets: result, seatNumbers: allSeats });
    } else {
      if (fsSelectedSeats.length === 0) return;
      onConfirm({ quantity: fsSelectedSeats.length, seatNumbers: fsSelectedSeats });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header — hidden in inline mode */}
      {!inline && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="font-display text-xl font-bold">Select Your Seats</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {eventType === "ticketed" ? "Choose seats from available tiers" : "Pick your spots in the hall"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Screen / Stage indicator */}
      <div className="mb-6 text-center">
        <div className="inline-block w-3/4 py-1.5 rounded-t-full bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30 text-xs font-semibold text-primary tracking-widest uppercase">
          {eventType === "fullService" ? "🎪 Stage / Hall Front" : "🎭 Stage"}
        </div>
        <div className="h-1 w-3/4 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full" />
      </div>

      {/* ── TICKETED: tier sections ─────────────────────────────────────────── */}
      {eventType === "ticketed" && (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {sortedTickets.map(ticket => {
            const avail = ticket.available - ticket.sold;
            const colors = TIER_COLORS[ticket.type] || TIER_COLORS.silver;
            const seats = seatMaps[ticket.type] || [];
            const tierSelected = selectedSeats[ticket.type] || [];

            return (
              <div key={ticket.type} className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                {/* Tier header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TIER_EMOJI[ticket.type] || "🎫"}</span>
                    <span className={`font-bold capitalize text-base ${colors.text}`}>{ticket.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                      {formatCurrency(ticket.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{avail} available</p>
                    {tierSelected.length > 0 && (
                      <p className={`text-xs font-semibold ${colors.text}`}>{tierSelected.length} selected</p>
                    )}
                  </div>
                </div>

                {avail === 0 ? (
                  <div className="text-center py-3 text-sm text-red-400 font-semibold">SOLD OUT</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {seats.map(seat => {
                      const isSelected = tierSelected.includes(seat.id);
                      return (
                        <button
                          key={seat.id}
                          disabled={seat.isSold}
                          onClick={() => toggleSeat(ticket.type, seat.id)}
                          title={seat.id.split("-")[1]}
                          className={`w-8 h-8 rounded text-[10px] font-bold border transition-all duration-150
                            ${seat.isSold
                              ? "bg-red-500/20 border-red-500/30 text-red-400/50 cursor-not-allowed"
                              : isSelected
                              ? `${colors.selected} scale-110 shadow-md`
                              : `bg-secondary/60 border-border hover:${colors.border} hover:${colors.text}`
                            }`}
                        >
                          {seat.isSold ? "✕" : seat.id.split("-")[1]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FULL SERVICE: open hall grid ────────────────────────────────────── */}
      {eventType === "fullService" && (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">Open Hall</span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {maxAttendees > 0 ? `${maxAttendees - attendeesCount} seats left` : "Open seating"}
                </p>
                {fsSelectedSeats.length > 0 && (
                  <p className="text-xs font-semibold text-primary">{fsSelectedSeats.length} selected</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fsSeats.map(seat => {
                const isSelected = fsSelectedSeats.includes(seat.id);
                return (
                  <button
                    key={seat.id}
                    disabled={seat.isSold}
                    onClick={() => toggleFsSeat(seat.id)}
                    title={seat.id.split("-")[1]}
                    className={`w-8 h-8 rounded text-[10px] font-bold border transition-all duration-150
                      ${seat.isSold
                        ? "bg-red-500/20 border-red-500/30 text-red-400/50 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md"
                        : "bg-secondary/60 border-border hover:border-primary/50 hover:text-primary"
                      }`}
                  >
                    {seat.isSold ? "✕" : seat.id.split("-")[1]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-secondary/60 border border-border inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-primary border-primary inline-block" /> Selected</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-500/20 border-red-500/30 inline-block" /> Booked</span>
      </div>

      {/* Footer summary + confirm — hidden in inline mode (parent handles confirm) */}
      {!inline && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {eventType === "ticketed" && totalSelected > 0 && (
            <div className="space-y-1 text-sm">
              {sortedTickets.map(t => {
                const count = selectedSeats[t.type]?.length || 0;
                if (!count) return null;
                return (
                  <div key={t.type} className="flex justify-between text-muted-foreground capitalize">
                    <span>{TIER_EMOJI[t.type]} {t.type} × {count}</span>
                    <span>{formatCurrency(t.price * count)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                <span>Total ({totalSelected} seats)</span>
                <span className="text-gradient">{formatCurrency(totalTicketed)}</span>
              </div>
            </div>
          )}

          {eventType === "fullService" && fsSelectedSeats.length > 0 && (
            <div className="flex justify-between font-bold text-base">
              <span>Total ({fsSelectedSeats.length} seats)</span>
              <span className="text-gradient">{formatCurrency(price * fsSelectedSeats.length)}</span>
            </div>
          )}

          <Button
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
            size="lg"
            disabled={eventType === "ticketed" ? totalSelected === 0 : fsSelectedSeats.length === 0}
            onClick={handleConfirm}
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm {eventType === "ticketed" ? `${totalSelected} Seat${totalSelected !== 1 ? "s" : ""}` : `${fsSelectedSeats.length} Seat${fsSelectedSeats.length !== 1 ? "s" : ""}`}
            {eventType === "ticketed" && totalSelected > 0 ? ` — ${formatCurrency(totalTicketed)}` : ""}
            {eventType === "fullService" && fsSelectedSeats.length > 0 ? ` — ${formatCurrency(price * fsSelectedSeats.length)}` : ""}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
