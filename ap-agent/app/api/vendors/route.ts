// app/api/vendors/route.ts
import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { Vendor } from '@/lib/types';

export async function GET() {
  try {
    const vendors = dbAll<Vendor>('SELECT * FROM vendors ORDER BY total_invoices DESC');
    return NextResponse.json({ vendors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
