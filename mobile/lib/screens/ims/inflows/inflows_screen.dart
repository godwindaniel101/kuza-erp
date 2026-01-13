import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import '../../../services/connectivity_service.dart';
import '../../../services/offline_storage_service.dart';
import '../../../widgets/primary_button.dart';
import '../../../widgets/connectivity_indicator.dart';

class InflowsScreen extends ConsumerStatefulWidget {
  const InflowsScreen({super.key});

  @override
  ConsumerState<InflowsScreen> createState() => _InflowsScreenState();
}

class _InflowsScreenState extends ConsumerState<InflowsScreen> {
  bool _loading = true;
  bool _isOffline = false;
  List<dynamic> _inflows = [];

  @override
  void initState() {
    super.initState();
    _loadInflows();
  }

  Future<void> _loadInflows() async {
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
          final response = await apiService.dio.get('/ims/inflows');
          
          if (response.statusCode == 200 && response.data['success']) {
            final inflows = response.data['data'] ?? [];
            setState(() {
              _inflows = inflows;
              _isOffline = false;
              _loading = false;
            });
            
            // Save to offline storage
            final offlineStorage = await ref.read(offlineStorageServiceProvider.future);
            await offlineStorage.saveInflows(inflows);
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
      final inflows = await offlineStorage.getInflows();
      setState(() {
        _inflows = inflows;
        _isOffline = true;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _inflows = [];
        _isOffline = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inflows'),
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
            onPressed: () {
              // TODO: Navigate to create inflow when screen is created
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Create inflow screen coming soon')),
              );
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _inflows.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.input,
                          size: 32,
                          color: Colors.blue.shade600,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No inflows yet',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Record your first inflow to get started',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      PrimaryButton(
                        text: 'Record Inflow',
                        onPressed: () {
                          // TODO: Navigate to create inflow when screen is created
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Create inflow screen coming soon')),
                          );
                        },
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadInflows,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _inflows.length,
                    itemBuilder: (context, index) {
                      final inflow = _inflows[index];
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
                                          inflow['invoiceNumber'] ?? 'N/A',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _formatDate(inflow['receivedDate']),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(inflow['status'] ?? 'pending').withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      (inflow['status'] ?? 'pending').toUpperCase(),
                                      style: TextStyle(
                                        color: _getStatusColor(inflow['status'] ?? 'pending'),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.business, size: 16, color: Colors.grey.shade600),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Supplier: ${inflow['supplier']?['name'] ?? 'N/A'}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
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
                                    '₦${(inflow['totalAmount'] ?? 0).toStringAsFixed(2)}',
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

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dateTime = DateTime.parse(date);
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } catch (e) {
      return 'N/A';
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

