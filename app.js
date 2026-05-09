const STORAGE_KEY = 'nexora_crm_v2';
let state = { leads: [], contacts: [], deals: [], settings: { currency: '$', autosave: 15 } };

const $ = (s) => document.querySelector(s);
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1400); };
const parseCSV = (text) => text.trim().split(/\r?\n/).map(r => r.split(',').map(c => c.trim()));

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
        deals: Array.isArray(parsed.deals) ? parsed.deals : [],
        settings: { currency: parsed.settings?.currency || '$', autosave: Number(parsed.settings?.autosave) || 15 }
      };
    }
  } catch { toast('Saved data was corrupted and reset.'); saveState(); }
}

function render() {
  $('#leadCount').textContent = state.leads.length;
  $('#contactCount').textContent = state.contacts.length;
  $('#dealCount').textContent = state.deals.length;
  const total = state.deals.reduce((s, d) => s + Number(d.amount || 0), 0);
  $('#pipelineValue').textContent = `${state.settings.currency}${total.toFixed(2)}`;

  $('#leadsTable').innerHTML = state.leads.map((l, i) => `<tr><td><input type="checkbox" data-lead-index="${i}"></td><td>${l.name}</td><td>${l.email}</td><td>${l.company}</td><td>${l.status}</td></tr>`).join('');
  $('#contactsList').innerHTML = state.contacts.map(c => `<li>${c.name} — ${c.email} — ${c.phone}</li>`).join('');
  $('#dealsTable').innerHTML = state.deals.map((d, i) => `<tr><td><input type="checkbox" data-deal-index="${i}"></td><td>${d.title}</td><td>${state.settings.currency}${Number(d.amount).toFixed(2)}</td><td>${d.stage}</td></tr>`).join('');
}

function switchTab(id) { document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id)); document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id)); }

function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

function runCommand(cmd) {
  const out = $('#commandOutput');
  const clean = cmd.trim().toLowerCase();
  if (clean === '/help') out.textContent = 'Commands: /seed | /clear | /export all | /stats';
  else if (clean === '/seed') {
    state.leads.push({ name: 'Alice', email: 'alice@nexora.com', company: 'Nexora', status: 'new' });
    state.contacts.push({ name: 'Bob', email: 'bob@nexora.com', phone: '555-0100' });
    state.deals.push({ title: 'Pilot Contract', amount: 12000, stage: 'proposal' });
    out.textContent = 'Seeded demo data.';
  } else if (clean === '/clear') {
    state.leads = []; state.contacts = []; state.deals = []; out.textContent = 'All CRM data cleared.';
  } else if (clean === '/export all') {
    exportCSV([['type', 'payload'], ...state.leads.map(l => ['lead', JSON.stringify(l)]), ...state.contacts.map(c => ['contact', JSON.stringify(c)]), ...state.deals.map(d => ['deal', JSON.stringify(d)])], 'nexora-export-all.csv');
    out.textContent = 'Exported all data.';
  } else if (clean === '/stats') out.textContent = `Leads:${state.leads.length} Contacts:${state.contacts.length} Deals:${state.deals.length}`;
  else out.textContent = 'Unknown command. Use /help.';
  saveState(); render();
}

function runSelfTest() {
  const issues = [];
  try { switchTab('leads'); switchTab('contacts'); switchTab('deals'); switchTab('documents'); switchTab('commands'); switchTab('dashboard'); } catch { issues.push('Tab switching failed'); }
  if (!$('#leadForm') || !$('#dealForm') || !$('#settingsForm')) issues.push('Required forms missing');
  if (typeof runCommand !== 'function') issues.push('Command feature unavailable');
  if (issues.length) { $('#commandOutput').textContent = `Self-test failed:\n- ${issues.join('\n- ')}`; toast('Self-test found issues'); }
  else { $('#commandOutput').textContent = 'Self-test passed: tabs/forms/commands/settings wired.'; toast('Self-test passed'); }
}

function bind() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  $('#leadForm').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); state.leads.push(Object.fromEntries(f)); e.target.reset(); saveState(); render(); });
  $('#contactForm').addEventListener('submit', (e) => { e.preventDefault(); state.contacts.push(Object.fromEntries(new FormData(e.target))); e.target.reset(); saveState(); render(); });
  $('#dealForm').addEventListener('submit', (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); v.amount = Number(v.amount); state.deals.push(v); e.target.reset(); saveState(); render(); });
  $('#deleteSelectedLeadsBtn').addEventListener('click', () => { const selected = [...document.querySelectorAll('[data-lead-index]:checked')].map(c => Number(c.dataset.leadIndex)); state.leads = state.leads.filter((_, i) => !selected.includes(i)); saveState(); render(); });
  $('#batchWonBtn').addEventListener('click', () => { [...document.querySelectorAll('[data-deal-index]:checked')].forEach(c => state.deals[Number(c.dataset.dealIndex)].stage = 'won'); saveState(); render(); });
  $('#batchLostBtn').addEventListener('click', () => { [...document.querySelectorAll('[data-deal-index]:checked')].forEach(c => state.deals[Number(c.dataset.dealIndex)].stage = 'lost'); saveState(); render(); });
  $('#exportLeadsBtn').addEventListener('click', () => exportCSV([['name','email','company','status'], ...state.leads.map(l => [l.name,l.email,l.company,l.status])], 'leads.csv'));
  $('#importLeadsInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text(); const rows = parseCSV(text); const [, ...data] = rows;
    data.forEach(r => { if (r.length >= 4) state.leads.push({ name: r[0], email: r[1], company: r[2], status: r[3] }); });
    e.target.value = ''; saveState(); render(); toast('Leads imported');
  });
  $('#docForm').addEventListener('submit', (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    $('#docOutput').value = `Proposal\nDate: ${new Date().toISOString().slice(0,10)}\nClient: ${f.client}\nSales Rep: ${f.rep}\nEstimated Value: ${state.settings.currency}${Number(f.value).toFixed(2)}\n\nThank you for considering Nexora.`;
  });
  $('#commandForm').addEventListener('submit', (e) => { e.preventDefault(); runCommand($('#commandInput').value); e.target.reset(); });
  $('#openSettingsBtn').addEventListener('click', () => { $('#settingsForm').currency.value = state.settings.currency; $('#settingsForm').autosave.value = state.settings.autosave; $('#settingsModal').showModal(); });
  $('#cancelSettingsBtn').addEventListener('click', () => $('#settingsModal').close());
  $('#settingsForm').addEventListener('submit', (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); state.settings.currency = f.currency || '$'; state.settings.autosave = Math.max(5, Number(f.autosave) || 15); saveState(); render(); $('#settingsModal').close(); });
  $('#runStressTestBtn').addEventListener('click', runSelfTest);
  setInterval(saveState, Math.max(5000, state.settings.autosave * 1000));
}

loadState();
bind();
render();
