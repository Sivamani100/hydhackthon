// app/api/db/init/route.ts
import { NextResponse } from 'next/server';
import { getDb, dbRun, dbGet } from '@/lib/db';
import { SEED_SQL } from '@/lib/schema';

export async function GET() {
  try {
    const db = getDb(); // This triggers schema creation
    const vendorCount = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count;
    
    let seeded = false;
    if (vendorCount === 0) {
      db.exec(SEED_SQL);
      seeded = true;
    }

    return NextResponse.json({ 
      success: true, 
      tables_created: true, 
      seeded, 
      vendor_count: vendorCount === 0 ? 4 : vendorCount 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
