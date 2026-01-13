import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final Dio _dio;
  final SharedPreferences _prefs;

  AuthService(this._dio, this._prefs);

  String? get token => _prefs.getString('token');
  bool get isAuthenticated => token != null;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.data['success'] == true) {
        final token = response.data['data']['token'];
        final user = response.data['data']['user'];
        
        await _prefs.setString('token', token);
        await _prefs.setString('user', user.toString());
        
        return {'success': true, 'user': user};
      }
      
      return {'success': false, 'error': 'Login failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
    String? restaurantName,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
        'passwordConfirmation': passwordConfirmation,
        if (restaurantName != null) 'restaurantName': restaurantName,
      });

      if (response.data['success'] == true) {
        final token = response.data['data']['token'];
        final user = response.data['data']['user'];
        
        await _prefs.setString('token', token);
        await _prefs.setString('user', user.toString());
        
        return {'success': true, 'user': user};
      }
      
      return {'success': false, 'error': 'Registration failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<void> logout() async {
    await _prefs.remove('token');
    await _prefs.remove('user');
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      if (response.data['success'] == true) {
        return {'success': true, 'user': response.data['data']};
      }
      return {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}

