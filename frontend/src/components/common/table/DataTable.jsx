import React from "react";

export const DataTable = ({ children, className = "", minWidth = "700px" }) => {
  return (
    <div className={`rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden w-full ${className}`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs sm:text-sm border-collapse" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableHeader = ({ children, className = "" }) => (
  <thead>
    <tr className={`bg-secondary/70 border-b border-border/80 ${className}`}>
      {children}
    </tr>
  </thead>
);

export const TableHeaderCell = ({ children, className = "", align = "left", width }) => (
  <th
    style={width ? { width } : undefined}
    className={`px-3 sm:px-4 py-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider align-middle ${
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
    className={`hover:bg-secondary/40 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", align = "left" }) => (
  <td
    className={`px-3 sm:px-4 py-2.5 sm:py-3 align-middle text-xs sm:text-sm ${
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
    } ${className}`}
  >
    {children}
  </td>
);

export default DataTable;
