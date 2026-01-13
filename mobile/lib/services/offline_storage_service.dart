import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OfflineStorageService {
  static const String _salesBoxName = 'sales';
  static const String _inflowsBoxName = 'inflows';
  static const String _inventoryBoxName = 'inventory';
  static const String _pendingSyncBoxName = 'pending_sync';
  static const String _lastSyncKey = 'last_sync';

  late Box _salesBox;
  late Box _inflowsBox;
  late Box _inventoryBox;
  late Box _pendingSyncBox;

  Future<void> init() async {
    await Hive.initFlutter();
    
    _salesBox = await Hive.openBox(_salesBoxName);
    _inflowsBox = await Hive.openBox(_inflowsBoxName);
    _inventoryBox = await Hive.openBox(_inventoryBoxName);
    _pendingSyncBox = await Hive.openBox(_pendingSyncBoxName);
  }

  // Sales operations
  Future<void> saveSales(List<dynamic> sales) async {
    await _salesBox.put('sales', jsonEncode(sales));
    await _salesBox.put('last_updated', DateTime.now().toIso8601String());
  }

  Future<List<dynamic>> getSales() async {
    final data = _salesBox.get('sales');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  Future<int> getSalesCount() async {
    final sales = await getSales();
    return sales.length;
  }

  // Inflows operations
  Future<void> saveInflows(List<dynamic> inflows) async {
    await _inflowsBox.put('inflows', jsonEncode(inflows));
    await _inflowsBox.put('last_updated', DateTime.now().toIso8601String());
  }

  Future<List<dynamic>> getInflows() async {
    final data = _inflowsBox.get('inflows');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  Future<int> getInflowsCount() async {
    final inflows = await getInflows();
    return inflows.length;
  }

  // Inventory operations
  Future<void> saveInventory(List<dynamic> inventory) async {
    await _inventoryBox.put('inventory', jsonEncode(inventory));
    await _inventoryBox.put('last_updated', DateTime.now().toIso8601String());
  }

  Future<List<dynamic>> getInventory() async {
    final data = _inventoryBox.get('inventory');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  Future<int> getInventoryCount() async {
    final inventory = await getInventory();
    return inventory.length;
  }

  // Pending sync operations
  Future<void> addPendingSync(String type, Map<String, dynamic> data) async {
    final key = '${type}_${DateTime.now().millisecondsSinceEpoch}';
    await _pendingSyncBox.put(key, jsonEncode(data));
  }

  Future<List<Map<String, dynamic>>> getPendingSyncs() async {
    final keys = _pendingSyncBox.keys.toList();
    final syncs = <Map<String, dynamic>>[];
    
    for (var key in keys) {
      final data = _pendingSyncBox.get(key);
      if (data != null) {
        syncs.add({
          'key': key,
          'data': jsonDecode(data),
        });
      }
    }
    
    return syncs;
  }

  Future<void> removePendingSync(String key) async {
    await _pendingSyncBox.delete(key);
  }

  Future<void> clearPendingSyncs() async {
    await _pendingSyncBox.clear();
  }

  // Last sync timestamp
  Future<void> updateLastSync() async {
    await _pendingSyncBox.put(_lastSyncKey, DateTime.now().toIso8601String());
  }

  DateTime? getLastSync() {
    final timestamp = _pendingSyncBox.get(_lastSyncKey);
    if (timestamp == null) return null;
    return DateTime.parse(timestamp);
  }

  // Clear all offline data
  Future<void> clearAll() async {
    await _salesBox.clear();
    await _inflowsBox.clear();
    await _inventoryBox.clear();
    await _pendingSyncBox.clear();
  }
}

final offlineStorageServiceProvider = FutureProvider<OfflineStorageService>((ref) async {
  final service = OfflineStorageService();
  await service.init();
  return service;
});

