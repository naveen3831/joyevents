/**
 * SmartPagination.jsx
 *
 * ONE reusable pagination component for the entire Eventoza application.
 *
 * Features:
 *  - Compact numeric input to set visible page-number buttons count (default: 5, min: 2, max: 10)
 *  - Previous / Next navigate one page at a time
 *  - Active page highlighted with primary purple
 *  - Proper disabled states (first / last page)
 *  - Accessible aria attributes
 *  - "Showing X–Y of Z" info text
 *  - Responsive layout & graceful input validation on Enter / Blur
 *
 * Usage:
 *   <SmartPagination
 *     currentPage={currentPage}
 *     totalPages={totalPages}
 *     onPageChange={setCurrentPage}
 *     totalItems={filteredRows.length}
 *     itemsPerPage={itemsPerPage}
 *     itemLabel="transactions"
 *   />
 */

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given current page, visible page count, and total pages,
 * compute start and end of page group.
 */
const getPageGroup = (currentPage, visibleCount, totalPages) => {
  const safeVisible = Math.max(1, visibleCount);
  const groupIndex = Math.floor((currentPage - 1) / safeVisible);
  const startPage = groupIndex * safeVisible + 1;
  const endPage = Math.min(startPage + safeVisible - 1, totalPages);
  return { startPage, endPage };
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SmartPagination = ({
  /** Current active page (1-indexed) */
  currentPage = 1,
  /** Total number of pages */
  totalPages = 1,
  /** Called with the new page number when user navigates */
  onPageChange,
  /** Total record count — used to render "Showing X–Y of Z" */
  totalItems,
  /** Records per page — used to render "Showing X–Y of Z" */
  itemsPerPage = 10,
  /** Label used in "Showing X–Y of Z <label>" text */
  itemLabel = "records",
  /** Show the visible-page-count manual input */
  showVisiblePageSelector = true,
  /** Externally controlled visible page count (optional) */
  visiblePageCount: externalVisibleCount,
  /** Called when visible page count changes (optional) */
  onVisiblePageCountChange,
  /** Extra classes for the wrapper div */
  className = "",
  /** Disable all controls */
  disabled = false,
}) => {
  // ── Visible page count state (default: 5) ─────────────────────────────────
  const [internalVisibleCount, setInternalVisibleCount] = useState(5);

  const visibleCount =
    externalVisibleCount != null ? externalVisibleCount : internalVisibleCount;

  // Local string state for input field typing
  const [inputValue, setInputValue] = useState(String(visibleCount));

  useEffect(() => {
    setInputValue(String(visibleCount));
  }, [visibleCount]);

  const handleVisibleCountChange = (newCount) => {
    if (onVisiblePageCountChange) {
      onVisiblePageCountChange(newCount);
    } else {
      setInternalVisibleCount(newCount);
    }
    // Do NOT reset currentPage — keep active page
  };

  /** Validate & commit entered number (min 2, max 10) */
  const commitValue = (rawVal) => {
    let num = parseInt(rawVal, 10);
    if (isNaN(num) || num < 2) {
      num = 2;
    } else if (num > 10) {
      num = 10;
    }
    setInputValue(String(num));
    if (num !== visibleCount) {
      handleVisibleCountChange(num);
    }
  };

  const handleInputChange = (e) => {
    // Filter non-numeric characters while typing
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setInputValue(raw);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      commitValue(inputValue);
      e.target.blur();
    }
  };

  const handleBlur = () => {
    commitValue(inputValue);
  };

  // ── Guard: clamp currentPage to valid range ──────────────────────────────
  const safeCurrent = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const safeTotal = Math.max(totalPages, 1);

  // ── Compute current page group ───────────────────────────────────────────
  const { startPage, endPage } = getPageGroup(safeCurrent, visibleCount, safeTotal);
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // ── Derived info ─────────────────────────────────────────────────────────
  const showInfo = totalItems != null && totalItems > 0;
  const startItem = (safeCurrent - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrent * itemsPerPage, totalItems ?? 0);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = (page) => {
    if (!onPageChange || disabled) return;
    const clamped = Math.min(Math.max(page, 1), safeTotal);
    if (clamped !== safeCurrent) onPageChange(clamped);
  };

  // ── Render nothing if only 1 page and no info to show ────────────────────
  if (safeTotal <= 1 && !showInfo) return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-border/70 text-xs text-muted-foreground bg-muted/20 ${className}`}
    >
      {/* ── Left: Record info ────────────────────────────────────────── */}
      <div className="whitespace-nowrap shrink-0">
        {showInfo ? (
          <>
            Showing{" "}
            <span className="font-semibold text-foreground">{startItem}</span>
            {"–"}
            <span className="font-semibold text-foreground">{endItem}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span>{" "}
            {itemLabel}
          </>
        ) : (
          <span>
            Page <span className="font-semibold text-foreground">{safeCurrent}</span> of{" "}
            <span className="font-semibold text-foreground">{safeTotal}</span>
          </span>
        )}
      </div>

      {/* ── Right: Pagination controls ───────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap justify-end">
        {/* Previous */}
        <button
          type="button"
          onClick={() => goTo(safeCurrent - 1)}
          disabled={safeCurrent <= 1 || disabled}
          aria-label="Previous page"
          className={`
            inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-medium
            border border-border/80 bg-card transition-colors select-none
            ${
              safeCurrent <= 1 || disabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-secondary cursor-pointer"
            }
          `}
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page number buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page) => {
            const isActive = page === safeCurrent;
            return (
              <button
                key={page}
                type="button"
                onClick={() => goTo(page)}
                disabled={disabled}
                aria-label={`Go to page ${page}`}
                aria-current={isActive ? "page" : undefined}
                className={`
                  h-8 w-8 rounded-full text-[13px] font-semibold
                  flex items-center justify-center select-none
                  transition-colors border
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs cursor-default"
                      : "bg-card border-border/80 text-foreground hover:bg-secondary cursor-pointer"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => goTo(safeCurrent + 1)}
          disabled={safeCurrent >= safeTotal || disabled}
          aria-label="Next page"
          className={`
            inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-medium
            border border-border/80 bg-card transition-colors select-none
            ${
              safeCurrent >= safeTotal || disabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-secondary cursor-pointer"
            }
          `}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>

        {/* Manual Visible Page Buttons Input */}
        {showVisiblePageSelector && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
            <span>Show</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={disabled}
              aria-label="Number of visible pagination pages"
              className="w-12 h-8 text-center text-[13px] font-semibold bg-card border border-border/80 rounded-xl
                text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs"
            />
            <span>pages</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPagination;
