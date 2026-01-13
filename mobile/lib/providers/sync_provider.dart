import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/offline_storage_service.dart';

final pendingSyncCountProvider = FutureProvider<int>((ref) async {
  final offlineStorage = await ref.read(offlineStorageServiceProvider.future);
  final pendingSyncs = await offlineStorage.getPendingSyncs();
  return pendingSyncs.length;
});
