import React from "react";
import { ChevronRight } from "lucide-react";

export const DataTable = ({ children, className = "", minWidth = "700px" }) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full no-scrollbar">
          <table className="w-full text-xs sm:text-sm border-collapse" style={{ minWidth }}>
            {children}
          </table>
        </div>
      </div>

      {/* Mobile Cards View (< 768px) */}
      <div className="block md:hidden w-full space-y-3">
        <MobileCardExtractor children={children} />
      </div>
    </div>
  );
};

const MobileCardExtractor = ({ children }) => {
  const childrenArray = React.Children.toArray(children);
  const tableBody = childrenArray.find(
    (child) => child?.type === TableBody || child?.type?.name === "TableBody"
  ) || childrenArray.find((child) => child?.type === "tbody");

  if (!tableBody) return null;

  const rows = React.Children.toArray(tableBody.props?.children || []);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        if (!row) return null;
        if (row.props?.mobileCard) {
          return <React.Fragment key={row.key || idx}>{row.props.mobileCard}</React.Fragment>;
        }
        return <SmartMobileCard key={row.key || idx} row={row} />;
      })}
    </div>
  );
};

const SmartMobileCard = ({ row }) => {
  const { children, onClick, className = "", ...props } = row.props || {};
  const cells = React.Children.toArray(children || []);
  if (cells.length === 0) return null;

  // Filter out any desktop table row fixed height classes (e.g. h-[62px], h-16)
  const safeClassName = className
    .split(" ")
    .filter((c) => !/^h-\[[^\]]+\]$/.test(c) && !/^h-\d+$/.test(c))
    .join(" ");

  // Primary cell (Cell 0)
  const primaryCell = cells[0];

  // Action cell (Last cell if align === "right" or contains interactive buttons/menu)
  const lastCell = cells.length > 1 ? cells[cells.length - 1] : null;
  const isLastCellAction = lastCell && (
    lastCell.props?.align === "right" ||
    (typeof lastCell.props?.children === "object" && lastCell.props?.children !== null)
  );

  const middleCells = cells.slice(1, isLastCellAction ? cells.length - 1 : cells.length);

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs hover:border-primary/40 active:scale-[0.99] transition-all space-y-2.5 h-auto ${
        onClick ? "cursor-pointer" : ""
      } ${safeClassName}`}
      {...props}
    >
      {/* Top Row: Primary Field + Action / Chevron */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {primaryCell?.props?.children}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLastCellAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {lastCell?.props?.children}
            </div>
          )}
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-1" />
          )}
        </div>
      </div>

      {/* Middle Fields */}
      {middleCells.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
          {middleCells.map((cell, idx) => (
            <div key={idx} className="min-w-0">
              {cell?.props?.children}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TableHeader = ({ children, className = "" }) => (
  <thead className={`sticky top-0 z-10 bg-card shadow-xs border-b border-border/70 ${className}`}>
    <tr className="bg-muted/50 border-b border-border/70">
      {children}
    </tr>
  </thead>
);

export const TableHeaderCell = ({ children, className = "", align = "left", width }) => (
  <th
    style={width ? { width } : undefined}
    className={`px-3.5 sm:px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider align-middle bg-card ${
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
    } ${className}`}
  >
    {children}
  </th>
);

export const TableBody = ({ children, className = "" }) => (
  <tbody className={`divide-y divide-border/60 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, onClick, className = "", mobileCard = null, ...props }) => (
  <tr
    onClick={onClick}
    className={`hover:bg-muted/30 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", align = "left" }) => (
  <td
    className={`px-3.5 sm:px-4 py-3 align-middle text-xs sm:text-sm text-foreground ${
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
    } ${className}`}
  >
    {children}
  </td>
);

export default DataTable;
