import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import '../../../utils/currency_utils.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  String? _currencyCode;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadItems();
  }

  Future<void> _loadSettings() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/settings');
      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _currencyCode = response.data['data']?['currency_code'] ?? 
                         response.data['data']?['currency'] ?? 'NGN';
        });
      }
    } catch (e) {
      // Default to NGN if settings fail
      setState(() {
        _currencyCode = 'NGN';
      });
    }
  }

  Future<void> _loadItems() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/ims/inventory');
      
      if (response.data['success'] == true) {
        setState(() {
          _items = response.data['data'];
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load inventory: $e')),
        );
      }
    }
  }

  Future<void> _deleteItem(String itemId, String itemName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: Text('Are you sure you want to delete "$itemName"? This will soft delete the item.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final apiService = ref.read(apiServiceProvider);
      // Use DELETE endpoint - backend should handle soft delete
      final response = await apiService.dio.delete('/ims/inventory/$itemId');

      if (response.statusCode == 200 && response.data['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Item deleted successfully')),
          );
          _loadItems(); // Reload items
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete item: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol = CurrencyUtils.getCurrencySymbol(_currencyCode);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No inventory items found'))
              : ListView.builder(
                  itemCount: _items.length,
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    final isLowStock = item['currentStock'] <= item['minimumStock'];
                    final salePrice = item['salePrice'] ?? item['price'] ?? 0;
                    
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isLowStock ? Colors.red : Colors.green,
                          child: const Icon(Icons.inventory_2, color: Colors.white),
                        ),
                        title: Text(item['name'] ?? ''),
                        subtitle: Text('Stock: ${item['currentStock']}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '$currencySymbol${salePrice.toStringAsFixed(2)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                if (isLowStock)
                                  const Text(
                                    'Low Stock',
                                    style: TextStyle(
                                      color: Colors.red,
                                      fontSize: 12,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(width: 8),
                            PopupMenuButton<String>(
                              onSelected: (value) {
                                if (value == 'edit') {
                                  // TODO: Navigate to edit screen when created
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Edit functionality coming soon')),
                                  );
                                } else if (value == 'delete') {
                                  _deleteItem(item['id'], item['name'] ?? 'Item');
                                }
                              },
                              itemBuilder: (context) => [
                                const PopupMenuItem(
                                  value: 'edit',
                                  child: Row(
                                    children: [
                                      Icon(Icons.edit, size: 20, color: Colors.blue),
                                      SizedBox(width: 8),
                                      Text('Edit'),
                                    ],
                                  ),
                                ),
                                const PopupMenuItem(
                                  value: 'delete',
                                  child: Row(
                                    children: [
                                      Icon(Icons.delete, size: 20, color: Colors.red),
                                      SizedBox(width: 8),
                                      Text('Delete'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
