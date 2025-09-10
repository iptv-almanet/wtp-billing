import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import db from './db.js';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// DB helpers
import dbPkg from './db.js';
const stmtInsertCustomer = db.prepare(`INSERT INTO customers(name, whatsapp, address) VALUES(?,?,?)`);
const stmtListCustomers = db.prepare(`SELECT * FROM customers ORDER BY id DESC`);
const stmtInsertBill = db.prepare(`INSERT INTO bills(customer_id, period, usage_m3, tariff_per_m3, admin_fee, total_amount) VALUES(?,?,?,?,?,?)`);
const stmtListBills = db.prepare(`SELECT b.*, c.name, c.whatsapp FROM bills b JOIN customers c ON c.id=b.customer_id ORDER BY b.id DESC`);
const stmtGetBill = db.prepare(`SELECT b.*, c.name, c.address, c.whatsapp FROM bills b JOIN customers c ON c.id=b.customer_id WHERE b.id=?`);
const stmtUpdateBillStatus = db.prepare(`UPDATE bills SET status=? WHERE id=?`);

// Routes
app.get('/api/customers', (req, res) => {
  res.json(stmtListCustomers.all());
});

app.post('/api/customers', (req, res) => {
  const { name, whatsapp, address } = req.body;
  if (!name || !whatsapp) return res.status(400).json({ error: 'name & whatsapp wajib' });
  const info = stmtInsertCustomer.run(name, whatsapp, address || '');
  res.json({ id: info.lastInsertRowid });
});

app.get('/api/bills', (req, res) => {
  res.json(stmtListBills.all());
});

app.post('/api/bills', (req, res) => {
  const { customer_id, period, usage_m3, tariff_per_m3, admin_fee } = req.body;
  if (!customer_id || !period || usage_m3 == null || !tariff_per_m3) {
    return res.status(400).json({ error: 'field wajib' });
  }
  const total = Math.round(Number(usage_m3) * Number(tariff_per_m3)) + Number(admin_fee || 0);
  const info = stmtInsertBill.run(customer_id, period, usage_m3, tariff_per_m3, admin_fee || 0, total);
  res.json({ id: info.lastInsertRowid, total_amount: total });
});

app.get('/api/bills/:id', (req, res) => {
  const bill = stmtGetBill.get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Tagihan tidak ditemukan' });
  res.json(bill);
});

app.post('/api/bills/:id/mark-paid', (req, res) => {
  const bill = stmtGetBill.get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Tagihan tidak ditemukan' });
  stmtUpdateBillStatus.run('PAID', bill.id);
  res.json({ ok: true });
});

// Send WA
async function sendWhatsAppText({ to, text }) {
  const url = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

app.post('/api/bills/:id/send-wa', async (req, res) => {
  try {
    const bill = stmtGetBill.get(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Tagihan tidak ditemukan' });

    const payLink = `${BASE_URL}/invoice/${bill.id}`;
    const message = [
      `Halo ${bill.name},`,
      `Tagihan Air WTP periode ${bill.period}.`,
      `Pemakaian: ${bill.usage_m3} m3 x Rp${bill.tariff_per_m3}/m3`,
      bill.admin_fee ? `Biaya admin: Rp${bill.admin_fee}` : null,
      `Total: Rp${bill.total_amount}`,
      `Detail & bayar: ${payLink}`
    ].filter(Boolean).join('\n');

    const result = await sendWhatsAppText({ to: bill.whatsapp, text: message });
    if (bill.status === 'UNPAID') stmtUpdateBillStatus.run('SENT', bill.id);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/invoice/:id', (req, res) => {
  const bill = stmtGetBill.get(req.params.id);
  if (!bill) return res.status(404).send('Tagihan tidak ditemukan');
  res.send(`<html><body><h2>Invoice #${bill.id}</h2><p>Total: Rp${bill.total_amount}</p></body></html>`);
});

app.listen(PORT, () => console.log(`WTP Billing berjalan di ${PORT}`));