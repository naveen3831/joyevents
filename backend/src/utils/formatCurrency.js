/** Indian numbering: 10501000 → "1,05,01,000" */
export function formatAmount(amount, options = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";

  const hasDecimals = Math.abs(n % 1) > 1e-9;
  const min = options.minimumFractionDigits ?? (hasDecimals ? 2 : 0);
  const max = options.maximumFractionDigits ?? (hasDecimals ? 2 : 0);

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
}

/** Indian currency: ₹1,05,01,000 */
export function formatCurrency(amount, options = {}) {
  return `₹${formatAmount(amount, options)}`;
}
