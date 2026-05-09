Nexora Sales OS CRM (Lightweight)

Run:
1) Open index.html directly in your browser, or
2) Serve with a static server (recommended):
   - Python: python3 -m http.server 8080
   - Open http://localhost:8080

Features:
- Tabs: Dashboard, Leads, Contacts, Deals, Documents, Commands
- Forms for leads/contacts/deals/doc generation
- CSV export/import for leads
- Batch actions for deals and leads
- Command palette (/help, /seed, /clear, /export all, /stats)
- Settings modal (currency + autosave interval)
- Built-in UI self-test button
- LocalStorage persistence

Notes:
- Data is saved in localStorage key: nexora_crm_v2
- No backend required
