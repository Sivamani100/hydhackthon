// lib/schema.ts
// All table definitions as CREATE TABLE IF NOT EXISTS statements
// Run these in order on first boot

export const SCHEMA_SQL = `
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;

  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    payment_terms TEXT NOT NULL DEFAULT 'net30',
    address TEXT,
    tax_id TEXT,
    total_invoices INTEGER DEFAULT 0,
    total_approved INTEGER DEFAULT 0,
    total_flagged INTEGER DEFAULT 0,
    total_rejected INTEGER DEFAULT 0,
    known_patterns TEXT DEFAULT '[]',
    risk_score REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    po_number TEXT NOT NULL UNIQUE,
    vendor_id TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'open',
    issued_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
  );

  CREATE TABLE IF NOT EXISTS goods_receipts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    po_id TEXT NOT NULL,
    received_by TEXT,
    received_at TEXT DEFAULT (datetime('now')),
    quantity_received REAL,
    notes TEXT,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    vendor_id TEXT,
    po_number TEXT,
    invoice_number TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    line_items TEXT DEFAULT '[]',
    raw_text TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,
    due_date TEXT,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    invoice_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    confidence REAL DEFAULT 0.0,
    reasoning TEXT NOT NULL,
    memory_context TEXT DEFAULT '[]',
    discrepancies TEXT DEFAULT '[]',
    was_overridden INTEGER DEFAULT 0,
    override_by TEXT,
    override_reason TEXT,
    override_decision TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );

  CREATE TABLE IF NOT EXISTS memory_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    vendor_id TEXT,
    invoice_id TEXT,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    hindsight_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

// SEED DATA — run only if vendors table is empty
export const SEED_SQL = `
  -- Vendor 1: TechSupplies India — always adds freight, otherwise reliable
  INSERT OR IGNORE INTO vendors (id, name, email, payment_terms, known_patterns, risk_score)
  VALUES (
    'vendor_tech_001',
    'TechSupplies India Pvt Ltd',
    'billing@techsupplies.in',
    'net30',
    '["Adds INR 450-600 freight charges not in PO","Occasional 2-3 day invoice delay","Never sends duplicate invoices"]',
    0.1
  );

  -- Vendor 2: CloudNine Services — sends duplicate invoices occasionally
  INSERT OR IGNORE INTO vendors (id, name, email, payment_terms, known_patterns, risk_score)
  VALUES (
    'vendor_cloud_002',
    'CloudNine Services LLP',
    'accounts@cloudnine.io',
    'net45',
    '["Sent duplicate invoice twice in past 6 months","Line item descriptions often vague","Payment terms inconsistently stated"]',
    0.45
  );

  -- Vendor 3: Rapid Logistics Co — high volume, mostly clean
  INSERT OR IGNORE INTO vendors (id, name, email, payment_terms, known_patterns, risk_score)
  VALUES (
    'vendor_rapid_003',
    'Rapid Logistics Co',
    'finance@rapidlogistics.co.in',
    'net15',
    '["High volume vendor, 3-5 invoices monthly","Sometimes disputes resolved via credit note","GST number occasionally missing"]',
    0.2
  );

  -- Vendor 4: Infra Partners — new vendor, no history
  INSERT OR IGNORE INTO vendors (id, name, email, payment_terms, known_patterns, risk_score)
  VALUES (
    'vendor_infra_004',
    'Infra Partners India',
    'billing@infrapartners.in',
    'net60',
    '[]',
    0.0
  );

  -- Purchase Orders
  INSERT OR IGNORE INTO purchase_orders (id, po_number, vendor_id, department, description, amount, status)
  VALUES
    ('po_001', 'PO-2025-001', 'vendor_tech_001', 'Engineering', 'Laptop components and peripherals', 45000.00, 'open'),
    ('po_002', 'PO-2025-002', 'vendor_tech_001', 'Engineering', 'Network switches and cables', 28000.00, 'open'),
    ('po_003', 'PO-2025-003', 'vendor_cloud_002', 'IT', 'Cloud infrastructure monthly — July', 62000.00, 'open'),
    ('po_004', 'PO-2025-004', 'vendor_rapid_003', 'Operations', 'Courier and logistics — Q3', 18500.00, 'open'),
    ('po_005', 'PO-2025-005', 'vendor_rapid_003', 'Operations', 'Last mile delivery batch #7', 9200.00, 'open'),
    ('po_006', 'PO-2025-006', 'vendor_infra_004', 'Facilities', 'Office renovation — Phase 1', 185000.00, 'open');

  -- Goods Receipts (confirming delivery)
  INSERT OR IGNORE INTO goods_receipts (id, po_id, received_by, quantity_received, notes)
  VALUES
    ('gr_001', 'po_001', 'Ravi Kumar', 1.0, 'All items received in good condition'),
    ('gr_002', 'po_002', 'Ravi Kumar', 1.0, 'Partial delivery — 2 switches pending'),
    ('gr_003', 'po_003', 'Ananya Sharma', 1.0, 'Cloud services provisioned and active'),
    ('gr_004', 'po_004', 'Mohan Rao', 1.0, 'Delivery confirmed by operations team'),
    ('gr_005', 'po_005', 'Mohan Rao', 0.8, 'Partial — 2 deliveries still in transit');
`;
