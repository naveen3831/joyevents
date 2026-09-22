/// Indian Rupee currency formatting utility.
///
/// Formats numbers using the Indian numbering system:
///   12345678 → 1,23,45,678  (last 3 digits, then groups of 2)
///
/// Usage:
///   formatINR(1118778)  → '₹11,18,778'
///   formatINR(0)        → '₹0'
String formatINR(double amount) {
  final isNegative = amount < 0;
  final abs = amount.abs();
  final intPart = abs.truncate().toString();

  String formatted;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    // Last 3 digits stay as-is, then group remaining digits in pairs from right
    final last3 = intPart.substring(intPart.length - 3);
    final remaining = intPart.substring(0, intPart.length - 3);
    final RegExp reg = RegExp(r'(\d)(?=(\d{2})+$)');
    final groupedRemaining =
        remaining.replaceAllMapped(reg, (Match m) => '${m[1]},');
    formatted = '$groupedRemaining,$last3';
  }

  return '${isNegative ? '-' : ''}₹$formatted';
}

/// Formats a number with Indian grouping but without the ₹ symbol.
String formatIndianNumber(double amount) {
  final isNegative = amount < 0;
  final abs = amount.abs();
  final intPart = abs.truncate().toString();

  String formatted;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    final last3 = intPart.substring(intPart.length - 3);
    final remaining = intPart.substring(0, intPart.length - 3);
    final RegExp reg = RegExp(r'(\d)(?=(\d{2})+$)');
    final groupedRemaining =
        remaining.replaceAllMapped(reg, (Match m) => '${m[1]},');
    formatted = '$groupedRemaining,$last3';
  }

  return '${isNegative ? '-' : ''}$formatted';
}
