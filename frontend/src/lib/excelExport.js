/**
 * excelExport.js
 * Professional Excel (.xlsx) export utility using SheetJS.
 * Supports Users and Merchants exports with proper formatting.
 */

import * as XLSX from "xlsx";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formats a date string into "DD Mon YYYY" (e.g. "08 Sep 2026").
 */
const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Generates a filename-safe date string for the current date
 * in "DD-Mon-YYYY" format (e.g. "08-Sep-2026").
 */
const getFileDateString = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleDateString("en-GB", { month: "short" });
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Applies column widths to a worksheet.
 */
const applyColWidths = (ws, colWidths) => {
  ws["!cols"] = colWidths;
};

/**
 * Triggers a browser download of the generated workbook.
 */
const downloadWorkbook = (wb, filename) => {
  XLSX.writeFile(wb, filename);
};

// ─── Users Export ────────────────────────────────────────────────────────────

/**
 * Exports a list of users to an .xlsx file.
 * Columns: S.No | Name | Email | Status | Joined Date
 *
 * @param {Array<Object>} users   - Array of user objects from the API
 * @param {string} [filename]     - Optional override filename
 * @throws {Error} "NO_RECORDS" when users array is empty
 */
export const exportUsersToExcel = (users, filename) => {
  if (!users || users.length === 0) {
    throw new Error("NO_RECORDS");
  }

  const rows = users.map((u, index) => ({
    "S.No": index + 1,
    Name: u.name || "",
    Email: u.email || "",
    Status: u.status
      ? u.status.charAt(0).toUpperCase() + u.status.slice(1).toLowerCase()
      : "Active",
    "Joined Date": formatDate(u.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["S.No", "Name", "Email", "Status", "Joined Date"],
  });

  applyColWidths(ws, [
    { wch: 8 },   // S.No
    { wch: 25 },  // Name
    { wch: 35 },  // Email
    { wch: 15 },  // Status
    { wch: 18 },  // Joined Date
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");

  const resolvedFilename = filename || `Eventoza_Users_${getFileDateString()}.xlsx`;
  downloadWorkbook(wb, resolvedFilename);
};

// ─── Merchants Export ─────────────────────────────────────────────────────────

/**
 * Exports a list of merchants to an .xlsx file.
 * Columns: S.No | Merchant Name | Email | Phone Number | Status | Joined Date
 * Phone numbers are stored as text strings to prevent scientific notation.
 *
 * @param {Array<Object>} merchants  - Array of merchant objects from the API
 * @param {string} [filename]        - Optional override filename
 * @throws {Error} "NO_RECORDS" when merchants array is empty
 */
export const exportMerchantsToExcel = (merchants, filename) => {
  if (!merchants || merchants.length === 0) {
    throw new Error("NO_RECORDS");
  }

  const rows = merchants.map((m, index) => ({
    "S.No": index + 1,
    "Merchant Name": m.name || "",
    Email: m.email || "",
    "Phone Number": m.mobile ? String(m.mobile) : "",
    Status: m.status
      ? m.status.charAt(0).toUpperCase() + m.status.slice(1).toLowerCase()
      : "Active",
    "Joined Date": formatDate(m.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["S.No", "Merchant Name", "Email", "Phone Number", "Status", "Joined Date"],
  });

  // Force phone number column (D, index 3) to be stored as text type
  // to prevent Excel from converting long numbers to scientific notation
  const rowCount = rows.length;
  for (let r = 1; r <= rowCount; r++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[cellAddr]) {
      ws[cellAddr].t = "s"; // string type
      ws[cellAddr].z = "@"; // text number format
    }
  }

  applyColWidths(ws, [
    { wch: 8 },   // S.No
    { wch: 25 },  // Merchant Name
    { wch: 35 },  // Email
    { wch: 18 },  // Phone Number
    { wch: 15 },  // Status
    { wch: 18 },  // Joined Date
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Merchants");

  const resolvedFilename = filename || `Eventoza_Merchants_${getFileDateString()}.xlsx`;
  downloadWorkbook(wb, resolvedFilename);
};

// ─── Transactions Export ──────────────────────────────────────────────────────

/**
 * Capitalises a payment status string cleanly.
 * "partially_paid" → "Partially Paid", "paid" → "Paid", etc.
 */
const formatPaymentStatus = (status) => {
  if (!status) return "";
  return status
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Exports a filtered list of booking/transaction records to an .xlsx file.
 *
 * Columns:
 *   S.No | Payer Name | Payer Email | Transaction / Service |
 *   Transaction Type | Payment Method | Date | Amount (₹) |
 *   Paid Amount (₹) | Remaining Amount (₹) | Status
 *
 * Monetary amounts are stored as plain numbers so Excel can SUM/AVERAGE/sort.
 *
 * @param {Array<Object>} bookings - Already-filtered booking objects
 * @param {string} [filename]
 * @throws {Error} "NO_RECORDS" when array is empty
 */
export const exportTransactionsToExcel = (bookings, filename) => {
  if (!bookings || bookings.length === 0) {
    throw new Error("NO_RECORDS");
  }

  // ── Helpers reused from the page component ────────────────────────────────
  const getPaidAmount = (b) => {
    if (["refunded", "failed", "pending"].includes(b.paymentStatus)) return 0;
    if (b.paymentStatus === "partially_paid" && b.isAdvancePaid)
      return b.advanceAmount || 0;
    return b.price || 0;
  };

  // ── Build rows ────────────────────────────────────────────────────────────
  const rows = bookings.map((b, index) => {
    const isEvent = !!(b.event || b.eventName);
    const transactionName =
      b.serviceName || b.eventName || b.event?.title || b.service?.name || "Booking";
    const total = b.price || 0;
    const paid = getPaidAmount(b);
    const remaining = Math.max(0, total - paid);
    const method = b.paymentMethod ? b.paymentMethod.toUpperCase() : "";

    return {
      "S.No": index + 1,
      "Payer Name": b.customer?.name || "",
      "Payer Email": b.customer?.email || "",
      "Transaction / Service": transactionName,
      "Transaction Type": isEvent ? "Event" : "Service",
      "Payment Method": method,
      Date: formatDate(b.createdAt),
      "Amount (₹)": total,
      "Paid Amount (₹)": paid,
      "Remaining Amount (₹)": remaining,
      Status: formatPaymentStatus(b.paymentStatus),
    };
  });

  const headers = [
    "S.No",
    "Payer Name",
    "Payer Email",
    "Transaction / Service",
    "Transaction Type",
    "Payment Method",
    "Date",
    "Amount (₹)",
    "Paid Amount (₹)",
    "Remaining Amount (₹)",
    "Status",
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Apply INR number format to amount columns (H=7, I=8, J=9 → 0-indexed)
  const amountCols = [7, 8, 9]; // Amount, Paid Amount, Remaining Amount
  const rowCount = rows.length;
  for (let r = 1; r <= rowCount; r++) {
    for (const c of amountCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].t = "n"; // numeric
        ws[addr].z = '₹#,##0.00'; // INR currency format
      }
    }
  }

  // Freeze top header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  applyColWidths(ws, [
    { wch: 6 },   // S.No
    { wch: 22 },  // Payer Name
    { wch: 32 },  // Payer Email
    { wch: 30 },  // Transaction / Service
    { wch: 16 },  // Transaction Type
    { wch: 18 },  // Payment Method
    { wch: 16 },  // Date
    { wch: 16 },  // Amount
    { wch: 16 },  // Paid Amount
    { wch: 18 },  // Remaining Amount
    { wch: 18 },  // Status
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  const resolvedFilename = filename || `Eventoza_Transactions_${getFileDateString()}.xlsx`;
  downloadWorkbook(wb, resolvedFilename);
};

// ─── Commissions Export ───────────────────────────────────────────────────────

/**
 * Exports a filtered list of commission rows to an .xlsx file.
 *
 * Columns:
 *   S.No | Service / Event | Transaction Type | Merchant Name | Merchant Email |
 *   Transaction Date | Transaction Amount (₹) | Commission Rate |
 *   Commission Amount (₹) | Merchant Payout (₹) | Commission Status
 *
 * @param {Array<Object>} commissionRows - Already-filtered commission row objects
 *   Each row: { booking, revenue, commission, payout, adminEarning, rateLabel, isSaved, isAdminBooking }
 * @param {string} [filename]
 * @throws {Error} "NO_RECORDS" when array is empty
 */
export const exportCommissionsToExcel = (commissionRows, filename) => {
  if (!commissionRows || commissionRows.length === 0) {
    throw new Error("NO_RECORDS");
  }

  const rows = commissionRows.map(({ booking, revenue, commission, payout, rateLabel, isSaved, isAdminBooking }, index) => {
    const b = booking;
    const isEvent = !!(b.event || b.eventName);
    const itemName =
      b.service?.name || b.serviceName || b.event?.title || b.eventName || "Booking";
    const merchantName = b.assignedTo?.name || "Unassigned";
    const merchantEmail = b.assignedTo?.email || "";
    const commissionStatus = isSaved ? "Set" : isAdminBooking ? "Admin Direct" : "Not Set";
    const commissionRateDisplay = rateLabel && rateLabel !== "N/A" ? rateLabel : "N/A";

    return {
      "S.No": index + 1,
      "Service / Event": itemName,
      "Transaction Type": isEvent ? "Event" : "Service",
      "Merchant Name": merchantName,
      "Merchant Email": merchantEmail,
      "Transaction Date": formatDate(b.createdAt),
      "Transaction Amount (₹)": revenue || 0,
      "Commission Rate": commissionRateDisplay,
      "Commission Amount (₹)": commission || 0,
      "Merchant Payout (₹)": payout || 0,
      "Commission Status": commissionStatus,
    };
  });

  const headers = [
    "S.No",
    "Service / Event",
    "Transaction Type",
    "Merchant Name",
    "Merchant Email",
    "Transaction Date",
    "Transaction Amount (₹)",
    "Commission Rate",
    "Commission Amount (₹)",
    "Merchant Payout (₹)",
    "Commission Status",
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Apply INR number format to amount columns (G=6, I=8, J=9 → 0-indexed)
  const amountCols = [6, 8, 9]; // Transaction Amount, Commission Amount, Merchant Payout
  const rowCount = rows.length;
  for (let r = 1; r <= rowCount; r++) {
    for (const c of amountCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].t = "n";
        ws[addr].z = '₹#,##0.00';
      }
    }
  }

  // Freeze top header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  applyColWidths(ws, [
    { wch: 6 },   // S.No
    { wch: 28 },  // Service / Event
    { wch: 16 },  // Transaction Type
    { wch: 22 },  // Merchant Name
    { wch: 32 },  // Merchant Email
    { wch: 16 },  // Transaction Date
    { wch: 22 },  // Transaction Amount
    { wch: 16 },  // Commission Rate
    { wch: 22 },  // Commission Amount
    { wch: 20 },  // Merchant Payout
    { wch: 18 },  // Commission Status
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Commissions");

  const resolvedFilename = filename || `Eventoza_Commissions_${getFileDateString()}.xlsx`;
  downloadWorkbook(wb, resolvedFilename);
};
