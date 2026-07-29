import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../services/api_service.dart';
import '../../../utils/currency_utils.dart';
import '../../../utils/i18n.dart';

class InventoryItemDetailScreen extends ConsumerStatefulWidget {
  final String itemId;
  final String itemName;

  const InventoryItemDetailScreen({
    super.key,
    required this.itemId,
    required this.itemName,
  });

  @override
  ConsumerState<InventoryItemDetailScreen> createState() => _InventoryItemDetailScreenState();
}

class _InventoryItemDetailScreenState extends ConsumerState<InventoryItemDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  Map<String, dynamic>? _itemDetail;
  List<dynamic> _inflowHistory = [];
  List<dynamic> _salesHistory = [];
  List<dynamic> _branchDistribution = [];
  
  bool _loading = true;
  bool _inflowLoading = false;
  bool _salesLoading = false;
  bool _branchLoading = false;
  
  String? _currencyCode;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadSettings();
    _loadItemDetail();
    
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        switch (_tabController.index) {
          case 1:
            _loadInflowHistory();
            break;
          case 2:
            _loadSalesHistory();
            break;
          case 3:
            _loadBranchDistribution();
            break;
        }
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
      setState(() {
        _currencyCode = 'NGN';
      });
    }
  }

  Future<void> _loadItemDetail() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/ims/inventory/${widget.itemId}');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _itemDetail = response.data['data'];
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load item details: $e')),
        );
      }
    }
  }

  Future<void> _loadInflowHistory() async {
    if (_inflowLoading || _inflowHistory.isNotEmpty) return;
    
    setState(() {
      _inflowLoading = true;
    });
    
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/ims/inflows?inventoryItemId=${widget.itemId}');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _inflowHistory = response.data['data'] ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load inflow history: $e')),
        );
      }
    } finally {
      setState(() {
        _inflowLoading = false;
      });
    }
  }

  Future<void> _loadSalesHistory() async {
    if (_salesLoading || _salesHistory.isNotEmpty) return;
    
    setState(() {
      _salesLoading = true;
    });
    
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/rms/orders/items?inventoryItemId=${widget.itemId}');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _salesHistory = response.data['data'] ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load sales history: $e')),
        );
      }
    } finally {
      setState(() {
        _salesLoading = false;
      });
    }
  }

  Future<void> _loadBranchDistribution() async {
    if (_branchLoading || _branchDistribution.isNotEmpty) return;
    
    setState(() {
      _branchLoading = true;
    });
    
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get('/ims/inventory/branches?inventoryItemId=${widget.itemId}');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _branchDistribution = response.data['data'] ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load branch distribution: $e')),
        );
      }
    } finally {
      setState(() {
        _branchLoading = false;
      });
    }
  }

  Widget _buildGeneralInfoTab() {
    if (_itemDetail == null) {
      return const Center(child: Text('No item details available'));
    }

    final currencySymbol = CurrencyUtils.getCurrencySymbol(_currencyCode);
    final item = _itemDetail!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Section
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: item['imageUrl'] != null 
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      item['imageUrl'],
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildNoImagePlaceholder();
                      },
                    ),
                  )
                : _buildNoImagePlaceholder(),
          ),
          const SizedBox(height: 24),
          
          // Item Details Cards
          _buildInfoCard(I18n.t('inventory.itemName'), item['name'] ?? ''),
          _buildInfoCard(I18n.t('inventory.category'), item['category']?['name'] ?? ''),
          _buildInfoCard(I18n.t('inventory.baseUom'), item['baseUom']?['name'] ?? ''),
          _buildInfoCard(
            I18n.t('inventory.salePrice'), 
            '$currencySymbol${(item['salePrice'] ?? item['price'] ?? 0).toStringAsFixed(2)}'
          ),
          _buildInfoCard(
            I18n.t('inventory.costPrice'), 
            '$currencySymbol${(item['costPrice'] ?? 0).toStringAsFixed(2)}'
          ),
          _buildInfoCard(I18n.t('inventory.minimumStock'), '${item['minimumStock'] ?? 0}'),
          _buildInfoCard(I18n.t('inventory.currentStock'), '${item['currentStock'] ?? 0}'),
          
          if (item['description'] != null && item['description'].toString().isNotEmpty)
            _buildInfoCard(I18n.t('inventory.description'), item['description']),
        ],
      ),
    );
  }

  Widget _buildNoImagePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.image_not_supported_outlined,
          size: 64,
          color: Colors.grey[400],
        ),
        const SizedBox(height: 8),
        Text(
          I18n.t('inventory.noImage'),
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(
                value,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInflowHistoryTab() {
    if (_inflowLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_inflowHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              I18n.t('inventory.noInflowHistory'),
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _inflowHistory.length,
      itemBuilder: (context, index) {
        final inflow = _inflowHistory[index];
        final receivedDate = DateTime.tryParse(inflow['receivedAt'] ?? '');
        final expiryDate = inflow['expiryDate'] != null 
            ? DateTime.tryParse(inflow['expiryDate']) 
            : null;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.input_outlined, color: Colors.green[600]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${I18n.t('common.quantity')}: ${inflow['quantity'] ?? 0}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (receivedDate != null)
                  Text('${I18n.t('inventory.receivedOn')}: ${DateFormat('MMM dd, yyyy').format(receivedDate)}'),
                if (inflow['supplier']?['name'] != null)
                  Text('${I18n.t('inventory.supplier')}: ${inflow['supplier']['name']}'),
                if (inflow['batchNumber'] != null)
                  Text('${I18n.t('inventory.batch')}: ${inflow['batchNumber']}'),
                if (expiryDate != null)
                  Text('${I18n.t('inventory.expiryDate')}: ${DateFormat('MMM dd, yyyy').format(expiryDate)}'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSalesHistoryTab() {
    if (_salesLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_salesHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.point_of_sale_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              I18n.t('inventory.noSalesHistory'),
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _salesHistory.length,
      itemBuilder: (context, index) {
        final sale = _salesHistory[index];
        final soldDate = DateTime.tryParse(sale['createdAt'] ?? '');

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.point_of_sale, color: Colors.blue[600]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${I18n.t('inventory.soldQuantity')}: ${sale['quantity'] ?? 0}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (soldDate != null)
                  Text('${I18n.t('inventory.soldOn')}: ${DateFormat('MMM dd, yyyy').format(soldDate)}'),
                if (sale['order']?['customerName'] != null)
                  Text('Customer: ${sale['order']['customerName']}'),
                if (sale['order']?['branch']?['name'] != null)
                  Text('${I18n.t('inventory.branch')}: ${sale['order']['branch']['name']}'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBranchDistributionTab() {
    if (_branchLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_branchDistribution.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              I18n.t('inventory.noBranchData'),
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _branchDistribution.length,
      itemBuilder: (context, index) {
        final branch = _branchDistribution[index];
        final isLowStock = (branch['currentStock'] ?? 0) <= (branch['minimumStock'] ?? 0);

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  Icons.store,
                  color: isLowStock ? Colors.red[600] : Colors.green[600],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        branch['branchName'] ?? 'Unknown Branch',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${I18n.t('inventory.availableStock')}: ${branch['currentStock'] ?? 0}',
                        style: TextStyle(
                          color: isLowStock ? Colors.red[600] : Colors.green[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (isLowStock)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.red[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Low Stock',
                      style: TextStyle(
                        color: Colors.red[700],
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(widget.itemName),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.itemName),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(
              icon: const Icon(Icons.info_outline),
              text: I18n.t('inventory.generalInfo'),
            ),
            Tab(
              icon: const Icon(Icons.input),
              text: I18n.t('inventory.inflowHistory'),
            ),
            Tab(
              icon: const Icon(Icons.point_of_sale),
              text: I18n.t('inventory.salesHistory'),
            ),
            Tab(
              icon: const Icon(Icons.store),
              text: I18n.t('inventory.branchDistribution'),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGeneralInfoTab(),
          _buildInflowHistoryTab(),
          _buildSalesHistoryTab(),
          _buildBranchDistributionTab(),
        ],
      ),
    );
  }
}
