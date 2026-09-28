// app/api/vendors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll } from '@/lib/db';
import { Vendor, Invoice } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [params.id]);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const invoices = dbAll<Invoice>('SELECT * FROM invoices WHERE vendor_id = ? ORDER BY submitted_at DESC', [params.id]);
    const memoryLogs = dbAll<any>('SELECT * FROM memory_logs WHERE vendor_id = ? ORDER BY created_at DESC', [params.id]);

    return NextResponse.json({ 
      vendor,
      invoices,
      memoryLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
