import { useEffect, useMemo } from "react";
import { Calendar, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime12 } from "@/lib/utils";

const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

export const generateDailySchedule = (startStr, endStr, defaultStart, defaultEnd, prevSchedule = []) => {
    if (!startStr || !endStr) return [];
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];

    const days = [];
    const current = new Date(start);
    let count = 0;

    while (current <= end && count < 60) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const dayLabel = current.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short"
        });

        // Retain existing customized timing if user previously edited this date
        const existing = prevSchedule.find((s) => s.date === dateStr);

        days.push({
            date: dateStr,
            dayLabel,
            startTime: existing?.startTime || defaultStart || "10:00",
            endTime: existing?.endTime || defaultEnd || "18:00"
        });

        current.setDate(current.getDate() + 1);
        count++;
    }

    return days;
};

const EventDurationSchedulePicker = ({
    durationType = "single",
    onDurationTypeChange,
    startDate = "",
    onStartDateChange,
    endDate = "",
    onEndDateChange,
    startTime = "",
    onStartTimeChange,
    endTime = "",
    onEndTimeChange,
    hasCustomSchedule = false,
    onHasCustomScheduleChange,
    dailySchedule = [],
    onDailyScheduleChange,
    errors = {},
    onClearError,
}) => {
    const todayStr = useMemo(() => getTodayString(), []);

    // Sync daily schedule when start/end dates or default times change
    useEffect(() => {
        if (durationType === "multiple" && startDate && endDate && endDate >= startDate) {
            const next = generateDailySchedule(startDate, endDate, startTime, endTime, dailySchedule);
            if (JSON.stringify(next) !== JSON.stringify(dailySchedule)) {
                onDailyScheduleChange(next);
            }
        }
    }, [durationType, startDate, endDate, startTime, endTime]);

    // Compute live summary
    const summary = useMemo(() => {
        if (durationType === "single") {
            if (!startDate) return null;
            const dt = new Date(startDate + "T00:00:00");
            if (isNaN(dt.getTime())) return null;
            const dateFormatted = dt.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric"
            });

            let timeFormatted = "";
            if (startTime && endTime) {
                timeFormatted = ` • ${formatTime12(startTime)} – ${formatTime12(endTime)}`;
            } else if (startTime) {
                timeFormatted = ` • Starts at ${formatTime12(startTime)}`;
            }

            return {
                title: `${dateFormatted}${timeFormatted}`,
                subtitle: null
            };
        } else {
            if (!startDate || !endDate) return null;
            const sDate = new Date(startDate + "T00:00:00");
            const eDate = new Date(endDate + "T00:00:00");
            if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || eDate < sDate) return null;

            const diffTime = Math.max(0, eDate.getTime() - sDate.getTime());
            const daysCount = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const sStr = sDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const eStr = eDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

            let timingLine = "";
            if (hasCustomSchedule) {
                timingLine = "Custom daily schedule configured";
            } else if (startTime && endTime) {
                timingLine = `Daily timing: ${formatTime12(startTime)} – ${formatTime12(endTime)}`;
            } else if (startTime) {
                timingLine = `Daily starts at: ${formatTime12(startTime)}`;
            }

            return {
                title: `${sStr} – ${eStr} • ${daysCount} Day${daysCount > 1 ? "s" : ""}`,
                subtitle: timingLine || null
            };
        }
    }, [durationType, startDate, endDate, startTime, endTime, hasCustomSchedule]);

    const handleCustomDayTimeChange = (index, field, value) => {
        const next = [...dailySchedule];
        if (next[index]) {
            next[index] = { ...next[index], [field]: value };
            onDailyScheduleChange(next);
        }
    };

    return (
        <div className="space-y-4">
            {/* Event Duration Selector */}
            <div>
                <Label className="text-sm text-muted-foreground font-semibold mb-2 block">
                    Event Duration
                </Label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => onDurationTypeChange("single")}
                        className={`p-3.5 rounded-xl border-2 transition-all font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                            durationType === "single"
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-border bg-card hover:border-primary/50 text-foreground"
                        }`}
                    >
                        <span className="text-base">📅</span> Single Day
                    </button>
                    <button
                        type="button"
                        onClick={() => onDurationTypeChange("multiple")}
                        className={`p-3.5 rounded-xl border-2 transition-all font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                            durationType === "multiple"
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-border bg-card hover:border-primary/50 text-foreground"
                        }`}
                    >
                        <span className="text-base">📆</span> Multiple Days
                    </button>
                </div>
            </div>

            {/* SINGLE DAY DATES & TIMES */}
            {durationType === "single" && (
                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> Event Date *
                        </Label>
                        <Input
                            type="date"
                            value={startDate}
                            min={todayStr}
                            onChange={(e) => {
                                onStartDateChange(e.target.value);
                                onEndDateChange(e.target.value);
                                if (onClearError) onClearError("date");
                            }}
                            required
                            className="bg-card border-border h-11 rounded-xl text-sm"
                            aria-invalid={Boolean(errors.date)}
                        />
                        {errors.date && <p className="text-xs text-destructive mt-1 font-medium">{errors.date}</p>}
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Start Time *
                        </Label>
                        <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => {
                                onStartTimeChange(e.target.value);
                                if (onClearError) onClearError("startTime");
                            }}
                            required
                            className="bg-card border-border h-11 rounded-xl text-sm"
                            aria-invalid={Boolean(errors.startTime)}
                        />
                        {errors.startTime && <p className="text-xs text-destructive mt-1 font-medium">{errors.startTime}</p>}
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                            <Clock className="h-3.5 w-3.5 text-primary" /> End Time *
                        </Label>
                        <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => {
                                onEndTimeChange(e.target.value);
                                if (onClearError) onClearError("endTime");
                            }}
                            required
                            className="bg-card border-border h-11 rounded-xl text-sm"
                            aria-invalid={Boolean(errors.endTime)}
                        />
                        {errors.endTime && <p className="text-xs text-destructive mt-1 font-medium">{errors.endTime}</p>}
                    </div>
                </div>
            )}

            {/* MULTIPLE DAYS DATES & TIMES */}
            {durationType === "multiple" && (
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" /> Start Date *
                            </Label>
                            <Input
                                type="date"
                                value={startDate}
                                min={todayStr}
                                onChange={(e) => {
                                    onStartDateChange(e.target.value);
                                    if (endDate && e.target.value > endDate) {
                                        onEndDateChange(e.target.value);
                                    }
                                    if (onClearError) onClearError("startDate");
                                }}
                                required
                                className="bg-card border-border h-11 rounded-xl text-sm"
                                aria-invalid={Boolean(errors.startDate)}
                            />
                            {errors.startDate && <p className="text-xs text-destructive mt-1 font-medium">{errors.startDate}</p>}
                        </div>
                        <div>
                            <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" /> End Date *
                            </Label>
                            <Input
                                type="date"
                                value={endDate}
                                min={startDate || todayStr}
                                onChange={(e) => {
                                    onEndDateChange(e.target.value);
                                    if (onClearError) onClearError("endDate");
                                }}
                                required
                                className="bg-card border-border h-11 rounded-xl text-sm"
                                aria-invalid={Boolean(errors.endDate)}
                            />
                            {errors.endDate && <p className="text-xs text-destructive mt-1 font-medium">{errors.endDate}</p>}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                                <Clock className="h-3.5 w-3.5 text-primary" /> Daily Start Time *
                            </Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => {
                                    onStartTimeChange(e.target.value);
                                    if (onClearError) onClearError("startTime");
                                }}
                                required
                                className="bg-card border-border h-11 rounded-xl text-sm"
                                aria-invalid={Boolean(errors.startTime)}
                            />
                            {errors.startTime && <p className="text-xs text-destructive mt-1 font-medium">{errors.startTime}</p>}
                        </div>
                        <div>
                            <Label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                                <Clock className="h-3.5 w-3.5 text-primary" /> Daily End Time *
                            </Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => {
                                    onEndTimeChange(e.target.value);
                                    if (onClearError) onClearError("endTime");
                                }}
                                required
                                className="bg-card border-border h-11 rounded-xl text-sm"
                                aria-invalid={Boolean(errors.endTime)}
                            />
                            {errors.endTime && <p className="text-xs text-destructive mt-1 font-medium">{errors.endTime}</p>}
                        </div>
                    </div>

                    {/* Optional Custom Schedule checkbox */}
                    <div className="pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                            <input
                                type="checkbox"
                                checked={hasCustomSchedule}
                                onChange={(e) => onHasCustomScheduleChange(e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 accent-primary"
                            />
                            <span>Use different timings for each day</span>
                        </label>
                    </div>

                    {/* Custom daily schedule rows */}
                    {hasCustomSchedule && dailySchedule.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2.5 animate-in fade-in-50 duration-200">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground">Custom Daily Timing</p>
                                <span className="text-[10px] text-muted-foreground">{dailySchedule.length} days</span>
                            </div>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {dailySchedule.map((day, idx) => (
                                    <div
                                        key={day.date}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border text-xs"
                                    >
                                        <span className="font-semibold text-foreground w-32 shrink-0">
                                            {day.dayLabel}
                                        </span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="time"
                                                value={day.startTime}
                                                onChange={(e) => handleCustomDayTimeChange(idx, "startTime", e.target.value)}
                                                className="h-8 text-xs bg-background"
                                                required
                                            />
                                            <span className="text-muted-foreground text-xs font-medium">to</span>
                                            <Input
                                                type="time"
                                                value={day.endTime}
                                                onChange={(e) => handleCustomDayTimeChange(idx, "endTime", e.target.value)}
                                                className="h-8 text-xs bg-background"
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DURATION SUMMARY BADGE */}
            {summary && (
                <div className="rounded-xl bg-primary/8 border border-primary/20 px-3.5 py-2.5 text-xs text-primary font-medium flex items-start gap-2.5 animate-in fade-in-50 duration-150">
                    <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <div>
                        <p className="font-semibold text-foreground text-xs leading-snug">{summary.title}</p>
                        {summary.subtitle && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{summary.subtitle}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDurationSchedulePicker;
