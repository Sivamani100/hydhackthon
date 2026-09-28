// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet } from '@/lib/db';
import { Invoice, Vendor, PurchaseOrder, Decision } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = dbGet<Invoice>('SELECT * FROM invoices WHERE id = ?', [params.id]);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const vendor = invoice.vendor_id 
      ? dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [invoice.vendor_id]) 
      : null;
      
    const po = invoice.po_number 
      ? dbGet<PurchaseOrder>('SELECT * FROM purchase_orders WHERE po_number = ?', [invoice.po_number]) 
      : null;
      
    const decision = dbGet<Decision>('SELECT * FROM decisions WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1', [params.id]);

    return NextResponse.json({ 
      invoice, 
      vendor, 
      po, 
      decision 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
