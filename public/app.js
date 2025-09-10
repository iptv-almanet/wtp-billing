async function api(path, opts) {
  const r = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.status);
  }
  return r.json();
}

async function loadCustomers() {
  const customers = await api('/api/customers');
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  const select = document.querySelector('#billForm select[name=customer_id]');
  select.innerHTML = '<option value="">Pilih pelanggan</option>';
  customers.forEach(c => {
    tbody.innerHTML += `<tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.whatsapp}</td>
      <td>${c.address || ''}</td>
      <td>
        <button onclick="startEditCustomer(${c.id})">Edit</button>
        <button onclick="deleteCustomer(${c.id})">Hapus</button>
      </td>
    </tr>`;
    select.innerHTML += `<option value="${c.id}">${c.name} (${c.whatsapp})</option>`;
  });
}

async function loadBills() {
  const bills = await api('/api/bills');
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
        <a href="/invoice/${b.id}" target="_blank">Invoice</a>
        <button onclick="sendWA(${b.id})">Kirim WA</button>
      </td>
    </tr>`;
  });
}

document.getElementById('customerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.id) {
    // update
    await api(`/api/customers/${data.id}`, { method: 'PUT', body: JSON.stringify({ name: data.name, whatsapp: data.whatsapp, address: data.address }) });
    form.reset();
    document.getElementById('customerSubmit').textContent = 'Tambah Pelanggan';
    document.getElementById('customerCancel').style.display = 'none';
  } else {
    await api('/api/customers', { method: 'POST', body: JSON.stringify({ name: data.name, whatsapp: data.whatsapp, address: data.address }) });
    form.reset();
  }
  await loadCustomers();
});

document.getElementById('customerCancel').addEventListener('click', () => {
  const form = document.getElementById('customerForm');
  form.reset();
  form.querySelector('input[name=id]').value = '';
  document.getElementById('customerSubmit').textContent = 'Tambah Pelanggan';
  document.getElementById('customerCancel').style.display = 'none';
});

async function startEditCustomer(id) {
  const c = await api(`/api/customers`);
  const found = c.find(x => x.id === id);
  if (!found) return alert('Pelanggan tidak ditemukan');
  const form = document.getElementById('customerForm');
  form.querySelector('input[name=id]').value = found.id;
  form.querySelector('input[name=name]').value = found.name;
  form.querySelector('input[name=whatsapp]').value = found.whatsapp;
  form.querySelector('input[name=address]').value = found.address || '';
  document.getElementById('customerSubmit').textContent = 'Update Pelanggan';
  document.getElementById('customerCancel').style.display = 'inline-block';
}

async function deleteCustomer(id) {
  if (!confirm('Hapus pelanggan ini?')) return;
  await api(`/api/customers/${id}`, { method: 'DELETE' });
  await loadCustomers();
  await loadBills();
}

document.getElementById('billForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.customer_id = Number(data.customer_id);
  data.usage_m3 = parseFloat(data.usage_m3);
  data.tariff_per_m3 = parseInt(data.tariff_per_m3);
  data.admin_fee = data.admin_fee ? parseInt(data.admin_fee) : 0;
  await api('/api/bills', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  await loadBills();
});

async function sendWA(id) {
  const r = await api(`/api/bills/${id}/send-wa`, { method: 'POST' });
  if (r.ok) {
    alert('Pesan WhatsApp terkirim!');
    await loadBills();
  } else {
    alert('Gagal: ' + (r.error || 'unknown'));
  }
}

loadCustomers();
loadBills();
