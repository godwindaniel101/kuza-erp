import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../services/api_service.dart';
import '../../../services/connectivity_service.dart';
import '../../../services/offline_storage_service.dart';
import '../../../widgets/primary_button.dart';
import '../../../widgets/connectivity_indicator.dart';

class SalesScreen extends ConsumerStatefulWidget {
  const SalesScreen({super.key});

  @override
  ConsumerState<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends ConsumerState<SalesScreen> {
  bool _loading = true;
  bool _isOffline = false;
  List<dynamic> _orders = [];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
    });

    try {
      final connectivityService = ref.read(connectivityServiceProvider);
      final hasConnection = await connectivityService.hasConnection();

      if (hasConnection) {
        // Try to load from API
        try {
          final apiService = ref.read(apiServiceProvider);
          final response = await apiService.dio.get('/rms/orders');
          
          if (response.statusCode == 200 && response.data['success']) {
            final orders = response.data['data'] ?? [];
            setState(() {
              _orders = orders;
              _isOffline = false;
              _loading = false;
            });
            
            // Save to offline storage
            final offlineStorage = await ref.read(offlineStorageServiceProvider.future);
            await offlineStorage.saveSales(orders);
          }
        } catch (e) {
          // If API fails, try offline storage
          await _loadFromOffline();
        }
      } else {
        // Load from offline storage
        await _loadFromOffline();
      }
    } catch (e) {
      await _loadFromOffline();
    }
  }

  Future<void> _loadFromOffline() async {
    try {
      final offlineStorage = await ref.read(offlineStorageServiceProvider.future);
      final orders = await offlineStorage.getSales();
      setState(() {
        _orders = orders;
        _isOffline = true;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _orders = [];
        _isOffline = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales'),
        actions: [
          const ConnectivityIndicator(),
          const SizedBox(width: 8),
          if (_isOffline)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Icon(Icons.cloud_off, color: Colors.orange),
            ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/ims/sales/create'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.receipt_long,
                          size: 32,
                          color: Colors.green.shade600,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No orders yet',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Create your first sale to get started',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      PrimaryButton(
                        text: 'Create First Sale',
                        onPressed: () => context.push('/ims/sales/create'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _orders.length,
                    itemBuilder: (context, index) {
                      final order = _orders[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          order['orderNumber'] ?? 'N/A',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Branch: ${order['branch']?['name'] ?? 'N/A'}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                        if (order['table']?['name'] != null) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            'Table: ${order['table']?['name']}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(order['status'] ?? 'pending').withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      (order['status'] ?? 'pending').toUpperCase(),
                                      style: TextStyle(
                                        color: _getStatusColor(order['status'] ?? 'pending'),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Total Amount',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                  Text(
                                    '₦${(order['totalAmount'] ?? 0).toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: Colors.grey.shade900,
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
                ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'paid':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

