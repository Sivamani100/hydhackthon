// app/api/memory/stats/route.ts
import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export async function GET() {
  try {
    const stats = dbAll(`
      SELECT vendor_id, COUNT(*) as memory_count 
      FROM memory_logs 
      GROUP BY vendor_id 
      ORDER BY memory_count DESC
    `);
    
    // Also fetch the 5 most recent memory logs
    const recentLogs = dbAll(`
      SELECT m.*, v.name as vendor_name 
      FROM memory_logs m 
      LEFT JOIN vendors v ON m.vendor_id = v.id 
      ORDER BY m.created_at DESC 
      LIMIT 5
    `);

    return NextResponse.json({ stats, recent_logs: recentLogs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
