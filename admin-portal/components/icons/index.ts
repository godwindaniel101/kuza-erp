export type { IconProps } from './IconBase';
export { default as IconBase } from './IconBase';

export { DashboardIcon } from './DashboardIcon';
export { AppsIcon } from './AppsIcon';
export { ReportIcon } from './ReportIcon';
export { InventoryIcon } from './InventoryIcon';
export { StockMovementIcon } from './StockMovementIcon';
export { TransferIcon } from './TransferIcon';
export { AdjustmentIcon } from './AdjustmentIcon';
export { ReceiveIcon } from './ReceiveIcon';
export { ExportIcon } from './ExportIcon';
export { OrderIcon } from './OrderIcon';
export { DiningIcon } from './DiningIcon';
export { MenuIcon } from './MenuIcon';
export { CustomerIcon } from './CustomerIcon';
export { SupplierIcon } from './SupplierIcon';
export { InvoiceIcon } from './InvoiceIcon';
export { PaymentIcon } from './PaymentIcon';
export { LedgerIcon } from './LedgerIcon';
export { JournalIcon } from './JournalIcon';
export { ChartOfAccountsIcon } from './ChartOfAccountsIcon';
export { EmployeeIcon } from './EmployeeIcon';
export { DepartmentIcon } from './DepartmentIcon';
export { AttendanceIcon } from './AttendanceIcon';
export { LeaveIcon } from './LeaveIcon';
export { PayrollIcon } from './PayrollIcon';
export { BenefitsIcon } from './BenefitsIcon';
export { SettingsIcon } from './SettingsIcon';
export { RolesIcon } from './RolesIcon';
export { BranchIcon } from './BranchIcon';
export { NotificationIcon } from './NotificationIcon';
export { LogoutIcon } from './LogoutIcon';
export { SearchIcon } from './SearchIcon';
export { FilterIcon } from './FilterIcon';
export { AddIcon } from './AddIcon';
export { EditIcon } from './EditIcon';
export { DeleteIcon } from './DeleteIcon';
export { ChevronIcon } from './ChevronIcon';
export { ChevronDownIcon } from './ChevronDownIcon';
export { KuzaLeafIcon } from './KuzaLeafIcon';
export { KuzaMarkIcon } from './KuzaMarkIcon';

// Semantic name -> component map for data-driven rendering (menus, config).
import type { IconProps } from './IconBase';
import type { ComponentType } from 'react';
import { DashboardIcon } from './DashboardIcon';
import { AppsIcon } from './AppsIcon';
import { ReportIcon } from './ReportIcon';
import { InventoryIcon } from './InventoryIcon';
import { StockMovementIcon } from './StockMovementIcon';
import { TransferIcon } from './TransferIcon';
import { AdjustmentIcon } from './AdjustmentIcon';
import { ReceiveIcon } from './ReceiveIcon';
import { ExportIcon } from './ExportIcon';
import { OrderIcon } from './OrderIcon';
import { DiningIcon } from './DiningIcon';
import { MenuIcon } from './MenuIcon';
import { CustomerIcon } from './CustomerIcon';
import { SupplierIcon } from './SupplierIcon';
import { InvoiceIcon } from './InvoiceIcon';
import { PaymentIcon } from './PaymentIcon';
import { LedgerIcon } from './LedgerIcon';
import { JournalIcon } from './JournalIcon';
import { ChartOfAccountsIcon } from './ChartOfAccountsIcon';
import { EmployeeIcon } from './EmployeeIcon';
import { DepartmentIcon } from './DepartmentIcon';
import { AttendanceIcon } from './AttendanceIcon';
import { LeaveIcon } from './LeaveIcon';
import { PayrollIcon } from './PayrollIcon';
import { BenefitsIcon } from './BenefitsIcon';
import { SettingsIcon } from './SettingsIcon';
import { RolesIcon } from './RolesIcon';
import { BranchIcon } from './BranchIcon';
import { NotificationIcon } from './NotificationIcon';
import { LogoutIcon } from './LogoutIcon';
import { SearchIcon } from './SearchIcon';
import { FilterIcon } from './FilterIcon';
import { AddIcon } from './AddIcon';
import { EditIcon } from './EditIcon';
import { DeleteIcon } from './DeleteIcon';
import { ChevronIcon } from './ChevronIcon';
import { ChevronDownIcon } from './ChevronDownIcon';
import { KuzaLeafIcon } from './KuzaLeafIcon';
import { KuzaMarkIcon } from './KuzaMarkIcon';

export type IconComponent = ComponentType<IconProps>;

export const icons = {
  'dashboard': DashboardIcon,
  'apps': AppsIcon,
  'report': ReportIcon,
  'inventory': InventoryIcon,
  'stock-movement': StockMovementIcon,
  'transfer': TransferIcon,
  'adjustment': AdjustmentIcon,
  'receive': ReceiveIcon,
  'export': ExportIcon,
  'order': OrderIcon,
  'dining': DiningIcon,
  'menu': MenuIcon,
  'customer': CustomerIcon,
  'supplier': SupplierIcon,
  'invoice': InvoiceIcon,
  'payment': PaymentIcon,
  'ledger': LedgerIcon,
  'journal': JournalIcon,
  'chart-of-accounts': ChartOfAccountsIcon,
  'employee': EmployeeIcon,
  'department': DepartmentIcon,
  'attendance': AttendanceIcon,
  'leave': LeaveIcon,
  'payroll': PayrollIcon,
  'benefits': BenefitsIcon,
  'settings': SettingsIcon,
  'roles': RolesIcon,
  'branch': BranchIcon,
  'notification': NotificationIcon,
  'logout': LogoutIcon,
  'search': SearchIcon,
  'filter': FilterIcon,
  'add': AddIcon,
  'edit': EditIcon,
  'delete': DeleteIcon,
  'chevron': ChevronIcon,
  'chevron-down': ChevronDownIcon,
  'kuza-leaf': KuzaLeafIcon,
  'kuza-mark': KuzaMarkIcon,
} satisfies Record<string, IconComponent>;

export type IconKey = keyof typeof icons;
