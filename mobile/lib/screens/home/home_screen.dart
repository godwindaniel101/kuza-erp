import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/feature_card.dart';
import '../../widgets/sync_prompt.dart';
import '../../providers/auth_provider.dart';
import '../../providers/sync_provider.dart';
import '../../services/sync_service.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                // Header Bar
                Container(
                  height: 56,
                  color: Colors.red.shade700,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      // Business Name - Left
                      Text(
                        'Kuza',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      // Actions - Right
                      const Spacer(),
                      // Sync Icon - Only show if pending sync
                      Consumer(
                        builder: (context, ref, child) {
                          final pendingSyncAsync = ref.watch(pendingSyncCountProvider);
                          return pendingSyncAsync.when(
                            data: (count) {
                              if (count > 0) {
                                return IconButton(
                                  icon: const Icon(Icons.sync, color: Colors.white),
                                  tooltip: 'Sync pending changes',
                                  onPressed: () async {
                                    try {
                                      final syncService = await ref.read(syncServiceProvider.future);
                                      await syncService.syncPendingChanges();
                                      // Refresh pending count
                                      ref.invalidate(pendingSyncCountProvider);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Sync completed'),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Sync failed'),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    }
                                  },
                                );
                              }
                              return const SizedBox.shrink();
                            },
                            loading: () => const SizedBox.shrink(),
                            error: (_, __) => const SizedBox.shrink(),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                        onPressed: () {
                          // TODO: Show notifications
                        },
                      ),
                    ],
                  ),
                ),
                // Modules Grid
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      // Subtle background pattern could be added here
                    ),
                    padding: const EdgeInsets.all(16),
                    child: GridView.count(
                      crossAxisCount: 3,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.0,
                      children: [
                        FeatureCard(
                          title: 'Sales',
                          icon: Icons.receipt_long,
                          onTap: () => context.push('/ims/sales'),
                        ),
                        FeatureCard(
                          title: 'Inflow',
                          icon: Icons.input,
                          onTap: () => context.push('/ims/inflows'),
                        ),
                        FeatureCard(
                          title: 'Inventory',
                          icon: Icons.inventory_2,
                          onTap: () => context.push('/ims/inventory'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Sync prompt overlay
          const SyncPrompt(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Settings Button
              IconButton(
                icon: const Icon(Icons.settings, size: 28),
                color: Colors.grey.shade700,
                onPressed: () => context.push('/settings'),
              ),
              
              // Circular Add Sale Button (FAB style)
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.red.shade600,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(28),
                    onTap: () => context.push('/ims/sales/create'),
                    child: const Icon(
                      Icons.add,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                ),
              ),
              
              // Logout Button
              IconButton(
                icon: const Icon(Icons.logout, size: 28),
                color: Colors.grey.shade700,
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Logout'),
                      content: const Text('Are you sure you want to logout?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () {
                            ref.read(authStateProvider.notifier).logout();
                            Navigator.of(context).pop();
                            if (context.mounted) {
                              context.go('/login');
                            }
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.red,
                          ),
                          child: const Text('Logout'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
