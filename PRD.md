# AgriFlo — Fertilizer Distribution Management System

## Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** MVP Complete  
**Project Directory:** `Navithma/app2`

---

## 1. Overview

### 1.1 Purpose

AgriFlo is a web-based fertilizer logistics management system for the **State Fertilizer Corporation (SFC)**. It streamlines the end-to-end process of fertilizer request creation, approval, invoicing, stock management, and distribution tracking — from station-level request submission through to final delivery.

### 1.2 Scope

The system handles:
- Fertilizer request submission by Admin Staff
- Multi-level approval workflow (Admin Manager → Finance → Warehouse)
- Invoice generation and payment tracking
- Real-time stock management with threshold alerts
- Driver assignment and dispatch tracking
- Public order tracking via Receiver Portal
- Full audit logging of all system actions

### 1.3 Target Users

| Role | Description |
|------|-------------|
| **Admin Staff** | Creates fertilizer requests from station data |
| **Admin Manager** | Approves or rejects requests; oversees workflow |
| **Finance** | Raises invoices, manages payment status |
| **Warehouse Officer** | Books stock, manages prep and dispatch |
| **Inventory Manager** | Monitors stock levels and thresholds |
| **Receiver** | External party tracking order delivery status |

---

## 2. User Roles & Permissions

### 2.1 Role Matrix

| Feature | Admin Staff | Admin Manager | Finance | Warehouse | Inventory Manager | Receiver |
|---------|:-----------:|:-------------:|:-------:|:---------:|:-----------------:|:--------:|
| Create Request | ✅ | — | — | — | — | — |
| Edit Request | ✅ (own, new only) | — | — | — | — | — |
| Route Request | ✅ | — | — | — | — | — |
| Approve/Reject | — | ✅ | — | — | — | — |
| Generate Invoice | — | — | ✅ | — | — | — |
| Release Invoice | — | — | ✅ | — | — | — |
| Book Stock | — | — | — | ✅ | — | — |
| View Stock | — | ✅ | — | ✅ | ✅ | — |
| Assign Driver | — | — | — | ✅ | — | — |
| Track Delivery | — | ✅ | ✅ | ✅ | — | ✅ |
| View Audit Log | ✅ | ✅ | ✅ | ✅ | — | — |

### 2.2 User Authentication

All users log in with **Employee ID + Password**. Role is determined at login and the appropriate dashboard is loaded. No role-switching mid-session.

---

## 3. Feature Specifications

### 3.1 User Login (Req 1.1, 1.2, 1.3)

**Component:** `LoginScreen.tsx`

- Login form with Employee ID and Password fields
- Simulated auth against `mockData.ts` credentials
- Role-based routing loads the correct dashboard in `App.tsx`
- All access is logged in the audit trail
- Quick login demo buttons for each role

**Roles defined in `types/index.ts`:**
```typescript
type UserRole = 'admin_staff' | 'admin_manager' | 'finance' | 'warehouse' | 'receiver' | 'inventory_manager'
```

---

### 3.2 Fertilizer Request Creation (Req 2.1, 2.2, 2.3, 2.4)

**Component:** `AdminStaffDashboard.tsx`

**Create Request:**
- Modal form with fields: Station (dropdown), Fertilizer Type, Quantity (1–10,000 bags), Priority (Low/Medium/High/Critical)
- Order summary preview with calculated total and 5% tax
- Validation: required fields, quantity range, type selection
- On submit: creates `TransportRequest` with status `new`, generates ID (`REQ-NNNN`), sets SLA deadline to 72 hours
- Toast notification on success

**Edit Request (Req 2.4):**
- Edit button visible on the detail pane for requests with status `new`
- Opens edit modal pre-filled with current values
- Allows changing: Station, Fertilizer Type, Quantity, Priority
- Cannot edit if status is no longer `new`
- Generates audit log entry on save

**Filter by Date (Req 3.2):**
- Date range filter added to the filter bar
- Two date inputs: "From" and "To"
- Filters `request.date` within the selected range
- Combined with existing district and priority filters

---

### 3.3 View Fertilizer Requests (Req 3.1, 3.2)

**All dashboards use a split-pane layout:**
- Left pane: sortable/filterable request list
- Right pane: request detail view

**Status values (`types/index.ts`):**
```
new → pending_admin_manager → approved → pending_finance → invoiced →
released → booking_stock → prepping → driver_assigned →
order_picked_up → delivered
```

**Status badges color-coded:**
- `new` — Gray
- `pending_*` — Yellow
- `approved`, `invoiced` — Blue
- `released`, `booking_stock`, `prepping` — Orange
- `driver_assigned`, `order_picked_up` — Teal
- `delivered` — Green
- `declined`, `invoice_declined` — Red

**Date Filter:** Applied via date range inputs in the filter bar of `AdminStaffDashboard`.

---

### 3.4 Approve / Reject Requests (Req 4.1, 4.2, 4.3, 4.4)

**Component:** `AdminManagerDashboard.tsx`

- Left sidebar shows pending queue (status `pending_admin_manager`) sorted by SLA deadline
- Overdue items highlighted in red with "OVERDUE" badge
- Selecting a request shows full details with stock availability per item

**Approve:**
- "APPROVE & RELEASE STOCK" button
- Updates status to `pending_finance`
- Reduces `available` stock and increases `booked` stock
- Audit log entry: "Request approved and stock released"

**Reject:**
- Opens decline modal
- Requires minimum 50-character reason
- Updates status to `declined`
- Audit log entry: "Declined: [reason]"

**Notifications:** Sonner toast on both actions

---

### 3.5 Invoice Management (Req 5.1, 5.2, 5.3, 5.4)

**Component:** `FinanceDashboard.tsx`

**Generate Invoice:**
- For requests with status `approved` or `pending_finance`
- Invoice form with: Request ID, Items (type, qty, amount), Subtotal, Tax (5%), Grand Total
- Ledger-style terminal animation during generation
- Creates `Invoice` record with ID `INV-NNNN`

**Invoice Status Flow:**
```
generated → released → paid
          ↘ declined
```

**View Invoice Status:**
- Stats bar shows: pending count, released today, total value, invoice count
- Invoice list with filtering by status
- Print-ready invoice view in new window

---

### 3.6 Approve / Reject Payment (Req 6.1, 6.2, 6.3)

**Finance Dashboard — Invoice Actions:**

- **Release Invoice:** Updates status to `released`, request status to `released`
- **Decline Invoice:** Requires reason (50+ chars), status → `invoice_declined`
- **Mark Paid:** Payment method selector (Cash / Credit / Account), status → `paid`

All actions trigger audit log entries and toast notifications.

---

### 3.7 Stock Management (Req 7.1, 7.2, 7.3, 7.4, 7.5)

**Components:** `WarehouseDashboard.tsx`, `IMSDashboard.tsx`

**Stock Status Types:**
- `in_stock` (green) — available > 30% of total
- `low_stock` (orange) — available 10–30% of total
- `out_of_stock` (red) — available < 10% of total

**Stock Workflow:**
1. Admin Manager approves → stock moves from `available` to `booked`
2. Warehouse books stock → `booking_stock` status
3. Stock marked as prepping → `prepping` status
4. Driver picks up → `order_picked_up`, stock reduces total

**IMS Dashboard tabs:** Products | Stock In | Stock Out | History | Alerts

**Low Stock Alerts (Req 7.5):**
- Alert count badge on IMS tab
- "Alerts" tab lists products below `min_stock_threshold`
- Separate sections for "Low Stock" and "Out of Stock" products

---

### 3.8 Dispatch & Driver Assignment (Req 8.1, 8.2, 8.3)

**WarehouseDashboard handles:**

**Driver Assignment:**
- Search modal shows available drivers with: name, vehicle type, license plate, rating, district
- Assigns driver → status changes to `driver_assigned`
- Audit log entry: "Driver [name] assigned"

**Dispatch Recording:**
- "ORDER PICKED UP" button updates status to `order_picked_up`
- Records `pickedUpAt` timestamp
- Driver info shown in detail pane

**Status after dispatch:** `driver_assigned` → `order_picked_up` → `delivered`

---

### 3.9 Delivery Tracking (Req 9.1, 9.2)

**Internal Tracking:** All internal dashboards show request status and timeline

**Receiver Portal (`ReceiverPortal.tsx`):**
- Public-facing tracking by Order ID or Invoice ID
- Timeline view showing all status steps (Pizza Hut style)
- Shows current step (pulsing indicator)
- Completed steps show checkmark
- Driver details shown when assigned
- Status badges: "DELIVERED" (green), "IN TRANSIT" (teal), "PROCESSING" (blue)

**Notifications:** Delivery completion updates audit log (no external push notification implemented in MVP)

---

### 3.10 Past Records & Audit Log (Req 10.1, 10.2, 10.3)

**Search:** All dashboards have search functionality across request ID, station name, and origin

**AuditLog Component (`AuditLog.tsx`):**
- Displays on every request detail view
- Shows: action type, details, user, timestamp
- Actions have color-coded icons
- Reverse chronological order

**Action types logged:**
- `REQUEST_CREATED` — request made
- `ROUTED` — sent to next stage
- `APPROVED` / `DECLINED` — admin manager decision
- `INVOICE_GENERATED` / `INVOICE_RELEASED` / `DECLINED` — finance actions
- `STOCK_BOOKED` / `PREPPING` — warehouse actions
- `DRIVER_ASSIGNED` / `ORDER_PICKED_UP` / `DELIVERED` — dispatch
- `REQUEST_EDITED` — staff edits

---

## 4. Technical Specification

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix-based) |
| State Management | React Context + useReducer (`AppStore.tsx`) |
| Backend | Supabase (PostgreSQL) |
| Auth | Simulated (mock credentials in `mockData.ts`) |

### 4.2 Key Files

```
src/
├── App.tsx                    # Role-based routing
├── components/
│   ├── dashboards/
│   │   ├── AdminStaffDashboard.tsx
│   │   ├── AdminManagerDashboard.tsx
│   │   ├── FinanceDashboard.tsx
│   │   ├── WarehouseDashboard.tsx
│   │   ├── IMSDashboard.tsx
│   │   └── ReceiverPortal.tsx
│   ├── login/
│   │   └── LoginScreen.tsx
│   └── shared/
│       ├── AuditLog.tsx
│       ├── DashboardHeader.tsx
│       ├── StatusBadge.tsx
│       └── PriorityBadge.tsx
├── store/
│   └── AppStore.tsx           # Global state + reducer
├── lib/
│   ├── db/
│   │   ├── requests.ts
│   │   ├── invoices.ts
│   │   ├── stock.ts
│   │   ├── drivers.ts
│   │   └── ims.ts
│   └── supabase.ts
├── types/
│   └── index.ts               # All TypeScript types
└── data/
    ├── mockData.ts            # Mock users + credentials
    └── fertilizerDatabase.ts  # Fertilizer types + prices
```

### 4.3 Data Flow

```
User Action → Dispatch Action → AppReducer → AppState Update → UI Re-render
                                        ↓
                               localStorage (backup)
                                        ↓
                               Supabase (primary db)
```

### 4.4 Database Tables (Supabase)

- `transport_requests` — main request records
- `stations` — station reference data
- `request_items` — line items per request
- `invoices` — invoice records
- `invoice_items` — invoice line items
- `stock` — current stock levels
- `fertilizers` — fertilizer product catalog
- `stock_logs` — stock change history
- `drivers` — driver pool

---

## 5. UI/UX Specification

### 5.1 Layout

- **Split-pane layout:** Left list (30–40%) + Right detail (60–70%)
- **Top bar:** Dashboard header with role title and logout
- **Stats bar:** Key metrics at a glance (pending counts, stock levels, etc.)

### 5.2 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Green | `#15803d` | CTAs, active states, highlights |
| Green Hover | `#15803d` → `#166534` | Button hover states |
| Surface White | `#ffffff` | Cards, modals |
| Background Gray | `#f8fafc` | Page background |
| Border Gray | `#e2e8f0` | Dividers, card borders |
| Text Primary | `#1e293b` | Headings, body text |
| Text Secondary | `#64748b` | Labels, hints |
| Danger Red | `#dc2626` | Reject, error, overdue |
| Warning Orange | `#ea580c` | Low stock alerts |
| Info Blue | `#0284c7` | Pending, invoiced states |

### 5.3 Typography

- **Font:** System font stack (sans-serif)
- **Headings:** Bold, text-lg (18px)
- **Body:** text-sm (14px)
- **Labels/Hints:** text-xs (12px), uppercase, tracking-wider
- **Monospace:** `font-mono` for IDs, codes, numbers

### 5.4 Components

- **StatusBadge** — color-coded pill for request status
- **PriorityBadge** — icon + label for priority level
- **SLACountdown** — live countdown to SLA deadline
- **AuditLog** — scrollable log with icons and timestamps
- **Sonner toasts** — success/error notifications

---

## 6. Non-Functional Requirements

| Requirement | Implementation |
|------------|----------------|
| **Role-based access** | Each role loads a specific dashboard; no URL-based access to other dashboards |
| **Audit trail** | Every state-changing action is logged with user, timestamp, action type, and details |
| **SLA enforcement** | 72-hour SLA deadline; visual countdown; overdue highlighting |
| **Data persistence** | Supabase as primary; localStorage as fallback |
| **Responsive (basic)** | Flex-based layout adapts to viewport; optimized for desktop |

---

## 7. Requirement Coverage Summary

| Req ID | Description | Status |
|--------|-------------|--------|
| 1.1 | Secure login | ✅ |
| 1.2 | Role-based access (6 roles) | ✅ |
| 1.3 | Function restriction by role | ✅ |
| 2.1 | Admin staff create request | ✅ |
| 2.2 | Confirmation notification | ✅ |
| 2.3 | Request validation | ✅ |
| Req ID | Description | Status |
|--------|-------------|--------|
| 1.1 | Secure login | ✅ |
| 1.2 | Role-based access (6 roles) | ✅ |
| 1.3 | Function restriction by role | ✅ |
| 2.1 | Admin staff create request | ✅ |
| 2.2 | Confirmation notification | ✅ |
| 2.3 | Request validation | ✅ |
| 2.4 | Edit/rename request | ✅ |
| 3.1 | Display with status | ✅ |
| 3.2 | Filter by date | ✅ |
| 4.1 | Admin manager approve | ✅ |
| 4.2 | Admin manager reject with reason | ✅ |
| 4.3 | Display pending queue | ✅ |
| 4.4 | Approve/reject notification | ✅ |
| 5.1 | Finance raise invoice | ✅ |
| 5.2 | Invoice form (all fields) | ✅ |
| 5.3 | Submit invoice for approval | ✅ |
| 5.4 | View invoice status | ✅ |
| 6.1 | Finance manager view invoice | ✅ |
| 6.2 | Finance manager approve/reject | ✅ |
| 6.3 | Notify finance staff | ✅ |
| 7.1 | View stock records | ✅ |
| 7.2 | Check availability before release | ✅ |
| 7.3 | Release for approved requests | ✅ |
| 7.4 | Auto-update stock levels | ✅ |
| 7.5 | Low stock threshold alerts | ✅ |
| 8.1 | Record dispatch details | ✅ |
| 8.2 | Validate dispatch details | ✅ |
| 8.3 | Update dispatch status | ✅ |
| 9.1 | Track delivery (multi-role) | ✅ |
| 9.2 | Notify on successful delivery | ✅ |
| 10.1 | Search/view past records | ✅ |
| 10.2 | Complete history of actions | ✅ |
| 10.3 | Admin staff view activity records | ✅ |

**Total: 30/30 requirements implemented**
| 4.2 | Admin manager reject with reason | ✅ |
| 4.3 | Display pending queue | ✅ |
| 4.4 | Approve/reject notification | ✅ |
| 5.1 | Finance raise invoice | ✅ |
| 5.2 | Invoice form (all fields) | ✅ |
| 5.3 | Submit invoice for approval | ✅ |
| 5.4 | View invoice status | ✅ |
| 6.1 | Finance manager view invoice | ✅ |
| 6.2 | Finance manager approve/reject | ✅ |
| 6.3 | Notify finance staff | ✅ |
| 7.1 | View stock records | ✅ |
| 7.2 | Check availability before release | ✅ |
| 7.3 | Release for approved requests | ✅ |
| 7.4 | Auto-update stock levels | ✅ |
| 7.5 | Low stock threshold alerts | ✅ |
| 8.1 | Record dispatch details | ✅ |
| 8.2 | Validate dispatch details | ✅ |
| 8.3 | Update dispatch status | ✅ |
| 9.1 | Track delivery (multi-role) | ✅ |
| 9.2 | Notify on successful delivery | ✅ |
| 10.1 | Search/view past records | ✅ |
| 10.2 | Complete history of actions | ✅ |
| 10.3 | Admin staff view activity records | ✅ |

**Total: 30/30 requirements implemented**

---

## 8. Future Considerations (Out of Scope for MVP)

- Real external push notifications (SMS/email)
- Offline-first with service worker
- Mobile-native apps for drivers and receivers
- Multi-tenant / regional officer dashboard
- PDF export of invoices and reports
- Advanced analytics and reporting dashboard