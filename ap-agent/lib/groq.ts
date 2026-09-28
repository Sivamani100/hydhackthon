// lib/groq.ts
import Groq from 'groq-sdk';
import { Discrepancy, MemoryEntry, AgentDecisionResult } from './types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'mixtral-8x7b-32768';

export interface DecisionPromptParams {
  vendorName: string;
  vendorKnownPatterns: string[];
  vendorRiskScore: number;
  invoiceNumber: string;
  invoiceAmount: number;
  poNumber: string | null;
  poAmount: number | null;
  poExists: boolean;
  goodsReceiptExists: boolean;
  goodsReceiptPartial: boolean;
  discrepancies: Discrepancy[];
  memoryContext: MemoryEntry[];
  pastDecisionCount: number;
}

export async function getAgentDecision(params: DecisionPromptParams): Promise<AgentDecisionResult> {
  const {
    vendorName, vendorKnownPatterns, vendorRiskScore,
    invoiceNumber, invoiceAmount, poNumber, poAmount,
    poExists, goodsReceiptExists, goodsReceiptPartial,
    discrepancies, memoryContext, pastDecisionCount
  } = params;

  const memorySection = memoryContext.length > 0
    ? `PAST INTERACTIONS WITH THIS VENDOR (from Hindsight memory):\n${memoryContext.map((m, i) => `[${i + 1}] ${m.content}`).join('\n\n')}`
    : `NO PAST MEMORY: This is the first time processing an invoice from this vendor, or no relevant memory was found.`;

  const discrepancySection = discrepancies.length > 0
    ? `DISCREPANCIES FOUND:\n${discrepancies.map(d => `- TYPE: ${d.type} | SEVERITY: ${d.severity}\n  DETAIL: ${d.description}${d.difference ? ` | DIFFERENCE: INR ${d.difference}` : ''}`).join('\n')}`
    : 'NO DISCREPANCIES FOUND: Invoice matches PO exactly.';

  const knownPatternsSection = vendorKnownPatterns.length > 0
    ? `KNOWN VENDOR PATTERNS (from database):\n${vendorKnownPatterns.map(p => `- ${p}`).join('\n')}`
    : 'No pre-loaded patterns for this vendor.';

  const systemPrompt = `You are an intelligent Accounts Payable agent for a mid-sized Indian company. Your job is to review invoices and make one of three decisions: APPROVE, FLAG, or REJECT.

Your decisions are informed by:
1. A 3-way match between invoice, purchase order, and goods receipt
2. Known vendor patterns from past interactions
3. Hindsight memory of past invoices from this vendor

DECISION RULES:
- APPROVE: Invoice matches PO, goods receipt exists, no discrepancies OR discrepancies that memory confirms are normal for this vendor
- FLAG: Discrepancies exist but are uncertain — could be vendor pattern or could be error. Needs human review.
- REJECT: Clear fraud signals (duplicate invoice, PO doesn't exist, amount far exceeds PO with no explanation, no goods receipt for high-value invoice)

CONFIDENCE GUIDELINES:
- 0.9-1.0: Very sure (memory confirms the pattern multiple times)
- 0.7-0.89: Fairly confident
- 0.5-0.69: Uncertain, leaning one way
- Below 0.5: Do not approve — flag or reject instead

CRITICAL: If memory shows this vendor consistently has a certain discrepancy (like adding freight charges) and it was confirmed correct before, that INCREASES your confidence to approve. This is the learning behavior.

RESPONSE FORMAT: You must respond with ONLY a valid JSON object. No markdown, no explanation outside the JSON.

{
  "decision": "approve" | "flag" | "reject",
  "confidence": 0.0-1.0,
  "reasoning": "Clear, specific explanation of why you made this decision. Reference memory if you used it. Be specific about which discrepancies you accepted or rejected and why.",
  "flags": ["any specific concerns for human reviewer"]
}`;

  const userPrompt = `Review this invoice and make an AP decision.

VENDOR: ${vendorName}
VENDOR RISK SCORE: ${vendorRiskScore}/1.0 (higher = riskier)
TOTAL PAST INVOICES PROCESSED: ${pastDecisionCount}
${knownPatternsSection}

INVOICE DETAILS:
- Invoice Number: ${invoiceNumber || 'Not found on invoice'}
- Invoice Amount: INR ${invoiceAmount}
- Referenced PO Number: ${poNumber || 'NOT MENTIONED ON INVOICE'}

PO VERIFICATION:
- PO Found in System: ${poExists ? 'YES' : 'NO — PO NOT FOUND'}
- PO Amount: ${poAmount ? `INR ${poAmount}` : 'N/A'}
- Goods Receipt: ${goodsReceiptExists ? (goodsReceiptPartial ? 'PARTIAL DELIVERY' : 'CONFIRMED') : 'NOT FOUND'}

${discrepancySection}

${memorySection}

Based on all the above, what is your decision? Remember: if memory shows this pattern was previously confirmed as normal, use that to increase your confidence.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content || '';
    
    // Strip markdown if model wraps it
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, extract decision conservatively
      console.error('[Groq] Failed to parse response:', raw);
      return {
        decision: 'flag',
        confidence: 0.5,
        reasoning: `Agent response could not be parsed. Raw: ${raw.substring(0, 200)}. Flagged for human review.`,
        discrepancies,
        memory_used: memoryContext,
      };
    }

    return {
      decision: parsed.decision || 'flag',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided.',
      discrepancies,
      memory_used: memoryContext,
    };
  } catch (err: any) {
    console.error('[Groq] API error:', err);
    return {
      decision: 'flag',
      confidence: 0.0,
      reasoning: `LLM call failed: ${err.message}. Auto-flagged for human review.`,
      discrepancies,
      memory_used: [],
    };
  }
}
