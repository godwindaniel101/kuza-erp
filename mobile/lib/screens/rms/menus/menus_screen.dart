import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

class MenusScreen extends ConsumerStatefulWidget {
  const MenusScreen({super.key});

  @override
  ConsumerState<MenusScreen> createState() => _MenusScreenState();
}

class _MenusScreenState extends ConsumerState<MenusScreen> {
  List<dynamic> _menus = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadMenus();
  }

  Future<void> _loadMenus() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/menus');
      
      if (response.data['success'] == true) {
        setState(() {
          _menus = response.data['data'];
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load menus: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Menus'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _menus.isEmpty
              ? const Center(child: Text('No menus found'))
              : ListView.builder(
                  itemCount: _menus.length,
                  itemBuilder: (context, index) {
                    final menu = _menus[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: const Icon(Icons.restaurant_menu),
                        title: Text(menu['name'] ?? ''),
                        subtitle: Text(menu['description'] ?? ''),
                        trailing: Chip(
                          label: Text(
                            menu['isActive'] == true ? 'Active' : 'Inactive',
                            style: const TextStyle(fontSize: 12),
                          ),
                          backgroundColor: menu['isActive'] == true
                              ? Colors.green.shade100
                              : Colors.grey.shade300,
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
