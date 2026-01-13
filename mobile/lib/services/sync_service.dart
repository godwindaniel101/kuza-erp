import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'connectivity_service.dart';
import 'offline_storage_service.dart';
import 'api_service.dart';

class SyncService {
  final ApiService _apiService;
  final ConnectivityService _connectivityService;
  final OfflineStorageService _offlineStorageService;

  SyncService(
    this._apiService,
    this._connectivityService,
    this._offlineStorageService,
  );

  Future<bool> syncSales() async {
    if (!await _connectivityService.hasConnection()) {
      return false;
    }

    try {
      final response = await _apiService.dio.get('/rms/orders');
      if (response.statusCode == 200 && response.data['success']) {
        await _offlineStorageService.saveSales(response.data['data'] ?? []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> syncInflows() async {
    if (!await _connectivityService.hasConnection()) {
      return false;
    }

    try {
      final response = await _apiService.dio.get('/ims/inflows');
      if (response.statusCode == 200 && response.data['success']) {
        await _offlineStorageService.saveInflows(response.data['data'] ?? []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> syncInventory() async {
    if (!await _connectivityService.hasConnection()) {
      return false;
    }

    try {
      final response = await _apiService.dio.get('/ims/inventory');
      if (response.statusCode == 200 && response.data['success']) {
        await _offlineStorageService.saveInventory(response.data['data'] ?? []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> syncAll() async {
    if (!await _connectivityService.hasConnection()) {
      return false;
    }

    try {
      final results = await Future.wait([
        syncSales(),
        syncInflows(),
        syncInventory(),
      ]);

      if (results.every((r) => r == true)) {
        await _offlineStorageService.updateLastSync();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> syncPendingChanges() async {
    if (!await _connectivityService.hasConnection()) {
      return false;
    }

    try {
      final pendingSyncs = await _offlineStorageService.getPendingSyncs();
      bool allSynced = true;

      for (var sync in pendingSyncs) {
        final key = sync['key'] as String;
        final data = sync['data'] as Map<String, dynamic>;
        
        try {
          // Determine sync type from key
          if (key.startsWith('sale_')) {
            // Sync sale creation
            await _apiService.dio.post('/rms/orders', data: data);
          } else if (key.startsWith('inflow_')) {
            // Sync inflow creation
            await _apiService.dio.post('/ims/inflows', data: data);
          }
          
          await _offlineStorageService.removePendingSync(key);
        } catch (e) {
          allSynced = false;
        }
      }

      return allSynced;
    } catch (e) {
      return false;
    }
  }
}

final syncServiceProvider = FutureProvider<SyncService>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final connectivityService = ref.watch(connectivityServiceProvider);
  final offlineStorage = await ref.watch(offlineStorageServiceProvider.future);
  
  return SyncService(apiService, connectivityService, offlineStorage);
});

