// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { Invoice } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const invoices = dbAll<Invoice & { vendor_name: string }>(`
      SELECT i.*, v.name as vendor_name 
      FROM invoices i 
      LEFT JOIN vendors v ON i.vendor_id = v.id 
      ORDER BY i.submitted_at DESC 
      LIMIT ?
    `, [limit]);

    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
