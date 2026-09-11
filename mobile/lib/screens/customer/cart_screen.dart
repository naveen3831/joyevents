import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../services/cart_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cartService = CartService();

    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Shopping Cart',
        showBack: true,
      ),
      body: ListenableBuilder(
        listenable: cartService,
        builder: (context, _) {
          final items = cartService.items;

          if (items.isEmpty) {
            return EmptyState(
              title: 'Your Cart is Empty',
              message: 'Explore events and services and add them to your cart.',
              icon: Icons.shopping_cart_outlined,
              action: SizedBox(
                width: 200,
                child: AppButton(
                  text: 'Explore Events',
                  onPressed: () => context.go('/customer/events'),
                ),
              ),
            );
          }

          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    final imageUrl = ApiConfig.resolveImageUrl(item.image);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          children: [
                            Container(
                              width: 70,
                              height: 70,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: imageUrl.isNotEmpty
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.network(
                                        imageUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(
                                          Icons.event,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    )
                                  : const Icon(Icons.event, color: Colors.grey),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${item.type.toUpperCase()} • ₹${item.price.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.subtitleColor,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Total: ₹${item.totalPrice.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: () =>
                                      cartService.updateQuantity(item.id, -1),
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20),
                                  onPressed: () =>
                                      cartService.updateQuantity(item.id, 1),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline,
                                      color: AppTheme.errorColor, size: 20),
                                  onPressed: () => cartService.removeItem(item.id),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Bottom Total & Checkout Action
              Container(
                padding: const EdgeInsets.all(20),
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
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal Amount',
                          style: TextStyle(
                            fontSize: 15,
                            color: AppTheme.subtitleColor,
                          ),
                        ),
                        Text(
                          '₹${cartService.subtotal.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    AppButton(
                      text: 'Proceed to Checkout',
                      icon: Icons.payment_rounded,
                      onPressed: () {
                        final firstItem = items.first;
                        final checkoutData = {
                          'type': firstItem.type,
                          'id': firstItem.eventId ?? firstItem.serviceId ?? firstItem.id,
                          'title': firstItem.title,
                          'price': cartService.subtotal,
                          'unitPrice': firstItem.price,
                          'date': firstItem.date,
                          'time': firstItem.time,
                          'ticketType': firstItem.ticketType,
                          'quantity': cartService.itemCount,
                          'image': firstItem.image,
                        };
                        context.push('/customer/checkout', extra: checkoutData);
                      },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
