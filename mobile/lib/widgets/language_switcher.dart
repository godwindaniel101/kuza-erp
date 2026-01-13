import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../utils/i18n.dart';

class LanguageSwitcher extends ConsumerStatefulWidget {
  const LanguageSwitcher({super.key});

  @override
  ConsumerState<LanguageSwitcher> createState() => _LanguageSwitcherState();
}

class _LanguageSwitcherState extends ConsumerState<LanguageSwitcher> {
  @override
  void initState() {
    super.initState();
    I18n.init();
  }

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.language),
      onSelected: (String lang) async {
        await I18n.setLanguage(lang);
        setState(() {});
      },
      itemBuilder: (BuildContext context) => [
        const PopupMenuItem<String>(
          value: 'en',
          child: Text('English'),
        ),
        const PopupMenuItem<String>(
          value: 'es',
          child: Text('Español'),
        ),
        const PopupMenuItem<String>(
          value: 'fr',
          child: Text('Français'),
        ),
      ],
    );
  }
}

