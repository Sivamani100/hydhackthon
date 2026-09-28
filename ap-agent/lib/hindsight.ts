// lib/hindsight.ts
// Wraps Hindsight REST API calls cleanly
// Docs: https://hindsight.vectorize.io/

const HINDSIGHT_BASE_URL = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY!;

if (!HINDSIGHT_API_KEY) {
  console.warn('[Hindsight] No API key set. Memory calls will be skipped.');
}

export interface RememberParams {
  content: string;
  metadata?: Record<string, string | number | boolean>;
  tags?: string[];
}

export interface RecallParams {
  query: string;
  limit?: number;
  filters?: Record<string, string>;
}

export interface MemoryResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Store a memory in Hindsight
export async function remember(params: RememberParams): Promise<string | null> {
  if (!HINDSIGHT_API_KEY) return null;

  try {
    const res = await fetch(`${HINDSIGHT_BASE_URL}/v1/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
      },
      body: JSON.stringify({
        content: params.content,
        metadata: params.metadata || {},
        tags: params.tags || [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Hindsight] remember failed:', err);
      return null;
    }

    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.error('[Hindsight] remember error:', err);
    return null;
  }
}

// Recall memories relevant to a query
export async function recall(params: RecallParams): Promise<MemoryResult[]> {
  if (!HINDSIGHT_API_KEY) return [];

  try {
    const res = await fetch(`${HINDSIGHT_BASE_URL}/v1/memories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
      },
      body: JSON.stringify({
        query: params.query,
        limit: params.limit || 5,
        filters: params.filters || {},
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Hindsight] recall failed:', err);
      return [];
    }

    const data = await res.json();
    return data.results || data.memories || [];
  } catch (err) {
    console.error('[Hindsight] recall error:', err);
    return [];
  }
}

// Build a structured memory string for a decision outcome
// Call this AFTER a decision is made and confirmed
export function buildDecisionMemory(params: {
  vendorName: string;
  invoiceNumber: string;
  invoiceAmount: number;
  poAmount: number;
  discrepancies: Array<{ type: string; description: string; severity: string }>;
  decision: string;
  confidence: number;
  reasoning: string;
  wasOverridden: boolean;
  overrideReason?: string;
  finalDecision?: string;
}): string {
  const {
    vendorName, invoiceNumber, invoiceAmount, poAmount,
    discrepancies, decision, confidence, reasoning,
    wasOverridden, overrideReason, finalDecision
  } = params;

  const discrepancyStr = discrepancies.length > 0
    ? discrepancies.map(d => `- ${d.type} (${d.severity}): ${d.description}`).join('\n')
    : 'No discrepancies found.';

  const overrideStr = wasOverridden
    ? `\nHuman Override: YES\nOverride to: ${finalDecision}\nOverride reason: ${overrideReason}`
    : '\nHuman Override: NO — agent decision accepted.';

  return `
VENDOR: ${vendorName}
INVOICE: ${invoiceNumber}
INVOICE AMOUNT: INR ${invoiceAmount}
PO AMOUNT: INR ${poAmount}
DISCREPANCIES:
${discrepancyStr}
AGENT DECISION: ${decision.toUpperCase()} (confidence: ${Math.round(confidence * 100)}%)
AGENT REASONING: ${reasoning}
${overrideStr}
DATE: ${new Date().toISOString().split('T')[0]}
`.trim();
}
