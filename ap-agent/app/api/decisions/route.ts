// app/api/decisions/route.ts
import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { Decision } from '@/lib/types';

export async function GET() {
  try {
    const decisions = dbAll<Decision & { invoice_number: string, vendor_name: string }>(`
      SELECT d.*, i.invoice_number, v.name as vendor_name
      FROM decisions d
      LEFT JOIN invoices i ON d.invoice_id = i.id
      LEFT JOIN vendors v ON i.vendor_id = v.id
      ORDER BY d.created_at DESC
    `);
    
    return NextResponse.json({ decisions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
