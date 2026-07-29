import {
  DashboardIcon,
  AppsIcon,
  ReportIcon,
  InventoryIcon,
  StockMovementIcon,
  TransferIcon,
  AdjustmentIcon,
  ReceiveIcon,
  ExportIcon,
  OrderIcon,
  DiningIcon,
  MenuIcon,
  CustomerIcon,
  SupplierIcon,
  InvoiceIcon,
  PaymentIcon,
  LedgerIcon,
  JournalIcon,
  ChartOfAccountsIcon,
  EmployeeIcon,
  DepartmentIcon,
  AttendanceIcon,
  LeaveIcon,
  PayrollIcon,
  BenefitsIcon,
  SettingsIcon,
  RolesIcon,
  BranchIcon,
  NotificationIcon,
  LogoutIcon,
  SearchIcon,
  FilterIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
  ChevronIcon,
  ChevronDownIcon,
  KuzaLeafIcon,
  KuzaMarkIcon,
  IconProps,
} from './index';
import type { ComponentType } from 'react';

interface Entry {
  Comp: ComponentType<IconProps>;
  key: string;
  label: string;
  category: string;
}

const entries: Entry[] = [
  { Comp: DashboardIcon, key: 'dashboard', label: "Dashboard", category: "Core" },
  { Comp: AppsIcon, key: 'apps', label: "Apps", category: "Core" },
  { Comp: ReportIcon, key: 'report', label: "Report", category: "Core" },
  { Comp: InventoryIcon, key: 'inventory', label: "Inventory / Box", category: "Inventory" },
  { Comp: StockMovementIcon, key: 'stock-movement', label: "Stock movement", category: "Inventory" },
  { Comp: TransferIcon, key: 'transfer', label: "Transfer", category: "Inventory" },
  { Comp: AdjustmentIcon, key: 'adjustment', label: "Adjustment", category: "Inventory" },
  { Comp: ReceiveIcon, key: 'receive', label: "Inflow / Receive", category: "Inventory" },
  { Comp: ExportIcon, key: 'export', label: "Export", category: "Inventory" },
  { Comp: OrderIcon, key: 'order', label: "Order / Cart", category: "Sales" },
  { Comp: DiningIcon, key: 'dining', label: "Table / Dining", category: "Sales" },
  { Comp: MenuIcon, key: 'menu', label: "Menu", category: "Sales" },
  { Comp: CustomerIcon, key: 'customer', label: "Customer", category: "Sales" },
  { Comp: SupplierIcon, key: 'supplier', label: "Supplier", category: "Sales" },
  { Comp: InvoiceIcon, key: 'invoice', label: "Invoice", category: "Accounting" },
  { Comp: PaymentIcon, key: 'payment', label: "Payment", category: "Accounting" },
  { Comp: LedgerIcon, key: 'ledger', label: "Ledger / Book", category: "Accounting" },
  { Comp: JournalIcon, key: 'journal', label: "Journal", category: "Accounting" },
  { Comp: ChartOfAccountsIcon, key: 'chart-of-accounts', label: "Chart of accounts", category: "Accounting" },
  { Comp: EmployeeIcon, key: 'employee', label: "Employee", category: "HRMS" },
  { Comp: DepartmentIcon, key: 'department', label: "Department", category: "HRMS" },
  { Comp: AttendanceIcon, key: 'attendance', label: "Attendance", category: "HRMS" },
  { Comp: LeaveIcon, key: 'leave', label: "Leave", category: "HRMS" },
  { Comp: PayrollIcon, key: 'payroll', label: "Payroll", category: "HRMS" },
  { Comp: BenefitsIcon, key: 'benefits', label: "Benefits", category: "HRMS" },
  { Comp: SettingsIcon, key: 'settings', label: "Settings", category: "Admin" },
  { Comp: RolesIcon, key: 'roles', label: "Roles / Shield", category: "Admin" },
  { Comp: BranchIcon, key: 'branch', label: "Branch / Store", category: "Admin" },
  { Comp: NotificationIcon, key: 'notification', label: "Notification / Bell", category: "Admin" },
  { Comp: LogoutIcon, key: 'logout', label: "Logout", category: "Admin" },
  { Comp: SearchIcon, key: 'search', label: "Search", category: "Actions" },
  { Comp: FilterIcon, key: 'filter', label: "Filter", category: "Actions" },
  { Comp: AddIcon, key: 'add', label: "Add / Plus", category: "Actions" },
  { Comp: EditIcon, key: 'edit', label: "Edit", category: "Actions" },
  { Comp: DeleteIcon, key: 'delete', label: "Delete / Trash", category: "Actions" },
  { Comp: ChevronIcon, key: 'chevron', label: "Chevron (right)", category: "Actions" },
  { Comp: ChevronDownIcon, key: 'chevron-down', label: "Chevron (down)", category: "Actions" },
  { Comp: KuzaLeafIcon, key: 'kuza-leaf', label: "Kuza grow mark", category: "Brand" },
  { Comp: KuzaMarkIcon, key: 'kuza-mark', label: "Kuza app mark", category: "Brand" },
];

/**
 * Visual QA gallery for the Kuza icon set. Groups every icon by category and
 * renders it at a few sizes so stroke weight and optical balance can be
 * eyeballed side by side. Import into any page during design review.
 */
export default function IconGallery() {
  const categories = Array.from(new Set(entries.map((e) => e.category)));
  return (
    <div className="p-6 text-gray-800 dark:text-gray-100">
      <h1 className="text-xl font-semibold">Kuza icon system</h1>
      <p className="mt-1 text-sm text-gray-500">
        24&times;24 grid &middot; 1.75px stroke &middot; round caps &amp; joins &middot; currentColor
      </p>
      {categories.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-gray-400">
            {cat}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {entries
              .filter((e) => e.category === cat)
              .map(({ Comp, key, label }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-brand-600 dark:border-gray-700 dark:text-brand-300"
                >
                  <Comp size={28} />
                  <span className="text-center text-xs text-gray-500">{label}</span>
                  <code className="text-2xs text-gray-400">{key}</code>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
