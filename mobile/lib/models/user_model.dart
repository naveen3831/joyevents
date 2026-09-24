class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final double walletBalance;
  final String? createdAt;
  final String? merchantStatus;
  final Map<String, dynamic>? merchantDetails;
  final double quotationAmount;
  final int maxEvents;
  final int maxServices;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.walletBalance = 0.0,
    this.createdAt,
    this.merchantStatus,
    this.merchantDetails,
    this.quotationAmount = 0.0,
    this.maxEvents = 5,
    this.maxServices = 5,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? mDetails;
    if (json['merchantDetails'] is Map) {
      mDetails = Map<String, dynamic>.from(json['merchantDetails'] as Map);
    }

    return UserModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'User',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
      phone: json['phone']?.toString() ?? json['mobile']?.toString(),
      walletBalance: (json['walletBalance'] is num)
          ? (json['walletBalance'] as num).toDouble()
          : double.tryParse(json['walletBalance']?.toString() ?? '0') ?? 0.0,
      createdAt: json['createdAt']?.toString(),
      merchantStatus: json['merchantStatus']?.toString(),
      merchantDetails: mDetails,
      quotationAmount: (json['quotationAmount'] is num)
          ? (json['quotationAmount'] as num).toDouble()
          : double.tryParse(json['quotationAmount']?.toString() ?? '0') ?? 0.0,
      maxEvents: (json['maxEvents'] is num) ? (json['maxEvents'] as num).toInt() : 5,
      maxServices: (json['maxServices'] is num) ? (json['maxServices'] as num).toInt() : 5,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'role': role,
      'phone': phone,
      'walletBalance': walletBalance,
      'createdAt': createdAt,
      'merchantStatus': merchantStatus,
      'merchantDetails': merchantDetails,
      'quotationAmount': quotationAmount,
      'maxEvents': maxEvents,
      'maxServices': maxServices,
    };
  }

  bool get isCustomer => role == 'user';
  bool get isMerchant => role == 'merchant';
  bool get isAdmin => role == 'admin';
  bool get isMerchantActive => isMerchant && merchantStatus == 'active';
}
