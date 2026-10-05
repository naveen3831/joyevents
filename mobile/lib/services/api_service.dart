import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

/// Centralized Dio API Client for JoyEvents mobile application.
/// Manages base URL resolution, JWT token authorization headers,
/// safe development logging, auto-fallback server detection, and structured error handling.
class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  final _storage = const FlutterSecureStorage();

  ApiService._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 12),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Ensure ApiConfig is initialized from storage & sync baseUrl
          await ApiConfig.init();
          options.baseUrl = ApiConfig.baseUrl;

          // Retrieve JWT token from secure storage
          final token = await _storage.read(key: 'auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          if (kDebugMode) {
            debugPrint('[HTTP REQUEST] ${options.method} ${options.uri}');
          }

          return handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            debugPrint(
              '[HTTP RESPONSE] ${response.requestOptions.method} ${response.requestOptions.uri} -> Status: ${response.statusCode}',
            );
          }
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          if (kDebugMode) {
            debugPrint(
              '[HTTP ERROR] ${e.requestOptions.method} ${e.requestOptions.uri} -> Status: ${e.response?.statusCode ?? "No Status"}, Type: ${e.type}',
            );
            if (e.response?.data != null && e.response?.data is Map) {
              debugPrint('[HTTP ERROR DATA] ${e.response?.data}');
            }
          }

          // Auto-fallback: If connection error or timeout occurs in debug mode, probe alternate dev IPs
          if (!kReleaseMode &&
              (e.type == DioExceptionType.connectionTimeout ||
                  e.type == DioExceptionType.connectionError ||
                  e.type == DioExceptionType.receiveTimeout)) {
            final workingUrl = await ApiConfig.autoDetectWorkingServer();
            if (workingUrl != null && workingUrl != e.requestOptions.baseUrl) {
              if (kDebugMode) {
                debugPrint('[AUTO-RETRY] Retrying request with auto-detected working server: $workingUrl');
              }
              try {
                final options = e.requestOptions;
                options.baseUrl = workingUrl;
                final cloneReq = await dio.fetch(options);
                return handler.resolve(cloneReq);
              } catch (_) {
                // If retry still fails, fall through to default error parsing
              }
            }
          }

          if (e.response?.statusCode == 401 && !e.requestOptions.path.contains('/auth/login')) {
            // Clear token if invalid session on protected endpoints
            _storage.delete(key: 'auth_token');
          }

          return handler.next(e);
        },
      ),
    );
  }

  /// Parses raw Dio exceptions or backend responses into clean, user-friendly error messages.
  static String parseError(dynamic error) {
    if (error is DioException) {
      final statusCode = error.response?.statusCode;
      final responseData = error.response?.data;

      // Extract JSON error payload if returned by backend API
      if (responseData != null && responseData is Map) {
        if (responseData.containsKey('error') && responseData['error'] != null) {
          return responseData['error'].toString();
        }
        if (responseData.containsKey('message') && responseData['message'] != null) {
          return responseData['message'].toString();
        }
      }

      // Handle specific HTTP Status Codes
      if (statusCode == 401) {
        return 'Invalid email or password.';
      }
      if (statusCode == 403) {
        return 'Your account has been deactivated. Please contact the administrator.';
      }
      if (statusCode != null && statusCode >= 500) {
        if (kDebugMode) {
          return 'Server is temporarily unavailable (Status: $statusCode). Please check server connection.';
        }
        return 'Server is temporarily unavailable. Please try again.';
      }

      // Handle Network / Connection Exception Types
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.connectionError:
          return 'Unable to connect to the server. Please check your network or server IP configuration.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }
    return error?.toString() ?? 'Something went wrong. Please try again.';
  }
}
