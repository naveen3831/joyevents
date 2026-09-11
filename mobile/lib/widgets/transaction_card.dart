import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/wallet_model.dart';

class TransactionCard extends StatelessWidget {
  final TransactionModel transaction;

  const TransactionCard({
    super.key,
    required this.transaction,
  });

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.isCredit;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: isCredit
              ? AppTheme.successColor.withOpacity(0.12)
              : AppTheme.errorColor.withOpacity(0.12),
          child: Icon(
            isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
            color: isCredit ? AppTheme.successColor : AppTheme.errorColor,
            size: 20,
          ),
        ),
        title: Text(
          transaction.description,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textColor,
          ),
        ),
        subtitle: Text(
          transaction.createdAt != null && transaction.createdAt!.length >= 10
              ? transaction.createdAt!.substring(0, 10)
              : 'Recently',
          style: const TextStyle(fontSize: 12, color: AppTheme.subtitleColor),
        ),
        trailing: Text(
          '${isCredit ? "+" : "-"}₹${transaction.amount.toStringAsFixed(0)}',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: isCredit ? AppTheme.successColor : AppTheme.textColor,
          ),
        ),
      ),
    );
  }
}
