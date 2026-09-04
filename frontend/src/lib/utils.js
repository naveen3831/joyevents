import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/** Indian numbering: 10501000 → "1,05,01,000" */
export function formatAmount(amount, options) {
    const n = Number(amount);
    if (!Number.isFinite(n))
        return "0";
    const hasDecimals = Math.abs(n % 1) > 1e-9;
    const min = options?.minimumFractionDigits ?? (hasDecimals ? 2 : 0);
    const max = options?.maximumFractionDigits ?? (hasDecimals ? 2 : 0);
    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: min,
        maximumFractionDigits: max,
    }).format(n);
}

/** Indian currency: ₹1,05,01,000 */
export function formatCurrency(amount, options) {
    return `₹${formatAmount(amount, options)}`;
}

export function formatTime12(timeStr) {
    if (!timeStr) return "";
    const parts = String(timeStr).trim().split(":");
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

export function getYYYYMMDD(dateVal) {
    if (!dateVal) return "";
    if (typeof dateVal === "string") {
        const trimmed = dateVal.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            return trimmed.slice(0, 10);
        }
    }
    try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
    } catch (e) {}
    return "";
}

export function formatCalendarDate(ymdStr) {
    if (!ymdStr) return "";
    const cleanYmd = getYYYYMMDD(ymdStr);
    if (cleanYmd && /^\d{4}-\d{2}-\d{2}$/.test(cleanYmd)) {
        const [y, m, d] = cleanYmd.split("-").map(Number);
        const monthName = MONTHS_SHORT[m - 1] || "";
        return `${d} ${monthName} ${y}`;
    }
    try {
        const dateObj = new Date(ymdStr);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        }
    } catch (e) {}
    return String(ymdStr);
}

export function formatEventDateRange(startDate, endDate) {
    const startYMD = getYYYYMMDD(startDate);
    const endYMD = getYYYYMMDD(endDate);

    if (startYMD && endYMD && startYMD !== endYMD) {
        return `${formatCalendarDate(startYMD)} – ${formatCalendarDate(endYMD)}`;
    }
    if (startYMD) {
        return formatCalendarDate(startYMD);
    }
    if (endYMD) {
        return formatCalendarDate(endYMD);
    }
    return "";
}

export function formatEventSchedule(event) {
    if (!event || typeof event !== "object") {
        return { dateText: "", startDateText: "", endDateText: "", lastDateText: "", timeText: "", fullSummary: "", isMultiDay: false, daysCount: 1, hasCustomSchedule: false, dailySchedule: [] };
    }

    let startYMD = getYYYYMMDD(event.startDate || event.datetime);
    let endYMD = getYYYYMMDD(event.endDate);

    // Check if dailySchedule has dates if endYMD is missing or equal to startYMD
    if (Array.isArray(event.dailySchedule) && event.dailySchedule.length > 0) {
        if (!startYMD && event.dailySchedule[0]?.date) {
            startYMD = getYYYYMMDD(event.dailySchedule[0].date);
        }
        const lastScheduleDate = getYYYYMMDD(event.dailySchedule[event.dailySchedule.length - 1]?.date);
        if (lastScheduleDate && lastScheduleDate !== startYMD) {
            endYMD = lastScheduleDate;
        }
    }

    // Compare calendar dates (YYYY-MM-DD strings) to prevent timezone shifts
    const isMultiDay = Boolean(
        (startYMD && endYMD && startYMD !== endYMD) ||
        (event.durationType === "multiple" && endYMD && startYMD !== endYMD)
    );

    const startDateText = formatCalendarDate(startYMD);
    const endDateText = formatCalendarDate(endYMD || startYMD);

    let dateText = "";
    let diffDays = 1;

    if (isMultiDay && startYMD && endYMD) {
        dateText = `${startDateText} – ${endDateText}`;
        const sDate = new Date(startYMD + "T00:00:00");
        const eDate = new Date(endYMD + "T00:00:00");
        if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
            const diffTime = Math.max(0, eDate.getTime() - sDate.getTime());
            diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
    } else {
        dateText = startDateText || endDateText || "";
    }

    let timeText = "";
    if (event.startTime && event.endTime) {
        timeText = `${formatTime12(String(event.startTime))} – ${formatTime12(String(event.endTime))}`;
    } else if (event.startTime) {
        timeText = formatTime12(String(event.startTime));
    } else if (event.datetime) {
        try {
            const dt = new Date(event.datetime);
            if (!isNaN(dt.getTime())) {
                timeText = dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
            }
        } catch (e) {}
    }

    const badgeText = isMultiDay ? `${diffDays}-Day Event` : "Single Day";
    const fullSummary = isMultiDay
        ? `${dateText} • ${diffDays} Days${timeText ? ` (${timeText})` : ""}`
        : `${dateText}${timeText ? ` • ${timeText}` : ""}`;

    return {
        dateText,
        startDateText,
        endDateText,
        lastDateText: endDateText,
        timeText,
        badgeText,
        fullSummary,
        isMultiDay,
        daysCount: diffDays,
        hasCustomSchedule: Boolean(event.hasCustomSchedule && event.dailySchedule?.length),
        dailySchedule: event.dailySchedule || []
    };
}

export function getAvatarUrl(user) {
    if (!user) return "";
    return user.avatar || user.merchantDetails?.avatar || user.profileImage || user.image || "";
}
