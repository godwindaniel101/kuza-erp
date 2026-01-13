import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../utils/i18n.dart';

final languageProvider = StateNotifierProvider<LanguageNotifier, String>((ref) {
  return LanguageNotifier(ref);
});

class LanguageNotifier extends StateNotifier<String> {
  final Ref _ref;
  
  LanguageNotifier(this._ref) : super('en') {
    _loadLanguage();
  }

  Future<void> _loadLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final savedLang = prefs.getString('lang') ?? 'en';
    state = savedLang;
    await I18n.setLanguage(savedLang);
  }

  Future<void> setLanguage(String lang) async {
    state = lang;
    await I18n.setLanguage(lang);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lang', lang);
  }

  Future<void> loadLanguageFromSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      
      if (token != null) {
        final apiService = _ref.read(apiServiceProvider);
        final response = await apiService.dio.get('/settings');
        if (response.statusCode == 200 && response.data['success'] == true) {
          final language = response.data['data']?['language'] ?? 'en';
          await setLanguage(language);
        }
      }
    } catch (e) {
      // If settings fetch fails, keep current language
      print('Failed to load language from settings: $e');
    }
  }
}
