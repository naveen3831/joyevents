import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'firebase_notification_service.dart';

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;

  AuthService._internal();

  final _storage = const FlutterSecureStorage();
  final _apiService = ApiService();

  UserModel? _currentUser;
  bool _isLoading = true;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;

  // Initialize and check stored token
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.read(key: 'auth_token');
      if (token != null && token.isNotEmpty) {
        final user = await getMe();
        if (user != null && user.isCustomer) {
          _currentUser = user;
          FirebaseNotificationService().registerTokenWithBackend();
        } else {
          // Non-customer roles or invalid session cleared
          await logout();
        }
      }
    } catch (_) {
      await logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Login
  Future<UserModel> login(String email, String password) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.login,
        data: {'email': email.trim().toLowerCase(), 'password': password},
      );

      final data = response.data;
      final token = data['token']?.toString();
      final userData = data['user'] ?? data;

      if (token == null || token.isEmpty) {
        throw Exception('Token not received from server');
      }

      final user = UserModel.fromJson(userData);

      if (!user.isCustomer) {
        throw Exception('Access restricted: Customer login only');
      }

      await _storage.write(key: 'auth_token', value: token);
      await _storage.write(key: 'user_data', value: jsonEncode(user.toJson()));

      _currentUser = user;
      notifyListeners();
      FirebaseNotificationService().registerTokenWithBackend();
      return user;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Register
  Future<UserModel> register(String name, String email, String password) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.register,
        data: {
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
          'role': 'user', // Customer role in backend
        },
      );

      final data = response.data;
      final token = data['token']?.toString();
      final userData = data['user'] ?? data;

      final user = UserModel.fromJson(userData);

      if (token != null && token.isNotEmpty) {
        await _storage.write(key: 'auth_token', value: token);
        await _storage.write(key: 'user_data', value: jsonEncode(user.toJson()));
        _currentUser = user;
        notifyListeners();
        FirebaseNotificationService().registerTokenWithBackend();
      }

      return user;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Fetch current user details (/api/auth/me)
  Future<UserModel?> getMe() async {
    try {
      final response = await _apiService.dio.get(ApiConfig.me);
      final data = response.data;
      final userData = data['user'] ?? data;
      final user = UserModel.fromJson(userData);
      _currentUser = user;
      notifyListeners();
      return user;
    } catch (_) {
      return null;
    }
  }

  // Update profile
  Future<void> updateProfile(Map<String, dynamic> payload) async {
    try {
      final response = await _apiService.dio.patch(
        ApiConfig.updateProfile,
        data: payload,
      );
      final data = response.data;
      final userData = data['user'] ?? data;
      _currentUser = UserModel.fromJson(userData);
      notifyListeners();
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Change Password
  Future<void> changePassword(String currentPassword, String newPassword) async {
    try {
      await _apiService.dio.post(
        ApiConfig.changePassword,
        data: {
          'oldPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Forgot Password
  Future<void> forgotPassword(String email) async {
    try {
      await _apiService.dio.post(
        ApiConfig.forgotPassword,
        data: {'email': email.trim().toLowerCase()},
      );
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Update local wallet balance directly after wallet deposit/booking
  void updateWalletBalance(double newBalance) {
    if (_currentUser != null) {
      _currentUser = UserModel(
        id: _currentUser!.id,
        name: _currentUser!.name,
        email: _currentUser!.email,
        role: _currentUser!.role,
        phone: _currentUser!.phone,
        walletBalance: newBalance,
        createdAt: _currentUser!.createdAt,
      );
      notifyListeners();
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      await FirebaseNotificationService().unregisterTokenFromBackend();
      await _storage.delete(key: 'auth_token');
      await _storage.delete(key: 'user_data');
    } catch (_) {}
    _currentUser = null;
    notifyListeners();
  }
}
