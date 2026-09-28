// app/api/invoices/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { parseInvoicePDF } from '@/lib/invoice-parser';
import { Vendor } from '@/lib/types';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('invoice') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseInvoicePDF(buffer);

    // Try to match vendor by name
    let vendor: Vendor | undefined;
    if (parsed.vendor_name) {
      vendor = dbGet<Vendor>(
        `SELECT * FROM vendors WHERE name LIKE ? LIMIT 1`,
        [`%${parsed.vendor_name.substring(0, 15)}%`]
      );
    }

    // Create invoice record
    const invoiceId = `inv_${Date.now()}`;
    dbRun(
      `INSERT INTO invoices (id, vendor_id, po_number, invoice_number, amount, line_items, raw_text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        invoiceId,
        vendor?.id || null,
        parsed.po_number || null,
        parsed.invoice_number || null,
        parsed.amount || 0,
        JSON.stringify(parsed.line_items),
        parsed.raw_text,
      ]
    );

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      parsed: {
        vendor_name: parsed.vendor_name,
        vendor_id: vendor?.id,
        vendor_matched: !!vendor,
        po_number: parsed.po_number,
        invoice_number: parsed.invoice_number,
        amount: parsed.amount,
        line_items_count: parsed.line_items.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
