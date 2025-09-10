async function loadCustomers() {
  const res = await fetch('/api/customers');
  const customers = await res.json();
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  const select = document.querySelector('#billForm select[name=customer_id]');
  select.innerHTML = '';
  customers.forEach(c => {
    tbody.innerHTML += `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.whatsapp}</td><td>${c.address}</td></tr>`;
    select.innerHTML += `<option value="${c.id}">${c.name} (${c.whatsapp})</option>`;
  });
}

async function loadBills() {
  const res = await fetch('/api/bills');
  const bills = await res.json();
  const tbody = document.querySelector('#billsTable tbody');
  tbody.innerHTML = '';
  bills.forEach(b => {
    tbody.innerHTML += `<tr>
      <td>${b.id}</td>
      <td>${b.name}</td>
      <td>${b.period}</td>
      <td>Rp${b.total_amount}</td>
      <td>${b.status}</td>
      <td>
        <a href="/invoice/${b.id}" target="_blank">Invoice</a> |
        <button onclick="sendWA(${b.id})">Kirim WA</button>
      </td>
    </tr>`;
  });
}

document.getElementById('customerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());
  await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  e.target.reset();
  await loadCustomers();
});

document.getElementById('billForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());
  await fetch('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  e.target.reset();
  await loadBills();
});

async function sendWA(id) {
  const res = await fetch(`/api/bills/${id}/send-wa`, { method: 'POST' });
  const data = await res.json();
  if (data.ok) {
    alert('Pesan WhatsApp terkirim!');
    await loadBills();
  } else {
    alert('Gagal kirim WA: ' + data.error);
  }
}

loadCustomers();
loadBills();