import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/event_model.dart';
import '../../services/event_service.dart';
import '../../services/message_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

class EventDetailsScreen extends StatefulWidget {
  final String eventId;
  final Object? eventModel;

  const EventDetailsScreen({
    super.key,
    required this.eventId,
    this.eventModel,
  });

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  final EventService _eventService = EventService();
  final MessageService _messageService = MessageService();

  EventModel? _event;
  bool _isLoading = true;
  String? _errorMessage;

  String? _selectedTicketType;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    if (widget.eventModel is EventModel) {
      _event = widget.eventModel as EventModel;
      _isLoading = false;
      if (_event!.tickets.isNotEmpty) {
        _selectedTicketType = _event!.tickets.first.type;
      }
    } else {
      _loadEvent();
    }
  }

  Future<void> _loadEvent() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final fetched = await _eventService.getEventById(widget.eventId);
      if (mounted) {
        setState(() {
          _event = fetched;
          if (_event != null && _event!.tickets.isNotEmpty) {
            _selectedTicketType = _event!.tickets.first.type;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  double get _calculatedPrice {
    if (_event == null) return 0.0;
    if (_event!.isTicketed && _selectedTicketType != null) {
      final tier = _event!.tickets.firstWhere(
        (t) => t.type == _selectedTicketType,
        orElse: () => TicketTier(type: 'General', price: _event!.price, available: 100, sold: 0),
      );
      return tier.price * _quantity;
    }
    return _event!.price * _quantity;
  }

  void _showEnquiryDialog() {
    final messageController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Contact Organiser (${_event?.createdByName ?? "Organiser"})'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Send a direct message regarding this event to the organiser.',
              style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: messageController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Type your message or questions here...',
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
              if (messageController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              try {
                await _messageService.sendEnquiry(
                  senderName: 'Customer',
                  senderEmail: 'customer@example.com',
                  message: messageController.text.trim(),
                  merchantId: _event?.createdById,
                  eventId: _event?.id,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Enquiry message sent to the organiser!'),
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

  void _proceedToCheckout() {
    if (_event == null) return;

    final checkoutPayload = {
      'type': 'event',
      'id': _event!.id,
      'title': _event!.title,
      'price': _calculatedPrice,
      'unitPrice': _calculatedPrice / _quantity,
      'date': _event!.date,
      'time': _event!.time,
      'location': _event!.location,
      'ticketType': _selectedTicketType,
      'quantity': _quantity,
      'image': _event!.mainImage,
    };

    context.push('/customer/checkout', extra: checkoutPayload);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomerAppBar(
        title: _event?.title ?? 'Event Details',
        showBack: true,
      ),
      body: _isLoading
          ? const LoadingView(message: 'Loading event details...')
          : _errorMessage != null || _event == null
              ? ErrorView(
                  message: _errorMessage ?? 'Event not found',
                  onRetry: _loadEvent,
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner Image
                      Container(
                        height: 220,
                        width: double.infinity,
                        color: Colors.grey.shade200,
                        child: ApiConfig.resolveImageUrl(_event!.mainImage).isNotEmpty
                            ? Image.network(
                                ApiConfig.resolveImageUrl(_event!.mainImage),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.event_rounded,
                                  size: 64,
                                  color: Colors.grey,
                                ),
                              )
                            : const Icon(
                                Icons.event_rounded,
                                size: 64,
                                color: Colors.grey,
                              ),
                      ),

                      Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Category & Rating
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    _event!.category,
                                    style: const TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                if (_event!.averageRating > 0)
                                  Row(
                                    children: [
                                      const Icon(Icons.star,
                                          size: 16, color: Colors.amber),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${_event!.averageRating} (${_event!.ratingCount} reviews)',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                              ],
                            ),

                            const SizedBox(height: 12),

                            // Title
                            Text(
                              _event!.title,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textColor,
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Date, Time, Venue Cards
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
                                    children: [
                                      const Icon(Icons.calendar_month_rounded,
                                          color: AppTheme.primaryColor, size: 22),
                                      const SizedBox(width: 12),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Date & Time',
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: AppTheme.subtitleColor),
                                          ),
                                          Text(
                                            _event!.formattedSchedule,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: AppTheme.textColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 20),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on_rounded,
                                          color: AppTheme.primaryColor, size: 22),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Location / Venue',
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color: AppTheme.subtitleColor),
                                            ),
                                            Text(
                                              _event!.location.isNotEmpty
                                                  ? _event!.location
                                                  : 'Venue details provided upon booking',
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                                color: AppTheme.textColor,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (_event!.createdByName != null) ...[
                                    const Divider(height: 20),
                                    Row(
                                      children: [
                                        const Icon(Icons.person_pin_rounded,
                                            color: AppTheme.primaryColor, size: 22),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                'Organiser',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: AppTheme.subtitleColor),
                                              ),
                                              Text(
                                                _event!.createdByName!,
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme.textColor,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        OutlinedButton.icon(
                                          onPressed: _showEnquiryDialog,
                                          icon: const Icon(Icons.chat_bubble_outline, size: 16),
                                          label: const Text('Contact', style: TextStyle(fontSize: 12)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Description
                            const Text(
                              'About Event',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textColor,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _event!.description.isNotEmpty
                                  ? _event!.description
                                  : 'No detailed description available.',
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.5,
                                color: Color(0xFF475569),
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Ticket Selector (if ticketed event)
                            if (_event!.isTicketed && _event!.tickets.isNotEmpty) ...[
                              const Text(
                                'Select Ticket Tier',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textColor,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Column(
                                children: _event!.tickets.map((tier) {
                                  final isSelected = _selectedTicketType == tier.type;
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: isSelected
                                            ? AppTheme.primaryColor
                                            : const Color(0xFFE2E8F0),
                                        width: isSelected ? 2 : 1,
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                      color: isSelected
                                          ? AppTheme.primaryColor.withOpacity(0.04)
                                          : Colors.white,
                                    ),
                                    child: RadioListTile<String>(
                                      value: tier.type,
                                      groupValue: _selectedTicketType,
                                      onChanged: (val) {
                                        setState(() {
                                          _selectedTicketType = val;
                                        });
                                      },
                                      title: Text(
                                        tier.type,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                        ),
                                      ),
                                      subtitle: Text('${tier.remaining} remaining'),
                                      secondary: Text(
                                        '₹${tier.price.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.primaryColor,
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Quantity Selector
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Quantity / Tickets',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textColor,
                                  ),
                                ),
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(color: const Color(0xFFCBD5E1)),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove, size: 18),
                                        onPressed: _quantity > 1
                                            ? () {
                                                setState(() {
                                                  _quantity--;
                                                });
                                              }
                                            : null,
                                      ),
                                      Text(
                                        '$_quantity',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add, size: 18),
                                        onPressed: () {
                                          setState(() {
                                            _quantity++;
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
      bottomNavigationBar: _event == null
          ? null
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total Price',
                        style: TextStyle(fontSize: 12, color: AppTheme.subtitleColor),
                      ),
                      Text(
                        '₹${_calculatedPrice.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: AppButton(
                      text: 'Book Now',
                      icon: Icons.confirmation_number_outlined,
                      onPressed: _proceedToCheckout,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
