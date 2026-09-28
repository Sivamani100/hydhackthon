// lib/types.ts

export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  payment_terms: string;
  address: string | null;
  tax_id: string | null;
  total_invoices: number;
  total_approved: number;
  total_flagged: number;
  total_rejected: number;
  known_patterns: string; // JSON string of string[]
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  department: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface GoodsReceipt {
  id: string;
  po_id: string;
  received_by: string | null;
  received_at: string;
  quantity_received: number | null;
  notes: string | null;
}

export interface Invoice {
  id: string;
  vendor_id: string | null;
  po_number: string | null;
  invoice_number: string | null;
  amount: number;
  currency: string;
  line_items: string; // JSON string of LineItem[]
  raw_text: string | null;
  file_path: string | null;
  status: 'pending' | 'approved' | 'flagged' | 'rejected';
  submitted_at: string;
  processed_at: string | null;
  due_date: string | null;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Decision {
  id: string;
  invoice_id: string;
  decision: 'approve' | 'flag' | 'reject';
  confidence: number;
  reasoning: string;
  memory_context: string; // JSON string of MemoryEntry[]
  discrepancies: string; // JSON string of Discrepancy[]
  was_overridden: number;
  override_by: string | null;
  override_reason: string | null;
  override_decision: string | null;
  created_at: string;
}

export interface Discrepancy {
  type: 'amount_mismatch' | 'missing_po' | 'duplicate_invoice' | 'line_item_mismatch' | 'payment_terms_mismatch' | 'unknown_vendor';
  description: string;
  severity: 'low' | 'medium' | 'high';
  po_value?: number;
  invoice_value?: number;
  difference?: number;
}

export interface MemoryEntry {
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface ParsedInvoice {
  vendor_name?: string;
  po_number?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  line_items: LineItem[];
  due_date?: string;
  raw_text: string;
}

export interface ProcessInvoiceRequest {
  invoice_id: string;
}

export interface AgentDecisionResult {
  decision: 'approve' | 'flag' | 'reject';
  confidence: number;
  reasoning: string;
  discrepancies: Discrepancy[];
  memory_used: MemoryEntry[];
}
