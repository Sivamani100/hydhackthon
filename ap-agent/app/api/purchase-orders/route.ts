// app/api/purchase-orders/route.ts
import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';
import { PurchaseOrder } from '@/lib/types';

export async function GET() {
  try {
    const purchaseOrders = dbAll<PurchaseOrder>('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    return NextResponse.json({ purchaseOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
