// app/api/invoices/[id]/override/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { remember, buildDecisionMemory } from '@/lib/hindsight';
import { Invoice, Vendor, Decision } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { override_decision, override_reason, override_by } = await req.json();

    if (!override_decision || !override_reason) {
      return NextResponse.json({ error: 'override_decision and override_reason are required' }, { status: 400 });
    }

    const invoice = dbGet<Invoice>('SELECT * FROM invoices WHERE id = ?', [params.id]);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const decision = dbGet<Decision>('SELECT * FROM decisions WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1', [params.id]);
    const vendor = invoice.vendor_id ? dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [invoice.vendor_id]) : null;

    // Update decision
    if (decision) {
      dbRun(
        `UPDATE decisions SET was_overridden = 1, override_by = ?, override_reason = ?, override_decision = ? WHERE id = ?`,
        [override_by || 'Finance Team', override_reason, override_decision, decision.id]
      );
    }

    // Update invoice status
    const newStatus = override_decision === 'approve' ? 'approved' : override_decision === 'reject' ? 'rejected' : 'flagged';
    dbRun('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, params.id]);

    // Write override to Hindsight — this is critical for learning
    if (vendor && decision) {
      const memoryContent = buildDecisionMemory({
        vendorName: vendor.name,
        invoiceNumber: invoice.invoice_number || 'N/A',
        invoiceAmount: invoice.amount,
        poAmount: 0,
        discrepancies: JSON.parse(decision.discrepancies || '[]'),
        decision: decision.decision,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        wasOverridden: true,
        overrideReason: override_reason,
        finalDecision: override_decision,
      });

      await remember({
        content: memoryContent,
        metadata: {
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          invoice_id: params.id,
          override: 'true',
          final_decision: override_decision,
        },
        tags: ['ap-override', vendor.id, override_decision],
      });
    }

    return NextResponse.json({ success: true, new_status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
