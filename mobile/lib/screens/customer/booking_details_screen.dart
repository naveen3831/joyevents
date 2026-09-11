import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../services/message_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/customer_app_bar.dart';

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

  void _showRatingDialog() {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Rate Your Experience'),
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
                decoration: const InputDecoration(
                  hintText: 'Share details of your experience...',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
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

  void _showContactOrganiserDialog() {
    final msgController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Message Organiser'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Enquire about booking #${_booking.id.substring(0, _booking.id.length > 8 ? 8 : _booking.id.length)}',
              style: const TextStyle(fontSize: 13, color: AppTheme.subtitleColor),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: msgController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Type your message...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (msgController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              try {
                await _messageService.sendEnquiry(
                  senderName: 'Customer',
                  senderEmail: 'customer@example.com',
                  message: msgController.text.trim(),
                  bookingId: _booking.id,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Message sent to organiser!'),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Failed to send message: $e'),
                      backgroundColor: AppTheme.errorColor,
                    ),
                  );
                }
              }
            },
            child: const Text('Send Message'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Booking Details',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Booking ID: ${_booking.id.substring(0, _booking.id.length > 8 ? 8 : _booking.id.length).toUpperCase()}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.subtitleColor,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _booking.isConfirmed || _booking.isCompleted
                              ? AppTheme.successColor.withOpacity(0.12)
                              : AppTheme.warningColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _booking.status.toUpperCase(),
                          style: TextStyle(
                            color: _booking.isConfirmed || _booking.isCompleted
                                ? AppTheme.successColor
                                : AppTheme.warningColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _booking.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textColor,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.calendar_month_rounded,
                          size: 16, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      Text(
                        '${_booking.date} • ${_booking.time}',
                        style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                      ),
                    ],
                  ),
                  if (_booking.ticketId != null && _booking.ticketId!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.qr_code_2_rounded,
                            size: 16, color: AppTheme.primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'Ticket Code: ${_booking.ticketId}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Payment Breakdown Card
            const Text(
              'Payment Details',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Quantity / Seats',
                          style: TextStyle(color: AppTheme.subtitleColor)),
                      Text('${_booking.quantity}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Method',
                          style: TextStyle(color: AppTheme.subtitleColor)),
                      Text(_booking.paymentMethod.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Status',
                          style: TextStyle(color: AppTheme.subtitleColor)),
                      Text(
                        _booking.paymentStatus.toUpperCase(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.successColor,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Paid',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '₹${_booking.price.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 20,
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

            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _showContactOrganiserDialog,
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Contact Organiser'),
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
