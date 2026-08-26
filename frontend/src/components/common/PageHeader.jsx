import React from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  action,
  className = "",
}) => {
  const headerActions = actions || action;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="space-y-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 font-medium overflow-x-auto no-scrollbar">
            {breadcrumbs.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
                {item.to ? (
                  <Link
                    to={item.to}
                    className="hover:text-foreground transition-colors shrink-0"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-semibold shrink-0">
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate font-sans">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground font-normal max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {headerActions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {headerActions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
