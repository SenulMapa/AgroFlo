# AgroFlo — Fertilizer Distribution Management System

A web-based fertilizer logistics management system built for the **State Fertilizer Corporation (SFC)** of Sri Lanka. Streams the end-to-end flow of fertilizer requests — from station-level submission through multi-level approval, invoicing, stock management, and final delivery tracking.

> **Status:** MVP complete. Spec lives in [`PRD.md`](./PRD.md); full technical documentation in [`FERTILIZER_MANAGEMENT_SYSTEM.md`](./FERTILIZER_MANAGEMENT_SYSTEM.md).

---

## What it does

A request enters the system, gets approved through the right chain of roles, turns into an invoice, books stock out of the warehouse, gets assigned to a driver, and the receiver tracks the delivery. Every step is audited.

The six roles and what they can do:

| Role | Responsibility |
|---|---|
| **Admin Staff** | Create and route fertilizer requests from station data |
| **Admin Manager** | Approve or reject requests; oversee the workflow |
| **Finance** | Raise and release invoices, track payments |
| **Warehouse Officer** | Book stock, manage prep, assign drivers |
| **Inventory Manager** | Monitor stock levels and threshold alerts |
| **Receiver** | External party tracking their order delivery |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React 19 + TypeScript + Vite SPA          │
│  shadcn/ui · Tailwind · Radix · Recharts    │
│  React Hook Form · Zod · React Router 7    │
└────────────────┬────────────────────────────┘
                 │ Supabase client (RLS-enforced)
                 ▼
┌─────────────────────────────────────────────┐
│  Supabase (Postgres)                        │
│  schema.sql · schema_v2.sql · ims_tables    │
│  views · RLS policies (per role)            │
│  Audit log triggers                         │
└─────────────────────────────────────────────┘
```

- **Frontend:** React 19, TypeScript, Vite, shadcn/ui (Radix primitives), Tailwind, Recharts, React Hook Form + Zod validation, Sonner toasts, command-palette (`cmdk`)
- **Backend:** Supabase Postgres with **row-level security policies** scoped per role, schema split across `part1_tables.sql` / `part2_views.sql` / `ims_tables.sql` for staged rollouts
- **Seed scripts:** Python (`seed_supabase.py`) + SQL for driver assignments and workflow fixtures
- **Diagrams:** [`docs/architecture-diagram.png`](./docs/architecture-diagram.png), [`docs/use-case-diagram.png`](./docs/use-case-diagram.png)

---

## What I learned shipping this

The hard problem wasn't the CRUD — it was the **role separation enforced at the database**. Six different user types, eleven different permissions, and the only safe way to do it is RLS policies in Postgres, not frontend conditionals. The schema split into `part1_tables.sql` / `part2_views.sql` exists because rolling out a system like this to a real government department means staged migrations — you can't ship the whole schema in one PR.

The other piece worth calling out: **the audit log**. Every approval, rejection, invoice release, stock booking, and driver assignment is logged with actor + timestamp + before/after. That's the feature the client cared about most, because it's the one that lets them answer *"who approved this, when?"* — which is the actual question government fertilizer audits ask.

---

## Running it

```bash
# 1. Install
npm install

# 2. Configure Supabase
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Apply schema (in order)
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/schema_v2.sql
psql "$DATABASE_URL" -f database/migrations/ims_tables.sql
psql "$DATABASE_URL" -f database/add_rls_policies.sql

# 4. Seed (optional)
python scripts/seed_supabase.py
psql "$DATABASE_URL" -f scripts/seed_assigned_drivers.sql

# 5. Dev
npm run dev
```

---

## Repo layout

```
agroflo/
├── src/
│   ├── components/         # ui/, login/, dashboards/, shared/
│   ├── lib/                # db/, supabase client, utils
│   ├── store/              # state
│   ├── hooks/              # data hooks
│   ├── types/              # TypeScript domain types
│   └── data/               # static fixtures
├── database/
│   ├── schema.sql          # core tables
│   ├── schema_v2.sql       # additive schema
│   ├── part2_views.sql     # reporting views
│   └── add_rls_policies.sql
├── migrations/
│   └── ims_tables.sql      # inventory management subsystem
├── scripts/
│   ├── seed_supabase.py
│   ├── seed_workflow_tables.py
│   └── seed_assigned_drivers.sql
├── docs/                   # architecture + use-case diagrams
├── PRD.md
└── FERTILIZER_MANAGEMENT_SYSTEM.md
```

---

## License

Private / client work. Not licensed for redistribution.