import { dbAll } from '@/lib/db';
import { Invoice, Vendor } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch stats directly in Server Component
  const stats = {
    total: dbAll<{count: number}>('SELECT COUNT(*) as count FROM invoices')[0]?.count || 0,
    approved: dbAll<{count: number}>("SELECT COUNT(*) as count FROM invoices WHERE status = 'approved'")[0]?.count || 0,
    flagged: dbAll<{count: number}>("SELECT COUNT(*) as count FROM invoices WHERE status = 'flagged'")[0]?.count || 0,
    rejected: dbAll<{count: number}>("SELECT COUNT(*) as count FROM invoices WHERE status = 'rejected'")[0]?.count || 0,
  };
  
  const autoApprovalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  // Fetch recent invoices
  const recentInvoices = dbAll<Invoice & { vendor_name: string }>(`
    SELECT i.*, v.name as vendor_name 
    FROM invoices i 
    LEFT JOIN vendors v ON i.vendor_id = v.id 
    ORDER BY i.submitted_at DESC 
    LIMIT 10
  `);

  // Fetch vendors for risk overview
  const vendors = dbAll<Vendor>('SELECT * FROM vendors ORDER BY risk_score DESC LIMIT 5');

  // Fetch memory logs
  const memoryLogs = dbAll<any>(`
    SELECT m.*, v.name as vendor_name 
    FROM memory_logs m 
    LEFT JOIN vendors v ON m.vendor_id = v.id 
    ORDER BY m.created_at DESC 
    LIMIT 5
  `);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-[var(--text-secondary)] mt-1">Overview of your AP operations and AI agent performance.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', value: stats.total },
          { label: 'Approved', value: stats.approved, color: 'text-[var(--accent-green)]' },
          { label: 'Flagged', value: stats.flagged, color: 'text-[var(--accent-yellow)]' },
          { label: 'Rejected', value: stats.rejected, color: 'text-[var(--accent-red)]' },
          { label: 'Auto-Approval Rate', value: `${autoApprovalRate}%`, color: 'text-[var(--accent-purple)]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold font-mono ${stat.color || ''}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Recent Invoices */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Recent Invoices</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
                <tr>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">Invoice #</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="p-4 font-medium">{inv.vendor_name || 'Unknown'}</td>
                    <td className="p-4 text-sm font-mono text-[var(--text-secondary)]">{inv.invoice_number || 'N/A'}</td>
                    <td className="p-4 font-mono">₹{inv.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                        ${inv.status === 'approved' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                          inv.status === 'flagged' ? 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]' :
                          inv.status === 'rejected' ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]' :
                          'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'}
                      `}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/invoices/${inv.id}`} className="text-sm text-[var(--accent-blue)] hover:underline">
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No invoices processed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Vendor Risk */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Vendor Risk Overview</h2>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
              {vendors.map(vendor => (
                <div key={vendor.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate max-w-[150px]">{vendor.name}</span>
                    <span className="text-[var(--text-muted)]">Risk: {(vendor.risk_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${vendor.risk_score > 0.3 ? 'bg-[var(--accent-red)]' : vendor.risk_score > 0.1 ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--accent-green)]'}`} 
                      style={{ width: `${Math.max(5, vendor.risk_score * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>🧠</span> Memory Activity
            </h2>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
              {memoryLogs.map(log => (
                <div key={log.id} className="text-sm border-l-2 border-[var(--accent-purple)] pl-3 py-1">
                  <div className="text-[var(--text-secondary)] text-xs mb-1">
                    {new Date(log.created_at).toLocaleDateString()} • {log.vendor_name}
                  </div>
                  <div className="line-clamp-2 text-[var(--text-primary)] leading-relaxed">
                    {log.content}
                  </div>
                </div>
              ))}
              {memoryLogs.length === 0 && (
                <div className="text-sm text-[var(--text-muted)] text-center py-4">No memory written yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
