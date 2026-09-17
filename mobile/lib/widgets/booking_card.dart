import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/api_config.dart';
import '../config/app_theme.dart';
import '../models/booking_model.dart';

/// Modern compact horizontal booking card for Eventoza / JoyEvents mobile app.
///
/// Layout Structure:
///   ┌─────────────────────────────────────┐
///   │ ┌──────────┐  [Event]     Confirmed │
///   │ │          │                        │
///   │ │  IMAGE   │  Birthday              │
///   │ │          │  🎟 TKT-178877...      │
///   │ └──────────┘                        │
///   │                                     │
///   │ Total ₹10,000         View Details →│
///   └─────────────────────────────────────┘
class BookingCard extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onTap;

  const BookingCard({
    super.key,
    required this.booking,
    required this.onTap,
  });

  /// Dynamically formats date & time.
  /// Returns null if neither date nor time is valid.
  String? _getFormattedDateTime() {
    final d = booking.date.trim();
    final t = booking.time.trim();

    final hasDate =
        d.isNotEmpty && d.toLowerCase() != 'null' && d.toLowerCase() != 'n/a';
    final hasTime =
        t.isNotEmpty && t.toLowerCase() != 'null' && t.toLowerCase() != 'n/a';

    if (!hasDate && !hasTime) return null;

    String formattedDate = '';
    if (hasDate) {
      if (d.contains('T')) {
        try {
          final dt = DateTime.parse(d);
          final months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
          ];
          formattedDate = '${dt.day} ${months[dt.month - 1]} ${dt.year}';
        } catch (_) {
          formattedDate = d;
        }
      } else {
        formattedDate = d;
      }
    }

    if (hasDate && hasTime) {
      return '$formattedDate • $t';
    } else if (hasDate) {
      return formattedDate;
    } else {
      return t;
    }
  }

  /// Builds a dynamic, truncated Ticket / Reference ID row.
  Widget? _buildIdentifierRow() {
    final tId = booking.ticketId?.trim();
    final hasTicket = tId != null &&
        tId.isNotEmpty &&
        tId.toLowerCase() != 'null' &&
        tId.toLowerCase() != 'n/a';

    final bId = booking.id.trim();
    final hasBookingId = bId.isNotEmpty &&
        bId.toLowerCase() != 'null' &&
        bId.toLowerCase() != 'n/a';

    if (!hasTicket && !hasBookingId) return null;

    String text;
    IconData iconData;

    if (hasTicket) {
      iconData = Icons.confirmation_number_outlined;
      String displayTkt = tId;
      if (displayTkt.length > 20) {
        displayTkt = '${displayTkt.substring(0, 17)}...';
      }
      text = displayTkt.startsWith('TKT-') ? displayTkt : 'TKT-$displayTkt';
    } else {
      iconData = Icons.receipt_long_outlined;
      String displayRef = bId;
      if (displayRef.length > 14) {
        displayRef = '${displayRef.substring(0, 10)}...';
      }
      text = 'Booking #$displayRef';
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          iconData,
          size: 13,
          color: AppTheme.subtitleColor,
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.poppins(
              fontSize: 11.5,
              fontWeight: FontWeight.w500,
              color: AppTheme.subtitleColor,
            ),
          ),
        ),
      ],
    );
  }

  /// Formats currency e.g. 10000 -> 10,000
  String _formatCurrency(double price) {
    final numStr = price.toStringAsFixed(0);
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return numStr.replaceAllMapped(reg, (Match m) => '${m[1]},');
  }

  Color _getStatusBgColor(String status) {
    final s = status.toLowerCase();
    if (s == 'confirmed') return const Color(0xFFDCFCE7); // light green
    if (s == 'completed') return const Color(0xFFF3E8FF); // light purple
    if (s == 'pending_approval' ||
        s == 'awaiting_payment' ||
        s == 'pending' ||
        s == 'cancellation_requested') {
      return const Color(0xFFFEF3C7); // light amber
    }
    if (s == 'refunded' || s == 'refund_pending') return const Color(0xFFFCE7F3); // light pink
    if (s == 'cancelled' || s == 'rejected') return const Color(0xFFFEE2E2); // light red
    return const Color(0xFFF1F5F9);
  }

  Color _getStatusFgColor(String status) {
    final s = status.toLowerCase();
    if (s == 'confirmed') return const Color(0xFF15803D); // dark green
    if (s == 'completed') return const Color(0xFF7E22CE); // dark purple
    if (s == 'pending_approval' ||
        s == 'awaiting_payment' ||
        s == 'pending' ||
        s == 'cancellation_requested') {
      return const Color(0xFFB45309); // dark amber
    }
    if (s == 'refunded' || s == 'refund_pending') return const Color(0xFFBE185D); // dark pink
    if (s == 'cancelled' || s == 'rejected') return const Color(0xFFB91C1C); // dark red
    return AppTheme.subtitleColor;
  }

  String _formatStatusLabel(String status) {
    final s = status.toLowerCase();
    switch (s) {
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'pending_approval':
        return 'Pending Approval';
      case 'awaiting_payment':
        return 'Awaiting Payment';
      case 'pending':
        return 'Processing';
      case 'cancellation_requested':
        return 'Cancel Requested';
      case 'refunded':
        return 'Refunded';
      case 'refund_pending':
        return 'Refund Pending';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        if (status.isEmpty) return 'Confirmed';
        return status[0].toUpperCase() + status.substring(1);
    }
  }

  /// Builds thumbnail image on the left with consistent dimensions
  Widget _buildThumbnailImage() {
    final resolvedUrl = ApiConfig.resolveImageUrl(booking.image);

    return SizedBox(
      width: 96,
      height: 100,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: resolvedUrl.isNotEmpty
            ? Image.network(
                resolvedUrl,
                width: 96,
                height: 100,
                fit: BoxFit.cover,
                errorBuilder: (ctx, err, stack) => _buildFallbackThumbnail(),
                loadingBuilder: (ctx, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Container(
                    width: 96,
                    height: 100,
                    color: const Color(0xFFEDF0F9),
                    child: const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  );
                },
              )
            : _buildFallbackThumbnail(),
      ),
    );
  }

  /// Branded fallback thumbnail when image is missing or unavailable
  Widget _buildFallbackThumbnail() {
    return Container(
      width: 96,
      height: 100,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: booking.isEvent
              ? [const Color(0xFFF5F0FE), const Color(0xFFEDE9FE)]
              : [const Color(0xFFFDF2F7), const Color(0xFFFCE7F3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            booking.isEvent
                ? Icons.confirmation_number_rounded
                : Icons.design_services_rounded,
            size: 28,
            color: booking.isEvent
                ? AppTheme.primaryColor
                : AppTheme.accentColor,
          ),
          const SizedBox(height: 4),
          Text(
            booking.isEvent ? 'EVENT' : 'SERVICE',
            style: GoogleFonts.poppins(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: booking.isEvent
                  ? AppTheme.primaryColor
                  : AppTheme.accentColor,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusBg = _getStatusBgColor(booking.status);
    final statusFg = _getStatusFgColor(booking.status);
    final statusLabel = _formatStatusLabel(booking.status);
    final dateTimeStr = _getFormattedDateTime();
    final identifierWidget = _buildIdentifierRow();

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0D1B2E).withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Subtle Accent Line on Left Edge
                Container(
                  width: 4,
                  color: booking.isEvent
                      ? AppTheme.primaryColor
                      : AppTheme.accentColor,
                ),

                // Card Main Content
                Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: onTap,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // ── TOP SECTION: Image (Left) + Details (Right) ──
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Left Thumbnail Image
                                _buildThumbnailImage(),

                                const SizedBox(width: 12),

                                // Right Details Column
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // 1. Badges Row
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          // Type Chip
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 7,
                                              vertical: 2.5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: booking.isEvent
                                                  ? const Color(0xFFF5F0FE)
                                                  : const Color(0xFFFDF2F7),
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              booking.isEvent
                                                  ? 'Event'
                                                  : 'Service',
                                              style: GoogleFonts.poppins(
                                                color: booking.isEvent
                                                    ? AppTheme.primaryColor
                                                    : AppTheme.accentColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),

                                          // Status Pill
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 3,
                                            ),
                                            decoration: BoxDecoration(
                                              color: statusBg,
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              statusLabel,
                                              style: GoogleFonts.poppins(
                                                color: statusFg,
                                                fontSize: 10.5,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),

                                      // 2. Title (Max 2 lines)
                                      Text(
                                        booking.title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.poppins(
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.textColor,
                                          height: 1.2,
                                        ),
                                      ),

                                      // 3. Date & Time (Collapses if null)
                                      if (dateTimeStr != null) ...[
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.event_outlined,
                                              size: 13,
                                              color: AppTheme.subtitleColor,
                                            ),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                dateTimeStr,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: GoogleFonts.poppins(
                                                  fontSize: 11.5,
                                                  color: AppTheme.subtitleColor,
                                                  fontWeight: FontWeight.w400,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],

                                      // 4. Ticket / Reference ID (Collapses if null)
                                      if (identifierWidget != null) ...[
                                        const SizedBox(height: 4),
                                        identifierWidget,
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 10),

                            // ── BOTTOM SECTION: Total Amount & View Details ──
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Row(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text(
                                      'Total ',
                                      style: GoogleFonts.poppins(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: AppTheme.subtitleColor,
                                      ),
                                    ),
                                    Text(
                                      '₹${_formatCurrency(booking.price)}',
                                      style: GoogleFonts.poppins(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.textColor,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'View Details',
                                      style: GoogleFonts.poppins(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.arrow_forward_rounded,
                                      size: 13,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
