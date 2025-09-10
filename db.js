import Database from 'better-sqlite3';

const db = new Database('wtp.db');
db.pragma('journal_mode = WAL');

const createTables = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address TEXT
);
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  period TEXT NOT NULL,
  usage_m3 REAL NOT NULL,
  tariff_per_m3 INTEGER NOT NULL,
  admin_fee INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'UNPAID',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);
`;
db.exec(createTables);

export default db;