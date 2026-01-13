import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../services/api_service.dart';
import '../../../widgets/primary_button.dart';

class CreateSaleScreen extends ConsumerStatefulWidget {
  const CreateSaleScreen({super.key});

  @override
  ConsumerState<CreateSaleScreen> createState() => _CreateSaleScreenState();
}

class OrderItemRow {
  int id;
  String inventoryItemId;
  String uomId;
  double quantity;
  String? name;
  double? unitPrice;
  double? totalPrice;
  List<dynamic>? availableUoms;
  double? stock;

  OrderItemRow({
    required this.id,
    this.inventoryItemId = '',
    this.uomId = '',
    this.quantity = 1,
    this.name,
    this.unitPrice,
    this.totalPrice = 0,
    this.availableUoms,
    this.stock,
  });
}

class _CreateSaleScreenState extends ConsumerState<CreateSaleScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _loadingData = true;
  bool _showDetails = false;
  bool _applyVat = false;
  double _vatPercentage = 7.5;
  late TextEditingController _vatController;
  
  List<dynamic> _inventoryItems = [];
  List<dynamic> _branches = [];
  List<dynamic> _tables = [];
  
  String _selectedBranchId = '';
  String _selectedTableId = '';
  String _orderType = 'dine_in';
  String _customerName = '';
  String _customerPhone = '';
  String _notes = '';
  
  List<OrderItemRow> _orderItems = [];
  int _itemCounter = 0;
  Map<int, TextEditingController> _quantityControllers = {};

  @override
  void initState() {
    super.initState();
    _vatController = TextEditingController(text: _vatPercentage.toString());
    _loadInitialData();
  }

  @override
  void dispose() {
    _vatController.dispose();
    for (var controller in _quantityControllers.values) {
      controller.dispose();
    }
    _quantityControllers.clear();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      
      final branchesRes = await apiService.dio.get('/settings/branches');
      try {
        final tablesRes = await apiService.dio.get('/rms/tables');
        if (tablesRes.statusCode == 200 && tablesRes.data['success']) {
          setState(() {
            _tables = tablesRes.data['data'] ?? [];
          });
        }
      } catch (_) {
        // Tables endpoint may not be available, ignore
      }
      
      if (branchesRes.statusCode == 200 && branchesRes.data['success']) {
        setState(() {
          _branches = branchesRes.data['data'] ?? [];
          if (_branches.isNotEmpty) {
            _selectedBranchId = _branches[0]['id'];
            _loadInventoryItems();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load data: $e')),
        );
      }
    } finally {
      setState(() {
        _loadingData = false;
      });
    }
  }

  Future<void> _loadInventoryItems() async {
    if (_selectedBranchId.isEmpty) return;
    
    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.get(
        '/ims/inventory?forOrders=true&branchId=$_selectedBranchId',
      );
      
      if (response.statusCode == 200 && response.data['success']) {
        setState(() {
          _inventoryItems = response.data['data'] ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load inventory: $e')),
        );
      }
    }
  }

  void _addOrderItem() {
    if (_selectedBranchId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a branch first')),
      );
      return;
    }

    setState(() {
      _itemCounter++;
      final newItem = OrderItemRow(
        id: _itemCounter,
        quantity: 1,
        totalPrice: 0,
      );
      _orderItems.add(newItem);
      _quantityControllers[_itemCounter] = TextEditingController(text: '1');
    });
  }

  void _removeOrderItem(int id) {
    setState(() {
      _orderItems.removeWhere((item) => item.id == id);
      _quantityControllers[id]?.dispose();
      _quantityControllers.remove(id);
    });
    _updateOrderSummary();
  }

  void _handleItemChange(int id, String field, dynamic value) {
    setState(() {
      final itemIndex = _orderItems.indexWhere((item) => item.id == id);
      if (itemIndex < 0) return;
      
      final item = _orderItems[itemIndex];
      
      if (field == 'inventoryItemId') {
        final selectedItem = _inventoryItems.firstWhere(
          (i) => i['id'] == value,
      orElse: () => null,
    );

        if (selectedItem != null) {
          final defaultUomId = selectedItem['defaultUomId'] ?? selectedItem['baseUomId'];
          final defaultPrice = selectedItem['uomPrices']?[defaultUomId] ?? selectedItem['price'] ?? 0;
          
          item.inventoryItemId = value;
          item.name = selectedItem['name'];
          item.uomId = defaultUomId ?? '';
          item.availableUoms = selectedItem['uoms'] ?? [];
          item.stock = selectedItem['stock']?.toDouble() ?? 0;
          item.unitPrice = (defaultPrice as num).toDouble();
          item.totalPrice = item.unitPrice! * item.quantity;
        }
      } else if (field == 'uomId') {
        final selectedItem = _inventoryItems.firstWhere(
          (i) => i['id'] == item.inventoryItemId,
          orElse: () => null,
        );
        
        if (selectedItem != null) {
          final newPrice = selectedItem['uomPrices']?[value] ?? selectedItem['price'] ?? 0;
          item.uomId = value;
          item.unitPrice = (newPrice as num).toDouble();
          item.totalPrice = item.unitPrice! * item.quantity;
        }
      } else if (field == 'quantity') {
        final qty = double.tryParse(value.toString()) ?? 0;
        item.quantity = qty;
        item.totalPrice = (item.unitPrice ?? 0) * qty;
      }
      
      _orderItems[itemIndex] = item;
    });
    _updateOrderSummary();
  }

  void _updateOrderSummary() {
    setState(() {
      // Trigger re-render
    });
  }

  double _calculateSubtotal() {
    return _orderItems.fold(0.0, (sum, item) => sum + (item.totalPrice ?? 0));
  }

  double _calculateVat() {
    if (!_applyVat) return 0;
    return (_calculateSubtotal() * _vatPercentage) / 100;
  }

  double _calculateTotal() {
    return _calculateSubtotal() + _calculateVat();
  }

  Future<void> _submitOrder() async {
    if (_selectedBranchId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a branch')),
      );
      return;
    }
    
    if (_orderItems.isEmpty || _orderItems.any((item) => item.inventoryItemId.isEmpty || item.uomId.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one valid item')),
      );
      return;
    }

    setState(() {
      _loading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.dio.post('/rms/orders', data: {
        'branchId': _selectedBranchId,
        'tableId': _selectedTableId.isEmpty ? null : _selectedTableId,
        'type': _orderType,
        'customerName': _customerName.isEmpty ? null : _customerName,
        'customerPhone': _customerPhone.isEmpty ? null : _customerPhone,
        'notes': _notes.isEmpty ? null : _notes,
        'applyVat': _applyVat,
        'vatPercentage': _applyVat ? _vatPercentage : null,
        'items': _orderItems
            .where((item) => item.inventoryItemId.isNotEmpty && item.uomId.isNotEmpty)
            .map((item) => {
              'inventoryItemId': item.inventoryItemId,
              'uomId': item.uomId,
              'quantity': item.quantity,
            })
            .toList()
      });

      if (response.statusCode == 200 && response.data['success']) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order created successfully')),
          );
          context.go('/ims/sales');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create order: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingData) {
      return Scaffold(
        appBar: AppBar(title: const Text('Create Order')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Order'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Branch Selection
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
            Row(
              children: [
                        const Text(
                          'Branch',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          '*',
                          style: TextStyle(color: Colors.red, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                    value: _selectedBranchId.isEmpty ? null : _selectedBranchId,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                        hintText: 'Select Branch',
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: _branches.map((branch) {
                        return DropdownMenuItem<String>(
                        value: branch['id'],
                          child: Text('${branch['name']}${branch['isDefault'] == true ? ' (Default)' : ''}'),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedBranchId = value ?? '';
                          _orderItems.clear(); // Clear items when branch changes
                        });
                        if (value != null) {
                          _loadInventoryItems();
                        }
                      },
                    ),
                    if (_selectedBranchId.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          'Please select a branch first',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Order Items Section
            if (_selectedBranchId.isNotEmpty) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Order Items',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            '*',
                            style: TextStyle(color: Colors.red, fontSize: 16),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ..._orderItems.map((item) {
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Item Selection
                                DropdownButtonFormField<String>(
                                  value: item.inventoryItemId.isEmpty ? null : item.inventoryItemId,
                                  decoration: const InputDecoration(
                                    labelText: 'Item',
                                    border: OutlineInputBorder(),
                                    isDense: true,
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                  items: _inventoryItems.map((inv) {
                                    return DropdownMenuItem<String>(
                                      value: inv['id'],
                                      child: Text('${inv['name']} - ₦${(inv['price'] ?? 0).toStringAsFixed(2)}'),
                                    );
                                  }).toList(),
                                  onChanged: (value) {
                                    if (value != null) {
                                      _handleItemChange(item.id, 'inventoryItemId', value);
                                    }
                                  },
                                ),
                                const SizedBox(height: 12),
                                
                                // Unit and Quantity Row
                                Row(
                                  children: [
                                    Expanded(
                                      flex: 2,
                                      child: DropdownButtonFormField<String>(
                                        value: item.uomId.isEmpty ? null : item.uomId,
                                        decoration: const InputDecoration(
                                          labelText: 'Unit',
                                          border: OutlineInputBorder(),
                                          isDense: true,
                                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        ),
                                        items: item.availableUoms?.map((uom) {
                                          return DropdownMenuItem<String>(
                                            value: uom['id'],
                                            child: Text(uom['name'] ?? ''),
                                          );
                                        }).toList(),
                                        onChanged: item.inventoryItemId.isEmpty
                                            ? null
                                            : (value) {
                                                if (value != null) {
                                                  _handleItemChange(item.id, 'uomId', value);
                                                }
                                              },
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      flex: 1,
                                      child: TextFormField(
                                        controller: _quantityControllers[item.id] ??= TextEditingController(text: item.quantity.toString()),
                                        decoration: const InputDecoration(
                                          labelText: 'Quantity',
                                          border: OutlineInputBorder(),
                                        ),
                                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                        onChanged: (value) {
                                          if (value.isEmpty) {
                                            _handleItemChange(item.id, 'quantity', 0);
                                            return;
                                          }
                                          _handleItemChange(item.id, 'quantity', value);
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                                if (item.stock != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Available: ${item.stock!.toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                
                                // Total and Remove
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Total: ₦${(item.totalPrice ?? 0).toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete, color: Colors.red),
                                      onPressed: () => _removeOrderItem(item.id),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _addOrderItem,
                        icon: const Icon(Icons.add),
                        label: const Text('Add Item'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Additional Details - Collapsible
              Card(
                child: Column(
                  children: [
                    InkWell(
                      onTap: () {
                        setState(() {
                          _showDetails = !_showDetails;
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.settings, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Additional Details',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(width: 8),
                                Text(
                                  '(Table, Order Type, Customer, Notes)',
                                  style: TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                              ],
                            ),
                            Icon(
                              _showDetails ? Icons.expand_less : Icons.expand_more,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_showDetails) ...[
                      const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            // Table
            DropdownButtonFormField<String>(
              value: _selectedTableId.isEmpty ? null : _selectedTableId,
              decoration: const InputDecoration(
                                labelText: 'Table (Optional)',
                border: OutlineInputBorder(),
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: [
                const DropdownMenuItem(value: '', child: Text('No Table')),
                ..._tables.map((table) {
                  return DropdownMenuItem(
                    value: table['id'],
                    child: Text(table['name'] ?? 'Table ${table['number']}'),
                  );
                }),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedTableId = value ?? '';
                });
              },
            ),
            const SizedBox(height: 16),

                            // Order Type
                            DropdownButtonFormField<String>(
                              value: _orderType,
                              decoration: const InputDecoration(
                                labelText: 'Order Type *',
                                border: OutlineInputBorder(),
                                isDense: true,
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'dine_in', child: Text('Dine In')),
                                DropdownMenuItem(value: 'takeaway', child: Text('Takeaway')),
                                DropdownMenuItem(value: 'delivery', child: Text('Delivery')),
                              ],
                              onChanged: (value) {
                                setState(() {
                                  _orderType = value ?? 'dine_in';
                                });
                              },
                            ),
                            const SizedBox(height: 16),
                            
                            // Customer Name
                            TextFormField(
                              decoration: const InputDecoration(
                                labelText: 'Customer Name (Optional)',
                                border: OutlineInputBorder(),
                              ),
                              onChanged: (value) {
                                setState(() {
                                  _customerName = value;
                                });
                              },
                    ),
                    const SizedBox(height: 16),
                            
                            // Customer Phone
                            TextFormField(
                      decoration: const InputDecoration(
                                labelText: 'Customer Phone (Optional)',
                        border: OutlineInputBorder(),
                      ),
                              keyboardType: TextInputType.phone,
                      onChanged: (value) {
                        setState(() {
                                  _customerPhone = value;
                        });
                      },
                    ),
                            const SizedBox(height: 16),
                            
                            // Notes
                      TextFormField(
                        decoration: const InputDecoration(
                                labelText: 'Notes (Optional)',
                          border: OutlineInputBorder(),
                              ),
                              maxLines: 3,
                              onChanged: (value) {
                                setState(() {
                                  _notes = value;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // VAT Option
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _applyVat,
                        onChanged: (value) {
                          setState(() {
                            _applyVat = value ?? false;
                            if (_applyVat) {
                              _vatController.text = _vatPercentage.toString();
                            } else {
                              _vatController.clear();
                            }
                          });
                        },
                        activeColor: Colors.red,
                      ),
                      const Text('Apply VAT'),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _vatController,
                          decoration: const InputDecoration(
                            labelText: 'VAT %',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          enabled: _applyVat,
                          onChanged: (value) {
                            if (value.isEmpty) {
                              setState(() {
                                _vatPercentage = 0.0;
                              });
                              return;
                            }
                            setState(() {
                              _vatPercentage = double.tryParse(value) ?? 0.0;
                            });
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

              // Order Summary
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Order Summary',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                          const Text('Items:'),
                              Text(
                            _orderItems.fold(0.0, (sum, item) => sum + item.quantity).toStringAsFixed(0),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal:'),
                          Text(
                            '₦${_calculateSubtotal().toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                      if (_applyVat && _vatPercentage > 0) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('VAT (${_vatPercentage}%):'),
                            Text(
                              '₦${_calculateVat().toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                      const Divider(height: 24),
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total:',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '₦${_calculateTotal().toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.red,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            PrimaryButton(
              text: _loading ? 'Creating...' : 'Create Order',
                onPressed: _loading ||
                        _selectedBranchId.isEmpty ||
                        _orderItems.isEmpty ||
                        _orderItems.any((item) => item.inventoryItemId.isEmpty || item.uomId.isEmpty)
                    ? null
                    : _submitOrder,
              ),
            ] else ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'Please select a branch first',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
