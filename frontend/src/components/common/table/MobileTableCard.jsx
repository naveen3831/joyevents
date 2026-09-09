import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * MobileTableCard
 * 
 * Reusable high-end card component for mobile table row rendering (< 768px).
 */
export const MobileTableCard = ({
  title,
  subtitle,
  avatar,
  badge,
  fields = [],
  actions,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs hover:border-primary/40 active:scale-[0.99] transition-all space-y-3 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {avatar && (
            typeof avatar === "string" ? (
              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {avatar}
              </div>
            ) : (
              avatar
            )
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h4 className="font-semibold text-sm text-foreground truncate leading-snug">
                {title}
              </h4>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          {actions && (
            <div onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
          {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-0.5" />}
        </div>
      </div>

      {/* Fields Grid */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
          {fields.map((f, idx) => (
            <div key={idx} className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                {f.label}
              </span>
              <span className="font-medium text-foreground truncate block mt-0.5">
                {f.value || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileTableCard;
