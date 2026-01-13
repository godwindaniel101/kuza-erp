import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/connectivity_service.dart';
import '../services/sync_service.dart';

class SyncPrompt extends ConsumerStatefulWidget {
  const SyncPrompt({super.key});

  @override
  ConsumerState<SyncPrompt> createState() => _SyncPromptState();
}

class _SyncPromptState extends ConsumerState<SyncPrompt> {
  bool _isSyncing = false;
  bool _hasShownPrompt = false;

  @override
  Widget build(BuildContext context) {
    final connectivityAsync = ref.watch(connectivityStatusProvider);

    return connectivityAsync.when(
      data: (status) {
        // Show prompt when connection is restored
        if (status == ConnectivityStatus.connected && !_hasShownPrompt) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && !_hasShownPrompt) {
              _showSyncDialog();
              _hasShownPrompt = true;
            }
          });
        } else if (status == ConnectivityStatus.disconnected) {
          _hasShownPrompt = false;
        }

        return const SizedBox.shrink();
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  void _showSyncDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.cloud_sync, color: Colors.green),
            SizedBox(width: 8),
            Text('Internet Restored'),
          ],
        ),
        content: const Text(
          'Your internet connection has been restored. Would you like to sync your data now?',
        ),
        actions: [
          TextButton(
            onPressed: () {
              _hasShownPrompt = false;
              Navigator.of(context).pop();
            },
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: _isSyncing ? null : () {
              // Close dialog immediately when sync is clicked
              Navigator.of(context).pop();
              _hasShownPrompt = false;
              // Start sync in background
              _syncData();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Sync Now'),
          ),
        ],
      ),
    );
  }

  Future<void> _syncData() async {
    setState(() {
      _isSyncing = true;
    });

    try {
      final syncService = await ref.read(syncServiceProvider.future);
      final success = await syncService.syncAll();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? 'Data synced successfully'
                  : 'Some data failed to sync. Please try again.',
            ),
            backgroundColor: success ? Colors.green : Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sync failed. Please try again later.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSyncing = false;
        });
      }
    }
  }
}

