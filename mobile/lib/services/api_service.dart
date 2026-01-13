import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ApiService {
  late Dio dio;
  late SharedPreferences prefs;
  String baseUrl;

  ApiService({this.baseUrl = 'http://localhost:4001/api'}) {
    _initializeDio();
  }

  void _initializeDio() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _initInterceptors();
  }

  Future<void> initPrefs() async {
    prefs = await SharedPreferences.getInstance();
  }

  void initialize({required String baseUrl}) {
    this.baseUrl = baseUrl;
    _initializeDio();
  }

  void _initInterceptors() {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        
        final lang = prefs.getString('lang') ?? 'en';
        options.headers['Accept-Language'] = lang;
        
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Handle unauthorized - clear token and redirect to login
          SharedPreferences.getInstance().then((prefs) {
            prefs.remove('token');
            prefs.remove('user');
          });
        }
        return handler.next(error);
      },
    ));
  }

  Future<String?> loadToken() async {
    await initPrefs();
    return prefs.getString('token');
  }

  Future<void> saveToken(String token) async {
    await initPrefs();
    await prefs.setString('token', token);
  }

  Future<void> clearToken() async {
    await initPrefs();
    await prefs.remove('token');
    await prefs.remove('user');
  }
}

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
