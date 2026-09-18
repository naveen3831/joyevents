import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';

class MerchantWalletScreen extends StatefulWidget {
  const MerchantWalletScreen({super.key});

  @override
  State<MerchantWalletScreen> createState() => _MerchantWalletScreenState();
}

class _MerchantWalletScreenState extends State<MerchantWalletScreen>
    with SingleTickerProviderStateMixin {
  final _merchantService = MerchantService();
  late final TabController _tabController;

  bool _loading = true;
  String? _error;
  Map<String, dynamic> _dashboard = {};
  List<dynamic> _transactions = [];
  List<dynamic> _withdrawals = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _merchantService.getEarningsDashboard(),
        _merchantService.getTransactions(),
        _merchantService.getWithdrawals(),
      ]);
      setState(() {
        _dashboard = results[0] as Map<String, dynamic>;
        _transactions = results[1] as List;
        _withdrawals = results[2] as List;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _showWithdrawalModal() async {
    final amtCtrl = TextEditingController();
    final bankCtrl = TextEditingController();
    final ifscCtrl = TextEditingController();
    final accountCtrl = TextEditingController();

    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Request Withdrawal',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
              const SizedBox(height: 4),
              const Text('Enter your bank details',
                  style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor)),
              const SizedBox(height: 20),
              TextField(
                controller: amtCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Amount (₹)', prefixIcon: Icon(Icons.currency_rupee)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: bankCtrl,
                decoration: const InputDecoration(
                    labelText: 'Bank Name', prefixIcon: Icon(Icons.account_balance_outlined)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: accountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Account Number', prefixIcon: Icon(Icons.credit_card_outlined)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: ifscCtrl,
                decoration: const InputDecoration(
                    labelText: 'IFSC Code', prefixIcon: Icon(Icons.code_outlined)),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel')),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context, {
                          'amount': double.tryParse(amtCtrl.text.trim()) ?? 0,
                          'bankName': bankCtrl.text.trim(),
                          'accountNumber': accountCtrl.text.trim(),
                          'ifscCode': ifscCtrl.text.trim(),
                        });
                      },
                      child: const Text('Submit'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (result != null && result['amount'] != null) {
      try {
        await _merchantService.requestWithdrawal(result);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Withdrawal request submitted!'),
            backgroundColor: AppTheme.successColor,
          ));
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Earnings & Wallet'),
        backgroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: AppTheme.subtitleColor,
          indicatorColor: AppTheme.primaryColor,
          tabs: const [
            Tab(text: 'Transactions'),
            Tab(text: 'Withdrawals'),
          ],
        ),
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    _buildBalanceCard(),
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildTransactionList(),
                          _buildWithdrawalList(),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildBalanceCard() {
    final grossRevenue =
        (_dashboard['grossRevenue'] as num?)?.toDouble() ?? 0.0;
    final totalEarnings =
        (_dashboard['totalEarnings'] as num?)?.toDouble() ?? 0.0;
    final totalWithdrawn =
        (_dashboard['totalWithdrawn'] as num?)?.toDouble() ?? 0.0;
    final available =
        (_dashboard['availableBalance'] as num?)?.toDouble() ?? 0.0;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.gradientPrimaryDiagonal,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.glowShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Available Balance',
              style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
          const SizedBox(height: 4),
          Text('₹${available.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                  child: _BalanceStat(
                      'Gross Revenue', '₹${grossRevenue.toStringAsFixed(0)}')),
              Expanded(
                  child: _BalanceStat(
                      'Net Earnings', '₹${totalEarnings.toStringAsFixed(0)}')),
              Expanded(
                  child: _BalanceStat(
                      'Withdrawn', '₹${totalWithdrawn.toStringAsFixed(0)}')),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _showWithdrawalModal,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('Request Withdrawal',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionList() {
    if (_transactions.isEmpty) {
      return const Center(
        child: Text('No transactions yet',
            style: TextStyle(color: AppTheme.subtitleColor)),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _TransactionTile(tx: _transactions[i]),
    );
  }

  Widget _buildWithdrawalList() {
    if (_withdrawals.isEmpty) {
      return const Center(
        child: Text('No withdrawal requests',
            style: TextStyle(color: AppTheme.subtitleColor)),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _withdrawals.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _WithdrawalTile(w: _withdrawals[i]),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
          const SizedBox(height: 12),
          Text(_error ?? 'Error', style: const TextStyle(color: AppTheme.subtitleColor)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _BalanceStat extends StatelessWidget {
  final String label;
  final String value;
  const _BalanceStat(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
        Text(label,
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10)),
      ],
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Map<String, dynamic> tx;
  const _TransactionTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;
    final type = tx['type']?.toString() ?? '';
    final desc = tx['description']?.toString() ?? type;
    final dateStr = tx['createdAt']?.toString() ?? '';
    String date = '';
    if (dateStr.isNotEmpty) {
      try {
        final d = DateTime.parse(dateStr);
        date = '${d.day}/${d.month}/${d.year}';
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.tintVioletBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.swap_horiz_rounded,
                color: AppTheme.tintVioletFg, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(desc,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textColor)),
                if (date.isNotEmpty)
                  Text(date,
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.subtitleColor)),
              ],
            ),
          ),
          Text(
            '₹${amount.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: amount >= 0 ? AppTheme.successColor : AppTheme.errorColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _WithdrawalTile extends StatelessWidget {
  final Map<String, dynamic> w;
  const _WithdrawalTile({required this.w});

  @override
  Widget build(BuildContext context) {
    final amount = (w['amount'] as num?)?.toDouble() ?? 0.0;
    final status = w['status']?.toString() ?? 'pending';
    final dateStr = w['createdAt']?.toString() ?? '';
    String date = '';
    if (dateStr.isNotEmpty) {
      try {
        final d = DateTime.parse(dateStr);
        date = '${d.day}/${d.month}/${d.year}';
      } catch (_) {}
    }

    Color statusColor;
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        statusColor = AppTheme.successColor;
        break;
      case 'rejected':
        statusColor = AppTheme.errorColor;
        break;
      default:
        statusColor = AppTheme.warningColor;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.account_balance_outlined, color: statusColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('₹${amount.toStringAsFixed(0)} Withdrawal',
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textColor)),
                if (date.isNotEmpty)
                  Text(date,
                      style:
                          const TextStyle(fontSize: 11, color: AppTheme.subtitleColor)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              status[0].toUpperCase() + status.substring(1),
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
            ),
          ),
        ],
      ),
    );
  }
}
