// lib/ap-logic.ts
// Pure business logic — no database calls, just data in, discrepancies out

import { Discrepancy, LineItem, ParsedInvoice } from './types';

export interface MatchInput {
  invoice: {
    amount: number;
    po_number: string | null;
    line_items: LineItem[];
    invoice_number: string | null;
  };
  po: {
    amount: number;
    vendor_id: string;
    status: string;
  } | null;
  goodsReceipt: {
    quantity_received: number | null;
    notes: string | null;
  } | null;
  existingInvoiceNumbers: string[];
}

export function runThreeWayMatch(input: MatchInput): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const { invoice, po, goodsReceipt, existingInvoiceNumbers } = input;

  // 1. PO existence check
  if (!invoice.po_number) {
    discrepancies.push({
      type: 'missing_po',
      description: 'Invoice does not reference a purchase order number.',
      severity: 'high',
    });
  } else if (!po) {
    discrepancies.push({
      type: 'missing_po',
      description: `PO number ${invoice.po_number} not found in system.`,
      severity: 'high',
    });
  }

  // 2. Amount mismatch check (if PO exists)
  if (po && invoice.amount) {
    const diff = Math.abs(invoice.amount - po.amount);
    const diffPercent = diff / po.amount;

    if (diff > 0) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (diffPercent > 0.15) severity = 'high';
      else if (diffPercent > 0.05) severity = 'medium';

      discrepancies.push({
        type: 'amount_mismatch',
        description: `Invoice amount INR ${invoice.amount} differs from PO amount INR ${po.amount}.`,
        severity,
        po_value: po.amount,
        invoice_value: invoice.amount,
        difference: invoice.amount - po.amount,
      });
    }
  }

  // 3. Goods receipt check (for invoices over INR 10,000)
  if (invoice.amount > 10000) {
    if (!goodsReceipt) {
      discrepancies.push({
        type: 'line_item_mismatch',
        description: 'No goods receipt found for this PO. Cannot confirm delivery before payment.',
        severity: 'high',
      });
    } else if (goodsReceipt.quantity_received !== null && goodsReceipt.quantity_received < 1.0) {
      discrepancies.push({
        type: 'line_item_mismatch',
        description: `Partial delivery confirmed (${Math.round(goodsReceipt.quantity_received * 100)}%). Full invoice amount may not be payable yet.`,
        severity: 'medium',
      });
    }
  }

  // 4. Duplicate invoice check
  if (invoice.invoice_number && existingInvoiceNumbers.includes(invoice.invoice_number)) {
    discrepancies.push({
      type: 'duplicate_invoice',
      description: `Invoice number ${invoice.invoice_number} has already been processed.`,
      severity: 'high',
    });
  }

  return discrepancies;
}

// Calculate discrepancy severity summary
export function getSeveritySummary(discrepancies: Discrepancy[]): 'clean' | 'minor' | 'major' | 'critical' {
  if (discrepancies.length === 0) return 'clean';
  const hasHigh = discrepancies.some(d => d.severity === 'high');
  const hasMedium = discrepancies.some(d => d.severity === 'medium');
  const isDuplicate = discrepancies.some(d => d.type === 'duplicate_invoice');

  if (isDuplicate) return 'critical';
  if (hasHigh) return 'major';
  if (hasMedium) return 'minor';
  return 'minor';
}
