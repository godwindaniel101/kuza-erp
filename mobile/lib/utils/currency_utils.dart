class CurrencyUtils {
  static String getCurrencySymbol(String? currencyCode) {
    switch (currencyCode?.toUpperCase()) {
      case 'NGN':
        return '₦';
      case 'USD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'JPY':
        return '¥';
      case 'CNY':
        return '¥';
      default:
        return currencyCode ?? '\$';
    }
  }

  static String formatCurrency(double amount, String? currencyCode) {
    final symbol = getCurrencySymbol(currencyCode);
    return '$symbol${amount.toStringAsFixed(2)}';
  }
}
