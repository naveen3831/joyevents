import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/booking_service.dart';
import '../../services/cart_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/customer_app_bar.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic>? checkoutData;

  const CheckoutScreen({
    super.key,
    this.checkoutData,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final BookingService _bookingService = BookingService();

  late String _title;
  late String _type; // 'event' or 'service'
  late String _itemId;
  late double _price;
  late String _date;
  late String _time;
  String? _ticketType;
  int _quantity = 1;

  final _locationController = TextEditingController();
  final _promoController = TextEditingController();
  final _upiController = TextEditingController();
  final _cardNumberController = TextEditingController();
  final _cardCvvController = TextEditingController();

  String _paymentMethod = 'card'; // 'wallet', 'card', 'upi'
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final data = widget.checkoutData ?? {};
    _title = data['title']?.toString() ?? 'Event Booking';
    _type = data['type']?.toString() ?? 'event';
    _itemId = data['id']?.toString() ?? '';
    _price = (data['price'] is num) ? (data['price'] as num).toDouble() : 0.0;
    _date = data['date']?.toString() ??
        DateTime.now().add(const Duration(days: 3)).toString().substring(0, 10);
    _time = data['time']?.toString() ?? '06:00 PM';
    _ticketType = data['ticketType']?.toString();
    _quantity = (data['quantity'] is num) ? (data['quantity'] as num).toInt() : 1;
    _locationController.text = data['location']?.toString() ?? '';
  }

  @override
  void dispose() {
    _locationController.dispose();
    _promoController.dispose();
    _upiController.dispose();
    _cardNumberController.dispose();
    _cardCvvController.dispose();
    super.dispose();
  }

  Future<void> _handleConfirmBooking() async {
    if (!_formKey.currentState!.validate()) return;

    final user = AuthService().currentUser;
    if (_paymentMethod == 'wallet' && (user?.walletBalance ?? 0) < _price) {
      setState(() {
        _errorMessage = 'Insufficient wallet balance. Please add funds or choose another payment method.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final payload = <String, dynamic>{
        if (_type == 'event') 'eventName': _title else 'serviceName': _title,
        if (_type == 'event') 'eventId': _itemId else 'serviceId': _itemId,
        'price': _price,
        'date': _date,
        'time': _time,
        'quantity': _quantity,
        'paymentMethod': _paymentMethod,
        'customerLocation': _locationController.text.trim(),
        if (_ticketType != null) 'ticketType': _ticketType,
        if (_paymentMethod == 'wallet') 'useWallet': true,
        if (_paymentMethod == 'wallet') 'walletAmountPaid': _price,
        if (_paymentMethod == 'upi')
          'paymentDetails': {'upiId': _upiController.text.trim()},
        if (_paymentMethod == 'card')
          'paymentDetails': {
            'cardNumber': _cardNumberController.text.trim(),
            'cvv': _cardCvvController.text.trim(),
            'cardLast4': _cardNumberController.text.length >= 4
                ? _cardNumberController.text.substring(_cardNumberController.text.length - 4)
                : '1234',
          },
        if (_promoController.text.trim().isNotEmpty)
          'promoCode': {'code': _promoController.text.trim()},
      };

      await _bookingService.createBooking(payload);

      // Clear cart
      CartService().clearCart();

      // Refresh User me profile to sync wallet balance if wallet was used
      await AuthService().getMe();

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 28),
                SizedBox(width: 10),
                Text('Booking Confirmed!'),
              ],
            ),
            content: Text(
              'Your booking for "$_title" has been placed successfully.',
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/customer/bookings');
                },
                child: const Text('View My Bookings'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Checkout & Payment',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.backgroundColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textColor,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Date: $_date • Time: $_time',
                      style: const TextStyle(fontSize: 13, color: AppTheme.subtitleColor),
                    ),
                    if (_ticketType != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Tier: $_ticketType (Qty: $_quantity)',
                        style: const TextStyle(fontSize: 13, color: AppTheme.subtitleColor),
                      ),
                    ],
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Payable',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '₹${_price.toStringAsFixed(0)}',
                          style: const TextStyle(
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

              const SizedBox(height: 24),

              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppTheme.errorColor, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Customer Location Input
              AppTextField(
                controller: _locationController,
                label: 'Event Venue / Delivery Address',
                hint: '123 Main St, City, Zip Code',
                prefixIcon: const Icon(Icons.location_on_outlined, size: 20),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please enter location address';
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Promo / Referral Code Input
              AppTextField(
                controller: _promoController,
                label: 'Promo / Referral Code (Optional)',
                hint: 'ENTER CODE',
                prefixIcon: const Icon(Icons.confirmation_number_outlined, size: 20),
              ),

              const SizedBox(height: 24),

              const Text(
                'Select Payment Method',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textColor,
                ),
              ),
              const SizedBox(height: 12),

              // Wallet Option
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _paymentMethod == 'wallet'
                        ? AppTheme.primaryColor
                        : const Color(0xFFE2E8F0),
                    width: _paymentMethod == 'wallet' ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: RadioListTile<String>(
                  value: 'wallet',
                  groupValue: _paymentMethod,
                  onChanged: (val) {
                    setState(() {
                      _paymentMethod = val!;
                    });
                  },
                  title: const Text('JoyEvents Wallet', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('Balance: ₹${user?.walletBalance.toStringAsFixed(0) ?? "0"}'),
                  secondary: const Icon(Icons.account_balance_wallet_outlined, color: AppTheme.primaryColor),
                ),
              ),

              // Card Option
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _paymentMethod == 'card'
                        ? AppTheme.primaryColor
                        : const Color(0xFFE2E8F0),
                    width: _paymentMethod == 'card' ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: RadioListTile<String>(
                  value: 'card',
                  groupValue: _paymentMethod,
                  onChanged: (val) {
                    setState(() {
                      _paymentMethod = val!;
                    });
                  },
                  title: const Text('Credit / Debit Card', style: TextStyle(fontWeight: FontWeight.bold)),
                  secondary: const Icon(Icons.credit_card_rounded, color: AppTheme.primaryColor),
                ),
              ),

              if (_paymentMethod == 'card') ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8),
                  child: Column(
                    children: [
                      AppTextField(
                        controller: _cardNumberController,
                        label: 'Card Number',
                        hint: '4111 2222 3333 4444',
                        keyboardType: TextInputType.number,
                        validator: (val) {
                          if (_paymentMethod == 'card' && (val == null || val.length < 12)) {
                            return 'Enter valid card number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),
                      AppTextField(
                        controller: _cardCvvController,
                        label: 'CVV',
                        hint: '123',
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        validator: (val) {
                          if (_paymentMethod == 'card' && (val == null || val.length < 3)) {
                            return 'Enter CVV';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ],

              // UPI Option
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _paymentMethod == 'upi'
                        ? AppTheme.primaryColor
                        : const Color(0xFFE2E8F0),
                    width: _paymentMethod == 'upi' ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: RadioListTile<String>(
                  value: 'upi',
                  groupValue: _paymentMethod,
                  onChanged: (val) {
                    setState(() {
                      _paymentMethod = val!;
                    });
                  },
                  title: const Text('UPI Payment', style: TextStyle(fontWeight: FontWeight.bold)),
                  secondary: const Icon(Icons.mobile_friendly_rounded, color: AppTheme.primaryColor),
                ),
              ),

              if (_paymentMethod == 'upi') ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8),
                  child: AppTextField(
                    controller: _upiController,
                    label: 'UPI ID',
                    hint: 'user@upi',
                    validator: (val) {
                      if (_paymentMethod == 'upi' && (val == null || !val.contains('@'))) {
                        return 'Enter valid UPI ID';
                      }
                      return null;
                    },
                  ),
                ),
              ],

              const SizedBox(height: 32),

              AppButton(
                text: 'Confirm & Pay ₹${_price.toStringAsFixed(0)}',
                isLoading: _isLoading,
                onPressed: _handleConfirmBooking,
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
