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
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

export function formatEventSchedule(event) {
    if (!event || typeof event !== "object") return { dateText: "", timeText: "", fullSummary: "", isMultiDay: false, daysCount: 1 };

    const isMultiDay = event.durationType === "multiple" && event.startDate && event.endDate && event.startDate !== event.endDate;

    if (isMultiDay) {
        const sDate = new Date(event.startDate + "T00:00:00");
        const eDate = new Date(event.endDate + "T00:00:00");
        const isValidS = !isNaN(sDate.getTime());
        const isValidE = !isNaN(eDate.getTime());

        const diffTime = (isValidS && isValidE) ? Math.max(0, eDate.getTime() - sDate.getTime()) : 0;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const sStr = isValidS ? sDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : String(event.startDate || "");
        const eStr = isValidE ? eDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : String(event.endDate || "");
        const dateText = `${sStr} – ${eStr}`;

        let timeText = "";
        if (event.startTime && event.endTime) {
            timeText = `${formatTime12(String(event.startTime))} – ${formatTime12(String(event.endTime))} Daily`;
        } else if (event.startTime) {
            timeText = `${formatTime12(String(event.startTime))} Daily`;
        }

        return {
            dateText,
            timeText,
            badgeText: `${diffDays}-Day Event`,
            fullSummary: `${dateText} • ${diffDays} Days${timeText ? ` (${timeText})` : ""}`,
            isMultiDay: true,
            daysCount: diffDays,
            hasCustomSchedule: Boolean(event.hasCustomSchedule && event.dailySchedule?.length),
            dailySchedule: event.dailySchedule || []
        };
    }

    // Single Day
    const dt = event.datetime ? new Date(event.datetime) : (event.startDate ? new Date(event.startDate + "T00:00:00") : null);
    const isValidDt = dt && !isNaN(dt.getTime());
    const dateText = isValidDt ? dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

    let timeText = "";
    if (event.startTime && event.endTime) {
        timeText = `${formatTime12(String(event.startTime))} – ${formatTime12(String(event.endTime))}`;
    } else if (event.startTime) {
        timeText = formatTime12(String(event.startTime));
    } else if (isValidDt) {
        timeText = dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    }

    return {
        dateText,
        timeText,
        badgeText: "Single Day",
        fullSummary: dateText + (timeText ? ` • ${timeText}` : ""),
        isMultiDay: false,
        daysCount: 1,
        hasCustomSchedule: false,
        dailySchedule: []
    };
}

export function getAvatarUrl(user) {
    if (!user) return "";
    return user.avatar || user.merchantDetails?.avatar || user.profileImage || user.image || "";
}

