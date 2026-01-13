import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/offline_storage_service.dart';
import 'utils/i18n.dart';
import 'providers/language_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize i18n
  await I18n.init();
  
  // Initialize offline storage
  final offlineStorage = OfflineStorageService();
  await offlineStorage.init();
  
  // Initialize API service with appropriate URL for platform
  final apiService = ApiService();
  await apiService.initPrefs();
  
  // Use 10.0.2.2 for Android emulator (maps to host machine's localhost)
  // Use localhost for iOS simulator and desktop
  final baseUrl = Platform.isAndroid 
      ? 'http://10.0.2.2:4001/api' 
      : 'http://localhost:4001/api';
  
  apiService.initialize(baseUrl: baseUrl);
  await apiService.loadToken();
  
  runApp(
    ProviderScope(
      overrides: [
        apiServiceProvider.overrideWithValue(apiService),
        offlineStorageServiceProvider.overrideWith((ref) => Future.value(offlineStorage)),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ERP Platform',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
