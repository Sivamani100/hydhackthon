// app/api/purchase-orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbGet } from '@/lib/db';
import { PurchaseOrder } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const purchaseOrder = dbGet<PurchaseOrder>('SELECT * FROM purchase_orders WHERE id = ?', [params.id]);
    
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    return NextResponse.json({ purchaseOrder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
