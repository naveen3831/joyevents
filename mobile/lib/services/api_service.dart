import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  final _storage = const FlutterSecureStorage();

  ApiService._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Ensure dynamic baseUrl sync
          options.baseUrl = ApiConfig.baseUrl;

          // Retrieve JWT token from secure storage
          final token = await _storage.read(key: 'auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          // Safe development logging (URL & method only, no passwords/tokens)
          if (kDebugMode) {
            debugPrint('[HTTP REQUEST] ${options.method} ${options.uri}');
          }

          return handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            debugPrint(
                '[HTTP RESPONSE] ${response.requestOptions.method} ${response.requestOptions.uri} -> Status: ${response.statusCode}');
          }
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          if (kDebugMode) {
            debugPrint(
                '[HTTP ERROR] ${e.requestOptions.method} ${e.requestOptions.uri} -> Status: ${e.response?.statusCode ?? "No Response"}, ErrorType: ${e.type}, Message: ${e.message}');
          }
          if (e.response?.statusCode == 401) {
            // Token expired or invalid — clear token
            _storage.delete(key: 'auth_token');
          }

          // Automatic network endpoint fallback (e.g., switch between 127.0.0.1 USB & LAN IP)
          if ((e.type == DioExceptionType.connectionError ||
                  e.type == DioExceptionType.connectionTimeout) &&
              e.requestOptions.extra['retried_fallback'] != true) {
            final currentBase = ApiConfig.baseUrl;
            final fallbackBase = currentBase.contains('127.0.0.1')
                ? ApiConfig.lanBaseUrl
                : 'http://127.0.0.1:5000/api';

            if (kDebugMode) {
              debugPrint(
                  '[HTTP FALLBACK] Connection failed on $currentBase. Attempting fallback to $fallbackBase...');
            }
            ApiConfig.baseUrl = fallbackBase;

            try {
              final opts = e.requestOptions;
              opts.baseUrl = fallbackBase;
              opts.extra['retried_fallback'] = true;
              final response = await dio.fetch(opts);
              return handler.resolve(response);
            } catch (_) {
              // Fallback failed as well, proceed with original error handler
            }
          }

          return handler.next(e);
        },
      ),
    );
  }

  // Format backend errors into readable string messages
  static String parseError(dynamic error) {
    if (error is DioException) {
      if (error.response?.data != null && error.response?.data is Map) {
        final data = error.response!.data as Map;
        if (data.containsKey('error')) {
          return data['error'].toString();
        }
        if (data.containsKey('message')) {
          return data['message'].toString();
        }
      }
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return 'Connection timed out. Please check your network connection.';
        case DioExceptionType.connectionError:
          return 'Unable to connect to server. Ensure backend is running and reachable.';
        default:
          if (error.response?.statusCode == 401) {
            return 'Session expired. Please log in again.';
          }
          return 'An unexpected error occurred (${error.response?.statusCode ?? "Network"}).';
      }
    }
    return error?.toString() ?? 'An unknown error occurred';
  }
}
