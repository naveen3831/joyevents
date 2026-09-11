import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/cart_model.dart';
import '../../models/service_model.dart';
import '../../services/cart_service.dart';
import '../../services/message_service.dart';

import '../../widgets/app_button.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

class ServiceDetailsScreen extends StatefulWidget {
  final String serviceId;
  final Object? serviceModel;

  const ServiceDetailsScreen({
    super.key,
    required this.serviceId,
    this.serviceModel,
  });

  @override
  State<ServiceDetailsScreen> createState() => _ServiceDetailsScreenState();
}

class _ServiceDetailsScreenState extends State<ServiceDetailsScreen> {
  final MessageService _messageService = MessageService();

  ServiceModel? _service;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.serviceModel is ServiceModel) {
      _service = widget.serviceModel as ServiceModel;
    }
  }

  void _addToCart() {
    if (_service == null) return;

    final cartItem = CartItem(
      id: _service!.id,
      title: _service!.name,
      type: 'service',
      serviceId: _service!.id,
      price: _service!.price,
      image: _service!.mainImage,
      date: DateTime.now().add(const Duration(days: 7)).toString().substring(0, 10),
      time: '10:00 AM',
    );

    CartService().addItem(cartItem);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${_service!.name} added to cart!'),
        backgroundColor: AppTheme.successColor,
        action: SnackBarAction(
          label: 'View Cart',
          textColor: Colors.white,
          onPressed: () => context.push('/customer/cart'),
        ),
      ),
    );
  }

  void _bookNow() {
    if (_service == null) return;

    final checkoutPayload = {
      'type': 'service',
      'id': _service!.id,
      'title': _service!.name,
      'price': _service!.price,
      'unitPrice': _service!.price,
      'date': DateTime.now().add(const Duration(days: 7)).toString().substring(0, 10),
      'time': '10:00 AM',
      'location': _service!.location,
      'quantity': 1,
      'image': _service!.mainImage,
    };

    context.push('/customer/checkout', extra: checkoutPayload);
  }

  void _showEnquiryDialog() {
    final messageController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Contact Provider (${_service?.createdByName ?? "Provider"})'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Send a direct message regarding this service.',
              style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: messageController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Type your message or custom requirements...',
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
                  merchantId: _service?.createdById,
                  serviceId: _service?.id,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Enquiry message sent to the service provider!'),
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
      appBar: CustomerAppBar(
        title: _service?.name ?? 'Service Details',
        showBack: true,
      ),
      body: _isLoading
          ? const LoadingView(message: 'Loading service details...')
          : _errorMessage != null || _service == null
              ? ErrorView(
                  message: _errorMessage ?? 'Service details unavailable',
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner Image
                      Container(
                        height: 220,
                        width: double.infinity,
                        color: Colors.purple.shade50,
                        child: ApiConfig.resolveImageUrl(_service!.mainImage).isNotEmpty
                            ? Image.network(
                                ApiConfig.resolveImageUrl(_service!.mainImage),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.design_services_rounded,
                                  size: 64,
                                  color: AppTheme.accentColor,
                                ),
                              )
                            : const Icon(
                                Icons.design_services_rounded,
                                size: 64,
                                color: AppTheme.accentColor,
                              ),
                      ),

                      Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.accentColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    _service!.category,
                                    style: const TextStyle(
                                      color: AppTheme.accentColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                if (_service!.averageRating > 0)
                                  Row(
                                    children: [
                                      const Icon(Icons.star,
                                          size: 16, color: Colors.amber),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${_service!.averageRating} (${_service!.ratingCount} reviews)',
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

                            Text(
                              _service!.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textColor,
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Provider & Location Card
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.backgroundColor,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                children: [
                                  if (_service!.createdByName != null)
                                    Row(
                                      children: [
                                        const Icon(Icons.storefront_rounded,
                                            color: AppTheme.accentColor, size: 22),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                'Provider',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: AppTheme.subtitleColor),
                                              ),
                                              Text(
                                                _service!.createdByName!,
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
                                          label: const Text('Enquire', style: TextStyle(fontSize: 12)),
                                        ),
                                      ],
                                    ),
                                  if (_service!.location.isNotEmpty) ...[
                                    const Divider(height: 20),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on_rounded,
                                            color: AppTheme.accentColor, size: 22),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                'Location / Coverage',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: AppTheme.subtitleColor),
                                              ),
                                              Text(
                                                _service!.location,
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
                                  ],
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            const Text(
                              'Service Description',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textColor,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _service!.description.isNotEmpty
                                  ? _service!.description
                                  : 'No detailed description provided for this service.',
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.5,
                                color: Color(0xFF475569),
                              ),
                            ),

                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
      bottomNavigationBar: _service == null
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
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _addToCart,
                      icon: const Icon(Icons.add_shopping_cart_rounded),
                      label: const Text('Add to Cart'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppButton(
                      text: 'Book Now',
                      onPressed: _bookNow,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
