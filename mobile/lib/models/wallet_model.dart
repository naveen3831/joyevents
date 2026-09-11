class TransactionModel {
  final String id;
  final String type; // 'deposit', 'withdrawal', 'booking_payment', 'earnings'
  final double amount;
  final String description;
  final String status;
  final String? relatedId;
  final String? createdAt;

  TransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.status,
    this.relatedId,
    this.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'deposit',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      description: json['description']?.toString() ?? 'Transaction',
      status: json['status']?.toString() ?? 'completed',
      relatedId: json['relatedId']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  bool get isCredit => type == 'deposit' || type == 'refund' || type == 'earnings';
  bool get isDebit => type == 'withdrawal' || type == 'booking_payment';
}
