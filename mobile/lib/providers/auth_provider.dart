import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import 'language_provider.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return AuthService(apiService.dio, apiService.prefs);
});

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService, ref);
});

class AuthState {
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  final bool isLoading;

  AuthState({
    this.isAuthenticated = false,
    this.user,
    this.isLoading = false,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    Map<String, dynamic>? user,
    bool? isLoading,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final Ref _ref;

  AuthNotifier(this._authService, this._ref) : super(AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    if (_authService.isAuthenticated) {
      final result = await _authService.getCurrentUser();
      if (result['success'] == true) {
        state = state.copyWith(
          isAuthenticated: true,
          user: result['user'],
        );
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true);
    final result = await _authService.login(email, password);
    state = state.copyWith(isLoading: false);

    if (result['success'] == true) {
      state = state.copyWith(
        isAuthenticated: true,
        user: result['user'],
      );
      // Load language from settings after successful login
      try {
        final languageNotifier = _ref.read(languageProvider.notifier);
        await languageNotifier.loadLanguageFromSettings();
      } catch (e) {
        // If language loading fails, continue with login
        print('Failed to load language: $e');
      }
      return true;
    }
    return false;
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
    String? restaurantName,
  }) async {
    state = state.copyWith(isLoading: true);
    final result = await _authService.register(
      name: name,
      email: email,
      password: password,
      passwordConfirmation: passwordConfirmation,
      restaurantName: restaurantName,
    );
    state = state.copyWith(isLoading: false);

    if (result['success'] == true) {
      state = state.copyWith(
        isAuthenticated: true,
        user: result['user'],
      );
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    await _authService.logout();
    state = AuthState();
  }
}

