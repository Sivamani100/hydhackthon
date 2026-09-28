// app/api/invoices/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll, dbRun } from '@/lib/db';
import { recall, remember, buildDecisionMemory } from '@/lib/hindsight';
import { getAgentDecision } from '@/lib/groq';
import { runThreeWayMatch } from '@/lib/ap-logic';
import { Invoice, Vendor, PurchaseOrder, GoodsReceipt } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    // 1. Load invoice
    const invoice = dbGet<Invoice>('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Load vendor
    const vendor = invoice.vendor_id
      ? dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [invoice.vendor_id])
      : null;

    // 3. Load PO
    const po = invoice.po_number
      ? dbGet<PurchaseOrder>('SELECT * FROM purchase_orders WHERE po_number = ?', [invoice.po_number])
      : null;

    // 4. Load goods receipt
    const goodsReceipt = po
      ? dbGet<GoodsReceipt>('SELECT * FROM goods_receipts WHERE po_id = ?', [po.id])
      : null;

    // 5. Get existing invoice numbers (for duplicate check)
    const existingInvoices = dbAll<{ invoice_number: string }>(
      'SELECT invoice_number FROM invoices WHERE invoice_number IS NOT NULL AND id != ?',
      [invoice_id]
    );
    const existingInvoiceNumbers = existingInvoices.map(i => i.invoice_number);

    // 6. Run 3-way match
    const discrepancies = runThreeWayMatch({
      invoice: {
        amount: invoice.amount,
        po_number: invoice.po_number,
        line_items: JSON.parse(invoice.line_items || '[]'),
        invoice_number: invoice.invoice_number,
      },
      po: po ? { amount: po.amount, vendor_id: po.vendor_id, status: po.status } : null,
      goodsReceipt: goodsReceipt ? {
        quantity_received: goodsReceipt.quantity_received,
        notes: goodsReceipt.notes,
      } : null,
      existingInvoiceNumbers,
    });

    // 7. Recall from Hindsight memory
    const memoryQuery = vendor
      ? `${vendor.name} invoice exceptions discrepancies patterns decisions`
      : `unknown vendor invoice processing`;

    const memories = await recall({ query: memoryQuery, limit: 5 });

    // 8. Get agent decision from Groq
    const agentResult = await getAgentDecision({
      vendorName: vendor?.name || 'Unknown Vendor',
      vendorKnownPatterns: vendor ? JSON.parse(vendor.known_patterns || '[]') : [],
      vendorRiskScore: vendor?.risk_score || 0.5,
      invoiceNumber: invoice.invoice_number || 'N/A',
      invoiceAmount: invoice.amount,
      poNumber: invoice.po_number,
      poAmount: po?.amount || null,
      poExists: !!po,
      goodsReceiptExists: !!goodsReceipt,
      goodsReceiptPartial: goodsReceipt?.quantity_received !== null && (goodsReceipt?.quantity_received || 0) < 1.0,
      discrepancies,
      memoryContext: memories,
      pastDecisionCount: vendor?.total_invoices || 0,
    });

    // 9. Save decision to DB
    const decisionId = `dec_${Date.now()}`;
    dbRun(
      `INSERT INTO decisions (id, invoice_id, decision, confidence, reasoning, memory_context, discrepancies)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        decisionId,
        invoice_id,
        agentResult.decision,
        agentResult.confidence,
        agentResult.reasoning,
        JSON.stringify(memories),
        JSON.stringify(discrepancies),
      ]
    );

    // 10. Update invoice status
    dbRun(
      `UPDATE invoices SET status = ?, processed_at = datetime('now') WHERE id = ?`,
      [agentResult.decision === 'approve' ? 'approved' : agentResult.decision === 'reject' ? 'rejected' : 'flagged', invoice_id]
    );

    // 11. Update vendor stats
    if (vendor) {
      const field = agentResult.decision === 'approve' ? 'total_approved'
        : agentResult.decision === 'reject' ? 'total_rejected' : 'total_flagged';
      dbRun(
        `UPDATE vendors SET total_invoices = total_invoices + 1, ${field} = ${field} + 1,
         updated_at = datetime('now') WHERE id = ?`,
        [vendor.id]
      );
    }

    // 12. Write to Hindsight memory (non-blocking)
    if (vendor) {
      const memoryContent = buildDecisionMemory({
        vendorName: vendor.name,
        invoiceNumber: invoice.invoice_number || 'N/A',
        invoiceAmount: invoice.amount,
        poAmount: po?.amount || 0,
        discrepancies,
        decision: agentResult.decision,
        confidence: agentResult.confidence,
        reasoning: agentResult.reasoning,
        wasOverridden: false,
      });

      remember({
        content: memoryContent,
        metadata: {
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          invoice_id,
          decision: agentResult.decision,
          confidence: agentResult.confidence,
        },
        tags: ['ap-decision', vendor.id, agentResult.decision],
      }).then(id => {
        if (id) {
          dbRun(
            `INSERT INTO memory_logs (id, vendor_id, invoice_id, memory_type, content, hindsight_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [`ml_${Date.now()}`, vendor.id, invoice_id, 'decision', memoryContent, id]
          );
        }
      });
    }

    return NextResponse.json({
      success: true,
      decision_id: decisionId,
      decision: agentResult.decision,
      confidence: agentResult.confidence,
      reasoning: agentResult.reasoning,
      discrepancies,
      memory_used: memories.length,
    });

  } catch (err: any) {
    console.error('[ProcessInvoice] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
