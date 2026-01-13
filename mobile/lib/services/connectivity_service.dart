import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ConnectivityStatus {
  connected,
  disconnected,
  unknown,
}

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final _controller = StreamController<ConnectivityStatus>.broadcast();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  Stream<ConnectivityStatus> get statusStream => _controller.stream;
  ConnectivityStatus _currentStatus = ConnectivityStatus.unknown;

  ConnectivityStatus get currentStatus => _currentStatus;

  ConnectivityService() {
    _init();
  }

  Future<void> _init() async {
    // Check initial status
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);

    // Listen to connectivity changes
    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      _updateStatus(result);
    });
  }

  void _updateStatus(List<ConnectivityResult> result) {
    ConnectivityStatus newStatus;
    
    if (result.contains(ConnectivityResult.mobile) ||
        result.contains(ConnectivityResult.wifi) ||
        result.contains(ConnectivityResult.ethernet)) {
      newStatus = ConnectivityStatus.connected;
    } else if (result.contains(ConnectivityResult.none)) {
      newStatus = ConnectivityStatus.disconnected;
    } else {
      newStatus = ConnectivityStatus.unknown;
    }

    if (_currentStatus != newStatus) {
      _currentStatus = newStatus;
      _controller.add(newStatus);
    }
  }

  Future<bool> hasConnection() async {
    final result = await _connectivity.checkConnectivity();
    return result.contains(ConnectivityResult.mobile) ||
        result.contains(ConnectivityResult.wifi) ||
        result.contains(ConnectivityResult.ethernet);
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

final connectivityStatusProvider = StreamProvider<ConnectivityStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.statusStream;
});

