// app/api/memory/recall/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recall } from '@/lib/hindsight';

export async function POST(req: NextRequest) {
  try {
    const { query, limit } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const memories = await recall({ query, limit: limit || 5 });
    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
