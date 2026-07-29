import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney } from '@/lib/format';

/**
 * A reusable, printable ~80mm thermal-style receipt.
 *
 * It renders (via a portal) into <body> so that it lives OUTSIDE the app chrome
 * (sidebar/header). On screen it is hidden (`.receipt-print { display: none }`);
 * only when printing does it become visible, while everything else is hidden —
 * see the `@media print` block in styles/globals.css.
 *
 * The order shape mirrors what /rms/orders/[id] consumes (order.items, totals,
 * payments, customer). Every field is read defensively so a partially-populated
 * order (e.g. the POS create response) still prints cleanly.
 */

interface ReceiptProps {
  order: any;
  currency: string;
  businessName?: string;
}

function money(amount: any, currency: string) {
  return formatMoney(Number(amount ?? 0), currency);
}

function itemName(item: any): string {
  return item?.name || item?.inventoryItem?.name || item?.menuItem?.name || 'Item';
}

function itemUnitPrice(item: any): number {
  return Number(item?.unitPrice ?? item?.price ?? 0);
}

function itemQty(item: any): number {
  return Number(item?.quantity ?? item?.qty ?? 0);
}

function itemLineTotal(item: any): number {
  if (item?.totalPrice != null) return Number(item.totalPrice);
  if (item?.lineTotal != null) return Number(item.lineTotal);
  return itemUnitPrice(item) * itemQty(item);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return new Date().toLocaleString();
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function Receipt({ order, currency, businessName }: ReceiptProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !order) return null;

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const payments: any[] = Array.isArray(order.payments) ? order.payments : [];

  const subtotal = Number(order.subtotal ?? items.reduce((s, i) => s + itemLineTotal(i), 0));
  const tax = Number(order.tax ?? order.vat ?? 0);
  const discount = Number(order.discount ?? order.discountAmount ?? 0);
  const total = Number(
    order.totalAmount ?? order.total ?? subtotal + tax - discount,
  );
  const amountPaid = payments.length
    ? payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
    : Number(order.amountPaid ?? 0);
  const change = amountPaid > total ? amountPaid - total : 0;
  const paymentMethod =
    (payments[0]?.method as string | undefined) || order.paymentMethod || '';

  const row = (
    label: string,
    value: string,
    opts: { bold?: boolean; large?: boolean } = {},
  ) => (
    <div
      className={`flex justify-between ${opts.bold ? 'font-bold' : ''} ${
        opts.large ? 'text-sm' : ''
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  const content = (
    <div className="receipt-print">
      <div className="receipt-paper">
        {/* Header */}
        <div className="receipt-center">
          <div className="receipt-business">{businessName || 'Kuza'}</div>
          {order.branch?.name && <div>{order.branch.name}</div>}
          {order.branch?.address && <div>{order.branch.address}</div>}
        </div>

        <div className="receipt-hr" />

        {/* Meta */}
        <div className="receipt-meta">
          {row('Receipt', order.orderNumber || order.id || '-')}
          {row('Date', formatDateTime(order.createdAt))}
          {order.orderType && row('Type', String(order.orderType).replace(/_/g, ' '))}
          {order.customerName && row('Customer', order.customerName)}
          {order.customerPhone && row('Phone', order.customerPhone)}
        </div>

        <div className="receipt-hr" />

        {/* Items */}
        <div className="receipt-items">
          {items.length === 0 && <div className="receipt-center">No items</div>}
          {items.map((item, idx) => {
            const qty = itemQty(item);
            const uom = item?.uom?.abbreviation || item?.uom?.name || '';
            return (
              <div key={item.id || idx} className="receipt-item">
                <div className="receipt-item-name">{itemName(item)}</div>
                <div className="flex justify-between">
                  <span>
                    {qty.toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                    {uom ? ` ${uom}` : ''} @ {money(itemUnitPrice(item), currency)}
                  </span>
                  <span>{money(itemLineTotal(item), currency)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="receipt-hr" />

        {/* Totals */}
        <div className="receipt-totals">
          {row('Subtotal', money(subtotal, currency))}
          {tax > 0 && row('VAT', money(tax, currency))}
          {discount > 0 && row('Discount', `-${money(discount, currency)}`)}
          <div className="receipt-hr-dashed" />
          {row('Total', money(total, currency), { bold: true, large: true })}
          {amountPaid > 0 && row('Paid', money(amountPaid, currency))}
          {change > 0 && row('Change', money(change, currency))}
          {paymentMethod &&
            row('Method', String(paymentMethod).replace(/_/g, ' '))}
        </div>

        <div className="receipt-hr" />

        {/* Footer */}
        <div className="receipt-center receipt-footer">
          <div>Thank you for your business!</div>
          <div>Powered by Kuza</div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
