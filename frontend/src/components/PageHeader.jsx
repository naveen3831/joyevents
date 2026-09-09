import { ArrowLeft } from "lucide-react";

/**
 * PageHeader
 *
 * A compact mobile-first page header for detail / secondary pages.
 * Shows a back arrow on the left, a page title, and an optional right-side slot
 * for page-level actions (e.g., favorite button, share icon).
 *
 * Props:
 *   title      {string}    - Page title displayed next to the back button
 *   onBack     {Function}  - Called when the back arrow is tapped
 *   rightSlot  {ReactNode} - Optional content rendered on the right (icons, buttons)
 *   className  {string}    - Additional classes applied to the outer wrapper
 *   showBack   {boolean}   - Set false to hide the back arrow (default: true)
 *
 * Usage:
 *   <PageHeader title="Service Details" onBack={goBack} />
 *   <PageHeader title="Event Details"   onBack={goBack} rightSlot={<HeartBtn />} />
 */
const PageHeader = ({
    title,
    onBack,
    rightSlot = null,
    className = "",
    showBack = true,
}) => {
    return (
        <div
            className={`hidden lg:flex items-center gap-2 mb-4 sm:mb-5 ${className}`}
            style={{ minHeight: "44px" }}
        >
            {/* Back Button — 44×44px touch target */}
            {showBack && onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="shrink-0 flex items-center justify-center rounded-xl bg-secondary/80 hover:bg-secondary border border-border/80 hover:border-primary/30 text-foreground/80 hover:text-primary transition-all active:scale-95"
                    style={{ width: "40px", height: "40px", minWidth: "40px" }}
                >
                    <ArrowLeft style={{ width: "20px", height: "20px", strokeWidth: 2.2 }} />
                </button>
            )}

            {/* Title */}
            {title && (
                <h1
                    className="font-display font-bold text-foreground leading-tight truncate flex-1"
                    style={{ fontSize: "clamp(1rem, 4vw, 1.25rem)" }}
                >
                    {title}
                </h1>
            )}

            {/* Right-side slot */}
            {rightSlot && (
                <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                    {rightSlot}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
