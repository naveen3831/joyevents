import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../models/wallet_model.dart';
import '../../services/auth_service.dart';
import '../../services/wallet_service.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/transaction_card.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final WalletService _walletService = WalletService();
  final List<TransactionModel> _transactions = [];

  void _showAddMoneyDialog() {
    final amountController = TextEditingController();
    final upiController = TextEditingController(text: 'customer@upi');
    String paymentMethod = 'upi';
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add Funds to Wallet'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppTextField(
                controller: amountController,
                label: 'Amount (₹)',
                hint: '500',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: paymentMethod,
                decoration: const InputDecoration(labelText: 'Payment Method'),
                items: const [
                  DropdownMenuItem(value: 'upi', child: Text('UPI Payment')),
                  DropdownMenuItem(value: 'card', child: Text('Debit/Credit Card')),
                ],
                onChanged: (val) {
                  setDialogState(() {
                    paymentMethod = val!;
                  });
                },
              ),
              const SizedBox(height: 12),
              if (paymentMethod == 'upi')
                AppTextField(
                  controller: upiController,
                  label: 'UPI ID',
                  hint: 'name@upi',
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final amt = double.tryParse(amountController.text) ?? 0;
                      if (amt <= 0) return;
                      setDialogState(() {
                        isSubmitting = true;
                      });

                      try {
                        await _walletService.addWalletFunds(
                          amount: amt,
                          paymentMethod: paymentMethod,
                          paymentDetails: {
                            'upiId': upiController.text,
                            'cardNumber': '4111222233334444',
                            'cvv': '123',
                          },
                        );

                        if (mounted) {
                          Navigator.pop(ctx);
                          setState(() {});
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('₹${amt.toStringAsFixed(0)} added to wallet successfully!'),
                              backgroundColor: AppTheme.successColor,
                            ),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to add funds: $e'),
                              backgroundColor: AppTheme.errorColor,
                            ),
                          );
                        }
                      } finally {
                        setDialogState(() {
                          isSubmitting = false;
                        });
                      }
                    },
              child: const Text('Add Funds'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'JoyEvents Wallet',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryColor, AppTheme.accentColor],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Available Balance',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '₹${user?.walletBalance.toStringAsFixed(2) ?? "0.00"}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _showAddMoneyDialog,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppTheme.primaryColor,
                          ),
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('Add Money'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            const Text(
              'Recent Wallet Activity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 12),

            if (_transactions.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(
                          Icons.account_balance_wallet_outlined,
                          size: 40,
                          color: AppTheme.subtitleColor,
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'No Recent Transactions',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Your deposit & booking payments will appear here.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _transactions.length,
                itemBuilder: (context, index) {
                  final tx = _transactions[index];
                  return TransactionCard(transaction: tx);
                },
              ),
          ],
        ),
      ),
    );
  }
}
