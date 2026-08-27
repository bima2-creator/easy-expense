# Easy Expense — Product Requirements Document

## Original Problem Statement
Expense tracker with AI receipt smart scan for managing business expenses. Scan receipts → auto
extract → organize → report/export. Later expanded to an Indonesian project-based cost tracker.

## User Choices / Decisions
- AI model: OpenAI **gpt-5.4** (vision) via Emergent LLM key.
- Auth: **None** (single-user v1).
- Language: **Bahasa Indonesia** (entire UI).
- Currency: **Rupiah only**, no decimals (e.g. `Rp 25.000`). **Tax field removed**.
- Hierarchy: **Project → Work Order → Expense**; each Expense has a Category.
- Categories: one **global editable list** (add/rename/delete). Defaults: Makan, Minum, Entertain,
  Fuel, Toll, Office Supplies.
- Expense→Project/WorkOrder is **optional** (quick scan stays fast).
- PDF report export **per Project**.
- Receipt editor = **crop + rotate** (manual, works in Expo Go; no auto perspective yet).

## Architecture
- Frontend: Expo Router (SDK 54). Custom tab bar: Beranda, Pengeluaran, [Scan FAB], Laporan, Proyek.
  Fonts Space Grotesk (angka) + Plus Jakarta Sans (UI). Charts gifted-charts. Keyboard
  react-native-keyboard-controller. Receipt crop/rotate via expo-image-manipulator.
  Categories served through a `CategoriesProvider` context (icon/color lookup).
- Backend: FastAPI + MongoDB (motor), routes under `/api`. PDF via reportlab.
- Integrations: OpenAI gpt-5.4 (emergentintegrations) receipt extraction; Emergent Object Storage
  for receipt images. `EMERGENT_LLM_KEY` in backend/.env.

## Data Models
- Category: id, name, icon, color, is_default, created_at.
- Project: id, name, client, color, created_at (+ derived work_order_count/total/expense_count).
- WorkOrder: id, project_id, name, created_at (+ derived total/expense_count).
- Expense: id, vendor, amount, date, category, project_id, work_order_id, notes, receipt_path,
  is_billable, created_at, updated_at. (NO tax, NO currency.)

## Implemented
### 2026-08-26 (MVP)
- AI scan → extract → save, expense list, categories, reports summary, CSV export, receipt storage.
### 2026-08-26 (Indonesian restructure)
- Full Bahasa Indonesia UI; Rupiah no-decimals; tax removed everywhere.
- Project → Work Order → Expense hierarchy with cascade/detach semantics.
- Category management screen (add/rename/delete; rename propagates to expenses).
- Projects tab, Project detail (WO list, rename/delete, PDF export), Work Order detail
  (expenses, scan/manual add, rename/delete).
- Per-project PDF report (reportlab), per-project section in Reports.
- Receipt Editor (crop with draggable corners + 90° rotate) before AI extraction.
- Tested: 27/27 backend pytest passed; frontend flows verified.

## Backlog
### P1
- Mileage tracker (GPS) + deduction calc.
- Convert work-order/project reports into billable invoices (line items, invoice numbers).
- Offline-first caching + sync.
### P2
- Auto document detection / perspective-fix (needs native build).
- Team collaboration (invite members, approvals) — requires auth.
- Email export.

## Next Tasks
- Invoice generation from billable expenses.
- Mileage tracker.
- Auth + multi-device sync when team features begin.
