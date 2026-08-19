import React from "react";
import { DataTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "./DataTable";

export const TableSkeleton = ({ columns = 5, rows = 5, minWidth = "700px" }) => {
  return (
    <DataTable minWidth={minWidth}>
      <TableHeader>
        {Array.from({ length: columns }).map((_, idx) => (
          <TableHeaderCell key={idx}>
            <div className="h-4 bg-secondary/80 rounded-md animate-pulse w-20" />
          </TableHeaderCell>
        ))}
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <TableRow key={rIdx}>
            {Array.from({ length: columns }).map((_, cIdx) => (
              <TableCell key={cIdx}>
                <div className="h-4 bg-secondary/60 rounded-md animate-pulse w-full max-w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
};

export default TableSkeleton;
