import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/api_service.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Account Information',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (authState.user != null) ...[
                    ListTile(
                      leading: const Icon(Icons.person),
                      title: const Text('Name'),
                      subtitle: Text(authState.user!['name'] ?? 'N/A'),
                      contentPadding: EdgeInsets.zero,
                    ),
                    ListTile(
                      leading: const Icon(Icons.email),
                      title: const Text('Email'),
                      subtitle: Text(authState.user!['email'] ?? 'N/A'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // App Settings
          Card(
            child: Column(
              children: [
                Consumer(
                  builder: (context, ref, child) {
                    final currentLang = ref.watch(languageProvider);
                    final languageNotifier = ref.read(languageProvider.notifier);
                    
                    final languages = [
                      {'code': 'en', 'name': 'English', 'flag': '🇺🇸'},
                      {'code': 'es', 'name': 'Español', 'flag': '🇪🇸'},
                      {'code': 'fr', 'name': 'Français', 'flag': '🇫🇷'},
                      {'code': 'de', 'name': 'Deutsch', 'flag': '🇩🇪'},
                      {'code': 'ha', 'name': 'Hausa', 'flag': '🇳🇬'},
                    ];
                    
                    return ListTile(
                      leading: const Icon(Icons.language),
                      title: const Text('Language'),
                      subtitle: Text(
                        languages.firstWhere(
                          (l) => l['code'] == currentLang,
                          orElse: () => languages[0],
                        )['name'] as String,
                      ),
                      trailing: DropdownButton<String>(
                        value: currentLang,
                        underline: const SizedBox(),
                        items: languages.map((lang) {
                          return DropdownMenuItem<String>(
                            value: lang['code'] as String,
                            child: Row(
                              children: [
                                Text(lang['flag'] as String),
                                const SizedBox(width: 8),
                                Text(lang['name'] as String),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) async {
                          if (value != null) {
                            await languageNotifier.setLanguage(value);
                            // Optionally update backend settings
                            try {
                              final apiService = ref.read(apiServiceProvider);
                              await apiService.dio.put('/settings', data: {'language': value});
                            } catch (e) {
                              // Ignore errors, language is already set locally
                            }
                          }
                        },
                      ),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.notifications),
                  title: const Text('Notifications'),
                  trailing: Switch(
                    value: true,
                    onChanged: (value) {
                      // TODO: Implement notification settings
                    },
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.dark_mode),
                  title: const Text('Dark Mode'),
                  trailing: Switch(
                    value: false,
                    onChanged: (value) {
                      // TODO: Implement dark mode
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          // About
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info),
                  title: const Text('About'),
                  subtitle: const Text('Version 2.0.0'),
                  onTap: () {
                    // TODO: Show about dialog
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.help),
                  title: const Text('Help & Support'),
                  onTap: () {
                    // TODO: Show help
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

