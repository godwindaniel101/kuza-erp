import 'package:go_router/go_router.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/rms/menus/menus_screen.dart';
import '../screens/ims/inventory/inventory_screen.dart';
import '../screens/ims/sales/sales_screen.dart';
import '../screens/ims/sales/create_sale_screen.dart';
import '../screens/ims/inflows/inflows_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../providers/auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoginPage = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!isAuthenticated && !isLoginPage) {
        return '/login';
      }

      if (isAuthenticated && isLoginPage) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/rms/menus',
        builder: (context, state) => const MenusScreen(),
      ),
      GoRoute(
        path: '/ims/inventory',
        builder: (context, state) => const InventoryScreen(),
      ),
      GoRoute(
        path: '/ims/sales',
        builder: (context, state) => const SalesScreen(),
      ),
      GoRoute(
        path: '/ims/sales/create',
        builder: (context, state) => const CreateSaleScreen(),
      ),
      GoRoute(
        path: '/ims/inflows',
        builder: (context, state) => const InflowsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});
