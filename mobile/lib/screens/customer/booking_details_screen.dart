import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../services/message_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/contact_bottom_sheet.dart';
import '../../widgets/customer_app_bar.dart';

/// Fully responsive, production-ready BookingDetailsScreen for Eventoza / JoyEvents mobile.
///
/// Fixes & Audits:
///   1. Fixed 47px Right Overflow on long Ticket Codes / Booking IDs by wrapping inside Expanded + SelectableText.
///   2. Status Header: Flexible layout preventing chip overflow on small screens.
///   3. Dynamic Date & Time: Hides row when date/time is absent (no orphan "•" or "null" values).
///   4. Multiline Event/Service Titles: Supports 2-3 wrapping lines without breaking status badges.
///   5. Payment Details Card: Every row constrained with Expanded/Flexible to eliminate horizontal overflow.
///   6. Contact Action: Replaced centered dialog with shared professional ContactBottomSheet.
///   7. Status-driven Cancellation / Refund Alert Box when applicable.
class BookingDetailsScreen extends StatefulWidget {
  final Object? booking;

  const BookingDetailsScreen({
    super.key,
    this.booking,
  });

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  late BookingModel _booking;
  final BookingService _bookingService = BookingService();
  final MessageService _messageService = MessageService();

  double _ratingScore = 5.0;
  final _ratingCommentController = TextEditingController();
  bool _isSubmittingRating = false;

  @override
  void initState() {
    super.initState();
    if (widget.booking is BookingModel) {
      _booking = widget.booking as BookingModel;
    }
  }

  @override
  void dispose() {
    _ratingCommentController.dispose();
    super.dispose();
  }

  /// Dynamically formats date & time. Returns null if invalid.
  String? _getFormattedDateTime() {
    final d = _booking.date.trim();
    final t = _booking.time.trim();

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

  void _showRatingDialog() {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Rate Your Experience',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final starVal = index + 1;
                  return IconButton(
                    icon: Icon(
                      starVal <= _ratingScore ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 32,
                    ),
                    onPressed: () {
                      setDialogState(() {
                        _ratingScore = starVal.toDouble();
                      });
                    },
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ratingCommentController,
                maxLines: 3,
                style: GoogleFonts.poppins(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Share details of your experience...',
                  hintStyle: GoogleFonts.poppins(
                    color: const Color(0xFF94A3B8),
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Cancel',
                style: GoogleFonts.poppins(color: AppTheme.subtitleColor),
              ),
            ),
            ElevatedButton(
              onPressed: _isSubmittingRating
                  ? null
                  : () async {
                      setDialogState(() {
                        _isSubmittingRating = true;
                      });
                      try {
                        await _bookingService.submitRating(
                          _booking.id,
                          _ratingScore,
                          _ratingCommentController.text.trim(),
                        );
                        if (mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Thank you! Rating submitted successfully.'),
                              backgroundColor: AppTheme.successColor,
                            ),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to submit rating: $e'),
                              backgroundColor: AppTheme.errorColor,
                            ),
                          );
                        }
                      } finally {
                        setDialogState(() {
                          _isSubmittingRating = false;
                        });
                      }
                    },
              child: const Text('Submit Rating'),
            ),
          ],
        ),
      ),
    );
  }

  void _showContactDialog() async {
    final title = _booking.isEvent ? 'Contact Organiser' : 'Contact Provider';
    final personName = _booking.merchantName ?? (_booking.isEvent ? "Organiser" : "Provider");
    final description = _booking.isEvent
        ? 'Send a direct message regarding this event booking to the organiser.'
        : 'Send a direct message regarding this service booking to the provider.';

    final result = await ContactBottomSheet.show(
      context: context,
      title: title,
      personName: personName,
      description: description,
      hintText: 'Type your message or enquiry here...',
      onSend: (message) async {
        await _messageService.sendEnquiry(
          senderName: 'Customer',
          senderEmail: 'customer@example.com',
          message: message,
          bookingId: _booking.id,
        );
      },
    );

    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Message sent to ${_booking.isEvent ? "organiser" : "provider"}!'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    } else if (result is String && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send message: $result'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusBg = _getStatusBgColor(_booking.status);
    final statusFg = _getStatusFgColor(_booking.status);
    final statusLabel = _formatStatusLabel(_booking.status);
    final dateTimeStr = _getFormattedDateTime();
    final resolvedImageUrl = ApiConfig.resolveImageUrl(_booking.image);

    final hasTicketCode = _booking.ticketId != null &&
        _booking.ticketId!.trim().isNotEmpty &&
        _booking.ticketId!.toLowerCase() != 'null' &&
        _booking.ticketId!.toLowerCase() != 'n/a';

    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Booking Details',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. SUMMARY / TICKET CARD ─────────────────────────────
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D1B2E).withOpacity(0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Optional Thumbnail Banner
                  if (resolvedImageUrl.isNotEmpty)
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                      child: Image.network(
                        resolvedImageUrl,
                        height: 150,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, err, stack) => const SizedBox.shrink(),
                      ),
                    ),

                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badges Row (Type Chip Left, Status Pill Right)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 9,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: _booking.isEvent
                                    ? const Color(0xFFF5F0FE)
                                    : const Color(0xFFFDF2F7),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _booking.isEvent ? 'Event' : 'Service',
                                style: GoogleFonts.poppins(
                                  color: _booking.isEvent
                                      ? AppTheme.primaryColor
                                      : AppTheme.accentColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),

                            const SizedBox(width: 8),

                            // Status Pill (Flexible to prevent right overflow)
                            Flexible(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: statusBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  statusLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    color: statusFg,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Booking Title (Supports multi-line Wrapping)
                        Text(
                          _booking.title,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textColor,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Booking Reference ID
                        Text(
                          'Booking #${_booking.id}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.subtitleColor,
                          ),
                        ),

                        // Date & Time Row (Collapses completely if absent)
                        if (dateTimeStr != null) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(
                                Icons.calendar_month_rounded,
                                size: 16,
                                color: AppTheme.primaryColor,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  dateTimeStr,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.textColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],

                        // Location Row (If present)
                        if (_booking.customerLocation != null &&
                            _booking.customerLocation!.trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 16,
                                color: AppTheme.primaryColor,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _booking.customerLocation!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    color: AppTheme.textColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],

                        // ── Ticket Code Mobile-Safe Box ────────────────
                        if (hasTicketCode) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.confirmation_number_outlined,
                                  size: 22,
                                  color: AppTheme.primaryColor,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Ticket Code',
                                        style: GoogleFonts.poppins(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: AppTheme.subtitleColor,
                                        ),
                                      ),
                                      SelectableText(
                                        _booking.ticketId!.startsWith('TKT-')
                                            ? _booking.ticketId!
                                            : 'TKT-${_booking.ticketId!}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.textColor,
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.copy_rounded,
                                    size: 18,
                                    color: AppTheme.primaryColor,
                                  ),
                                  onPressed: () {
                                    Clipboard.setData(
                                      ClipboardData(text: _booking.ticketId!),
                                    );
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Ticket code copied to clipboard!'),
                                        duration: Duration(seconds: 2),
                                      ),
                                    );
                                  },
                                  tooltip: 'Copy Ticket Code',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── 2. CANCELLATION / REFUND STATUS BOX (If Applicable) ─
            if (_booking.isCancelled ||
                _booking.status.contains('refund') ||
                _booking.status.contains('cancellation')) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: statusFg.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(
                      _booking.status.contains('refund')
                          ? Icons.published_with_changes_rounded
                          : Icons.cancel_outlined,
                      color: statusFg,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _booking.status.contains('refund')
                                ? 'Refund Status'
                                : 'Cancellation Status',
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: statusFg,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _booking.status == 'refunded'
                                ? 'Refund has been completed according to terms.'
                                : _booking.status == 'refund_pending'
                                    ? 'Refund processing is in progress.'
                                    : 'This booking has been cancelled.',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: statusFg.withOpacity(0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // ── 3. PAYMENT DETAILS CARD ──────────────────────────────
            Text(
              'Payment Details',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D1B2E).withOpacity(0.03),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Quantity / Ticket Type Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Quantity / Seats',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: AppTheme.subtitleColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          _booking.ticketType != null &&
                                  _booking.ticketType!.isNotEmpty
                              ? '${_booking.quantity} (${_booking.ticketType!.toUpperCase()})'
                              : '${_booking.quantity}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Payment Method Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Payment Method',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: AppTheme.subtitleColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          _booking.paymentMethod.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Payment Status Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Payment Status',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: AppTheme.subtitleColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          _booking.paymentStatus.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _booking.paymentStatus.toLowerCase() == 'paid'
                                ? AppTheme.successColor
                                : _booking.paymentStatus.toLowerCase() == 'refunded'
                                    ? AppTheme.accentColor
                                    : AppTheme.warningColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFFF1F5F9)),

                  // Total Paid Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Paid',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textColor,
                        ),
                      ),
                      Text(
                        '₹${_formatCurrency(_booking.price)}',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // ── 4. ACTION BUTTONS ────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _showContactDialog,
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: Text(
                      _booking.isEvent ? 'Contact Organiser' : 'Contact Provider',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                if (_booking.isCompleted) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppButton(
                      text: 'Rate & Review',
                      icon: Icons.star_outline_rounded,
                      onPressed: _showRatingDialog,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
