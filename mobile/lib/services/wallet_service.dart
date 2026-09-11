import '../config/api_config.dart';
import 'api_service.dart';
import 'auth_service.dart';

class WalletService {
  final ApiService _apiService = ApiService();
  final AuthService _authService = AuthService();

  // Deposit funds into customer wallet (/api/auth/add-wallet-funds)
  Future<double> addWalletFunds({
    required double amount,
    required String paymentMethod, // 'card' or 'upi'
    required Map<String, dynamic> paymentDetails,
  }) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.addWalletFunds,
        data: {
          'amount': amount,
          'paymentMethod': paymentMethod,
          'paymentDetails': paymentDetails,
        },
      );

      final data = response.data;
      final newBalance = (data['walletBalance'] is num)
          ? (data['walletBalance'] as num).toDouble()
          : double.tryParse(data['walletBalance']?.toString() ?? '0') ?? 0.0;

      // Update local auth user state
      _authService.updateWalletBalance(newBalance);

      return newBalance;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Withdraw funds (/api/auth/withdraw)
  Future<double> withdrawWallet({
    required double amount,
    required String paymentMethod,
    Map<String, dynamic>? details,
  }) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.withdrawWallet,
        data: {
          'amount': amount,
          'paymentMethod': paymentMethod,
          'details': details ?? {},
        },
      );

      final data = response.data;
      final newBalance = (data['walletBalance'] is num)
          ? (data['walletBalance'] as num).toDouble()
          : double.tryParse(data['walletBalance']?.toString() ?? '0') ?? 0.0;

      _authService.updateWalletBalance(newBalance);

      return newBalance;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
