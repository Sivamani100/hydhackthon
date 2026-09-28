import { dbGet, dbAll } from '@/lib/db';
import { Vendor, Invoice } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const vendor = dbGet<Vendor>('SELECT * FROM vendors WHERE id = ?', [params.id]);
  
  if (!vendor) return notFound();

  const invoices = dbAll<Invoice>('SELECT * FROM invoices WHERE vendor_id = ? ORDER BY submitted_at DESC', [params.id]);
  const memoryLogs = dbAll<any>('SELECT * FROM memory_logs WHERE vendor_id = ? ORDER BY created_at DESC', [params.id]);
  const knownPatterns = JSON.parse(vendor.known_patterns || '[]');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-white text-sm mb-4 inline-block">← Back to Dashboard</Link>
        <h1 className="text-3xl font-bold">{vendor.name}</h1>
        <p className="text-[var(--text-secondary)] mt-1">{vendor.email} • Terms: {vendor.payment_terms}</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: vendor.total_invoices },
          { label: 'Approved', value: vendor.total_approved, color: 'text-[var(--accent-green)]' },
          { label: 'Flagged', value: vendor.total_flagged, color: 'text-[var(--accent-yellow)]' },
          { label: 'Risk Score', value: `${(vendor.risk_score * 100).toFixed(0)}%`, color: vendor.risk_score > 0.3 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold font-mono ${stat.color || ''}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Invoice History</h2>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
                  <tr>
                    <th className="p-3 font-medium">Inv #</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="p-3 text-sm font-mono text-[var(--text-secondary)]">
                        <Link href={`/invoices/${inv.id}`} className="hover:text-[var(--accent-blue)]">
                          {inv.invoice_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="p-3 font-mono text-sm">₹{inv.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                          ${inv.status === 'approved' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                            inv.status === 'flagged' ? 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]' :
                            inv.status === 'rejected' ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]' :
                            'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'}
                        `}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-[var(--text-muted)] text-sm">No invoices found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {knownPatterns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Known Patterns</h2>
              <ul className="space-y-2">
                {knownPatterns.map((pattern: string, i: number) => (
                  <li key={i} className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg text-sm text-[var(--text-secondary)]">
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>🧠</span> Memory Timeline
            </h2>
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
              {memoryLogs.map(log => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--accent-purple)] bg-[var(--bg-card)] text-[var(--accent-purple)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-xs">
                    🧠
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-xl shadow">
                    <div className="text-xs text-[var(--text-muted)] mb-2">
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {log.content}
                    </div>
                  </div>
                </div>
              ))}
              {memoryLogs.length === 0 && (
                <div className="text-sm text-[var(--text-muted)] text-center py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl relative z-10">
                  No memories recorded for this vendor yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
