import React from "react";

export const DataTable = ({ children, className = "", minWidth = "700px" }) => {
  return (
    <div className={`rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden w-full ${className}`}>
      <div className="overflow-x-auto w-full no-scrollbar">
        <table className="w-full text-xs sm:text-sm border-collapse" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableHeader = ({ children, className = "" }) => (
  <thead>
    <tr className={`bg-muted/40 border-b border-border/70 ${className}`}>
      {children}
    </tr>
  </thead>
);

export const TableHeaderCell = ({ children, className = "", align = "left", width }) => (
  <th
    style={width ? { width } : undefined}
    className={`px-3.5 sm:px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider align-middle ${
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

export const TableRow = ({ children, onClick, className = "" }) => (
  <tr
    onClick={onClick}
    className={`hover:bg-muted/30 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
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
