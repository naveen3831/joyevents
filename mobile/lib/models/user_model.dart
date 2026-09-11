class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final double walletBalance;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.walletBalance = 0.0,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'User',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
      phone: json['phone']?.toString(),
      walletBalance: (json['walletBalance'] is num)
          ? (json['walletBalance'] as num).toDouble()
          : double.tryParse(json['walletBalance']?.toString() ?? '0') ?? 0.0,
      createdAt: json['createdAt']?.toString(),
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
    };
  }

  bool get isCustomer => role == 'user';
  bool get isMerchant => role == 'merchant';
  bool get isAdmin => role == 'admin';
}
