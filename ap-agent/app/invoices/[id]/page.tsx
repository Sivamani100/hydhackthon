import { dbGet, dbAll } from '@/lib/db';
import { Invoice, Decision, Vendor, PurchaseOrder } from '@/lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = dbGet<Invoice>('SELECT * FROM invoices WHERE id = ?', [params.id]);
  
  if (!invoice) return notFound();

  const vendor = invoice.vendor_id ? dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [invoice.vendor_id]) : null;
  const decision = dbGet<Decision>('SELECT * FROM decisions WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1', [params.id]);
  const po = invoice.po_number ? dbGet<PurchaseOrder>('SELECT * FROM purchase_orders WHERE po_number = ?', [invoice.po_number]) : null;

  const discrepancies = decision?.discrepancies ? JSON.parse(decision.discrepancies) : [];
  const memoryUsed = decision?.memory_context ? JSON.parse(decision.memory_context) : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-white text-sm">← Back to Dashboard</Link>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-4">
            Invoice {invoice.invoice_number || 'Unknown'}
            {invoice.status === 'approved' && <span className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20 px-3 py-1 rounded-full text-sm font-semibold tracking-wide uppercase">Approved</span>}
            {invoice.status === 'flagged' && <span className="bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20 px-3 py-1 rounded-full text-sm font-semibold tracking-wide uppercase">Flagged</span>}
            {invoice.status === 'rejected' && <span className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 px-3 py-1 rounded-full text-sm font-semibold tracking-wide uppercase">Rejected</span>}
            {invoice.status === 'pending' && <span className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 px-3 py-1 rounded-full text-sm font-semibold tracking-wide uppercase">Pending</span>}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[var(--text-muted)] text-sm mb-1">Total Amount</div>
          <div className="text-3xl font-bold font-mono">₹{invoice.amount.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: AI Decision */}
        <div className="col-span-2 space-y-8">
          
          {decision && (
            <div className="bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-[var(--bg-elevated)] px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <span>🧠</span> Agent Decision Reasoning
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-muted)]">Confidence:</span>
                  <div className="w-32 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${decision.confidence > 0.8 ? 'bg-[var(--accent-green)]' : decision.confidence > 0.5 ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--accent-red)]'}`}
                      style={{ width: `${Math.round(decision.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-medium">{Math.round(decision.confidence * 100)}%</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {decision.reasoning}
                </p>

                {memoryUsed.length > 0 && (
                  <div className="mt-8 p-4 bg-[#2A2345]/30 border border-[#8B5CF6]/30 rounded-lg">
                    <h3 className="text-sm font-semibold text-[#8B5CF6] mb-3 uppercase tracking-wider flex items-center gap-2">
                      Retrieved Memories Applied
                    </h3>
                    <ul className="space-y-3">
                      {memoryUsed.map((m: any, i: number) => (
                        <li key={i} className="text-sm text-[var(--text-secondary)] border-l-2 border-[#8B5CF6] pl-3 py-1">
                          {m.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {discrepancies.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">System Discrepancies Found</h2>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <ul className="divide-y divide-[var(--border)]">
                  {discrepancies.map((d: any, i: number) => (
                    <li key={i} className="p-4 flex gap-4">
                      <div className="mt-1">
                        {d.severity === 'high' ? <span className="text-[var(--accent-red)]">⚠️</span> : 
                         d.severity === 'medium' ? <span className="text-[var(--accent-yellow)]">⚠️</span> : 
                         <span className="text-[var(--accent-blue)]">ℹ️</span>}
                      </div>
                      <div>
                        <div className="font-medium mb-1">{d.type.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{d.description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
            <h3 className="font-semibold border-b border-[var(--border)] pb-2">Invoice Details</h3>
            
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Vendor</div>
              <div className="font-medium text-[var(--accent-blue)] hover:underline">
                {vendor ? <Link href={`/vendors/${vendor.id}`}>{vendor.name}</Link> : 'Unknown'}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Date Submitted</div>
              <div className="font-medium text-sm text-[var(--text-secondary)]">{new Date(invoice.submitted_at).toLocaleString()}</div>
            </div>

            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Purchase Order</div>
              <div className="font-medium font-mono text-sm">{invoice.po_number || 'N/A'}</div>
              {po && (
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  PO Amount: ₹{po.amount.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Action Panel for Flagged Invoices */}
          {invoice.status === 'flagged' && decision && decision.was_overridden === 0 && (
            <div className="bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-[var(--accent-yellow)]">Human Review Required</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                The AI agent flagged this invoice due to uncertainties or risk. Your override decision will be stored in Hindsight memory for future reference.
              </p>
              
              <form action={`/api/invoices/${invoice.id}/override`} method="POST" className="space-y-3">
                <textarea 
                  name="override_reason"
                  placeholder="Explain why you are approving or rejecting..."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                  rows={3}
                  required
                />
                <div className="flex gap-3">
                  <button type="submit" name="override_decision" value="approve" className="flex-1 bg-[var(--accent-green)] text-black font-semibold py-2 rounded-lg hover:bg-green-500 transition-colors">
                    Approve
                  </button>
                  <button type="submit" name="override_decision" value="reject" className="flex-1 bg-[var(--accent-red)] text-white font-semibold py-2 rounded-lg hover:bg-red-500 transition-colors">
                    Reject
                  </button>
                </div>
              </form>
            </div>
          )}

          {decision && decision.was_overridden === 1 && (
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-semibold mb-2">Human Override applied</h3>
              <p className="text-sm">
                Overridden to: <span className="font-bold capitalize">{decision.override_decision}</span>
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                "{decision.override_reason}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
