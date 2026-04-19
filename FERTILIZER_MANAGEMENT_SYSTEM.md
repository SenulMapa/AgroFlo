# FERTILIZER DISTRIBUTION MANAGEMENT SYSTEM (FDMS)
## Complete Technical Documentation

---

# TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Database Schema](#3-database-schema)
4. [Workflows](#4-workflows)
5. [Screen Specifications](#5-screen-specifications)
6. [Implementation Details](#6-implementation-details)
7. [SLA & Overdue Calculations](#7-sla--overdue-calculations)
8. [Invoice Generation & Printing](#8-invoice-generation--printing)
9. [Stock Management](#9-stock-management)
10. [Audit Logging](#10-audit-logging)
11. [Mobile & Responsive Design](#11-mobile--responsive-design)
12. [Future Improvements](#12-future-improvements)

---

# 1. SYSTEM OVERVIEW

## 1.1 Purpose
The Fertilizer Distribution Management System (FDMS) is a comprehensive web-based application for managing the entire lifecycle of fertilizer requests - from station submission through delivery to farmers.

## 1.2 Technology Stack
- **Frontend:** React 19 + TypeScript + Vite
- **UI Framework:** Radix UI + TailwindCSS + Lucide Icons
- **State Management:** React Context + useReducer
- **Persistence:** localStorage (simulated backend)
- **No External Backend** (all data stored locally)

## 1.3 Key Features
1. Multi-role login system with separate dashboards
2. Fertilizer request creation with auto-populated order summary
3. SLA-based overdue calculation and display
4. Stock availability visibility for approvers
5. Admin Manager stock release control
6. Finance invoice generation and printing
7. Cashier release/decline invoice workflow
8. Driver portal with mobile responsiveness
9. Complete audit trail for all actions

---

# 2. USER ROLES & PERMISSIONS

## 2.1 Role Definitions

### Admin Staff
| Property | Value |
|----------|-------|
| Role ID | `admin_staff` |
| Employee ID Format | `ADM001`, `ADM002`, etc. |
| Dashboard | AdminStaffDashboard |
| Responsibilities | • Receive requests from stations<br>• Create new fertilizer requests<br>• Route requests to Admin Manager<br>• View all requests in queue |
| Permissions | Create, Read, Route |

### Admin Manager
| Property | Value |
|----------|-------|
| Role ID | `admin_manager` |
| Employee ID Format | `MGR001`, `MGR002`, etc. |
| Dashboard | AdminManagerDashboard |
| Responsibilities | • Approve/Decline requests<br>• View stock availability<br>• Release stock after approval<br>• Final authorization before finance |
| Permissions | Approve, Decline, Release Stock, Read |

### Finance Staff / Cashier
| Property | Value |
|----------|-------|
| Role ID | `finance` |
| Employee ID Format | `FIN001`, `FIN002`, etc. |
| Dashboard | FinanceDashboard |
| Responsibilities | • Generate invoices<br>• Release invoices to warehouse<br>• Declined invoices with reason<br>• Process payments |
| Permissions | Generate Invoice, Release/Decline, Read |

### Warehouse Manager
| Property | Value |
|----------|-------|
| Role ID | `warehouse` |
| Employee ID Format | `WAR001`, `WAR002`, etc. |
| Dashboard | WarehouseDashboard |
| Responsibilities | • Book stock<br>• Prep orders<br>• Assign drivers<br>• Mark as shipped<br>• Manage inventory |
| Permissions | Book Stock, Assign Driver, Ship, Read Inventory |

### Driver
| Property | Value |
|----------|-------|
| Role ID | `driver` |
| Employee ID Format | `DRV001`, `DRV002`, etc. |
| Dashboard | DriverPortal |
| Responsibilities | • View available jobs<br>• Place bids<br>• Accept assignments<br>• Update delivery status |
| Permissions | Bid, Accept Jobs, Update Status |

## 2.2 Login Credentials (Default)
| Role | Employee ID | Password |
|------|-------------|----------|
| Admin Staff | ADM001 | fdms123 |
| Admin Manager | MGR001 | fdms123 |
| Finance | FIN001 | fdms123 |
| Warehouse | WAR001 | fdms123 |
| Driver | DRV001 | fdms123 |

---

# 3. DATABASE SCHEMA

## 3.1 Core Tables/Interfaces

### User
```typescript
interface User {
  id: string;              // Unique identifier
  employeeId: string;     // Employee ID (e.g., "ADM001")
  name: string;           // Full name
  role: UserRole;         // Role enum
  avatar?: string;        // Optional avatar URL
}
```

### StationInfo
```typescript
interface StationInfo {
  id: string;             // Station ID (e.g., "STN-1001")
  name: string;          // Station name
  location: string;      // Physical location
  district: string;     // District name
  contactPerson: string; // Contact name
  phone: string;        // Contact phone
}
```

### FertilizerItem
```typescript
interface FertilizerItem {
  sku: string;           // Stock keeping unit
  name: string;         // Product name (e.g., "Urea 46-0-0 - 50kg bag")
  type: string;         // Fertilizer type (Urea, DAP, MOP, NPK, etc.)
  quantity: number;      // Quantity in bags
  unitCost: number;     // Cost per unit (LKR)
  tax: number;          // Tax amount (LKR)
  total: number;        // Total including tax (LKR)
}
```

### TransportRequest
```typescript
interface TransportRequest {
  // Identifiers
  id: string;                    // Request ID (e.g., "REQ-8801")
  
  // Timestamps
  date: Date;                    // Original request date
  orderCreatedDate: Date;        // Auto-captured order creation datetime
  
  // Request Details
  origin: string;                // How request came in (Station Portal, Phone, Email)
  status: RequestStatus;         // Current status
  priority: Priority;            // Priority level
  
  // Station & Delivery
  station: StationInfo;          // Originating station info
  destination: string;          // Delivery location
  
  // Order Details
  items: FertilizerItem[];       // Ordered items
  
  // SLA
  slaDeadline: Date;             // Calculated deadline
  
  // Workflow Fields
  createdByUser: string;        // User who created request
  createdByUserId: string;      // User ID
  
  // Assignment
  assignedTo?: string;          // Assigned to user
  assignedDriver?: DriverInfo; // Assigned driver
  driverAssignedAt?: Date;      // Driver assignment timestamp
  
  // Financials
  invoiceId?: string;           // Generated invoice ID
  invoiceGeneratedAt?: Date;   // Invoice generation timestamp
  clearedAt?: Date;             // Finance clearance timestamp
  releasedAt?: Date;            // Stock release timestamp
  
  // Warehouse
  stockBookedAt?: Date;         // Stock booking timestamp
  warehouseNotes?: string;      // WM notes
  
  // Route Info
  route?: {
    from: string;
    to: string;
    distance: number;           // km
  };
  
  // Completion
  shippedAt?: Date;           // Shipping timestamp
  
  // Rejection
  declineReason?: string;     // Reason if declined
  
  // Audit
  auditLog: AuditLogEntry[];   // All actions log
}
```

### Invoice
```typescript
interface Invoice {
  id: string;                  // Invoice ID (e.g., "INV-8801")
  requestId: string;           // Related request ID
  generatedAt: Date;           // Generation timestamp
  items: FertilizerItem[];     // Line items
  subtotal: number;            // Subtotal before tax
  taxTotal: number;            // Tax amount
  grandTotal: number;         // Total including tax
  status: 'generated' | 'released' | 'declined' | 'paid';
  releasedAt?: Date;          // Release timestamp
  paymentMethod?: 'cash' | 'credit' | 'account';
  paidAt?: Date;             // Payment timestamp
}
```

### StockItem (Inventory)
```typescript
interface StockItem {
  sku: string;           // SKU
  name: string;         // Product name
  type: string;         // Fertilizer type
  available: number;   // Available stock (metric tons)
  booked: number;      // Temporarily held (booked)
  prepping: number;    // Being loaded/prepared
  total: number;      // Total in warehouse
}
```

### DriverInfo
```typescript
interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;     // 10-Wheeler, 6-Wheeler, Trailer
  licensePlate: string;
  capacity: number;        // Metric tons
  rating: number;         // 0-5 rating
  location: {
    lat: number;
    lng: number;
    district: string;
  };
  isAvailable: boolean;
}
```

### AuditLogEntry
```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}
```

## 3.2 Enums

### RequestStatus
```
new                    → Admin staff receives from station
pending_admin → Sent to Admin Manager
approved             → Admin Manager approved
pending_finance       → Sent to Finance
invoiced              → Invoice generated
released             → Finance released to warehouse
booking_stock        → Warehouse booking stock
prepping              → Stock being prepared/loaded
shipped               → Fully shipped, stock removed from inventory
driver_assigned       → Driver assigned
in_transit            → In transit to destination
declined              → Declined with reason
invoice_declined      → Invoice declined by Finance
```

### Priority
```
low     → Low priority
medium → Medium priority
high    → High priority
critical → Critical priority
```

### UserRole
```
admin_staff    → Admin Staff
admin_manager → Admin Manager
finance      → Finance/Cashier
warehouse   → Warehouse Manager
driver       → Driver
```

---

# 4. WORKFLOWS

## 4.1 Request Creation Workflow
```
1. Station contacts Admin Staff (via Portal/Phone/Email)
2. Admin Staff logs into AdminStaffDashboard
3. Admin Staff clicks "CREATE NEW REQUEST"
4. Admin Staff fills form:
   - Selects station
   - Selects fertilizer type(s) and quantity
   - Sets priority
   - Specifies destination
5. System auto-populates Order Summary:
   - Order Created Date (current datetime)
   - Quantity (user input)
   - Fertilizer Type (selected)
   - Unit Price (from database)
   - Total Amount (calculated)
   - Station Info (selected station)
   - Created User Name (logged-in user)
6. Admin Staff submits request
7. Request saved with status: "new"
8. Audit log entry created
```

## 4.2 Approval Workflow
```
1. Admin Staff routes request to Admin Manager
2. Request status: "pending_admin_manager"
3. Admin Manager reviews request:
   - Views station info
   - Views order details
   - Views stock availability (auto-displayed)
4. Admin Manager decides:
   
   A. APPROVE:
      a. Click "APPROVE & RELEASE STOCK"
      b. Stock deducted from inventory
      c. Status: "pending_finance"
      d. Audit log entry
      
   B. DECLINE:
      a. Click "DECLINE"
      b. Enter reason (min 50 chars)
      c. Confirm dialog
      d. Status: "declined"
      e. Request returns to Admin Staff
      f. Audit log entry
```

## 4.3 Finance Workflow
```
1. Request reaches Finance queue
2. Finance Staff reviews:
   - Views request details
   - Views invoice (if generated)
3. Finance Staff actions:
   
   A. GENERATE INVOICE:
      a. Click "GENERATE INVOICE"
      b. System creates invoice record
      c. Status: "invoiced"
      d. Invoice ID generated
      
   B. RELEASE INVOICE:
      a. Click "RELEASE INVOICE"
      b. Confirmation dialog
      c. Status: "released"
      d. Warehouse notified
      e. Audit log entry
      
   C. DECLINE INVOICE:
      a. Click "DECLINE INVOICE"
      b. Enter reason (min 50 chars)
      c. Confirmation dialog
      d. Status: "invoice_declined"
      e. Return to Admin Manager
      f. Audit log entry
```

## 4.4 Warehouse Workflow
```
1. Warehouse receives cleared request
2. Sequential workflow:

   Stage 1 - BOOK STOCK:
   a. Click "BOOK STOCK"
   b. Stock moved from available to booked
   c. Status: "booking_stock"
   
   Stage 2 - PREPPING:
   a. Click "START PREPPING"
   b. Stock moved from booked to prepping
   c. Status: "prepping"
   
   Stage 3 - ASSIGN DRIVER (optional):
   a. Click "ASSIGN DRIVER"
   b. Select driver from list
   c. Driver assigned to request
   d. Status: "driver_assigned"
   
   Stage 4 - SHIP:
   a. Click "MARK SHIPPED"
   b. Stock removed from inventory
   c. Status: "shipped"
   d. Driver can now start delivery
```

## 4.5 Driver Workflow
```
1. Driver views available jobs
2. Options:
   
   A. PLACE BID:
      a. Enter bid amount
      b. Submit bid
      c. Wait for assignment
      
   B. ACCEPT JOB:
      a. Click "ACCEPT JOB"
      b. Immediate assignment
      c. Job appears in "My Jobs"
      
3. View assigned job details
4. Click "START TRIP"
5. Update status to "in_transit"
6. Complete delivery
```

---

# 5. SCREEN SPECIFICATIONS

## 5.1 Login Screen

### Purpose
Single entry point for all users with role-based routing.

### Components
- FDMS Logo and branding
- Employee ID input field
- Password input field
- "Sign In" button
- Quick login buttons (demo only)
- Error message display area

### Flows
1. User enters credentials
2. System validates against user database
3. On success: Route to role-specific dashboard
4. On failure: Show error message

---

## 5.2 Admin Staff Dashboard

### Purpose
Primary dashboard for Admin Staff to manage fertilizer requests from stations.

### Components

**Header Bar**
- FDMS logo
- Dashboard title
- User info and role
- Logout button

**Left Pane - Request List (40%)**
- Search bar
- District filter dropdown
- Priority filter dropdown
- Request count display
- Scrollable request table:
  - ID
  - Date
  - Origin
  - Status badge

**Right Pane - Detail View (60%)**
- Request header with ID and badges
- **NEW: Order Summary Section**
- Station Information
- Fertilizer Order table
- Destination info
- Audit Log

**NEW: Create Request Form**
- Station selection dropdown (with search)
- Fertilizer type multi-select
- Quantity input per type
- Priority selection
- Destination input
- Delivery notes

**Order Summary (Auto-populated)**
- Order Created Date: `[Current Datetime]`
- Quantity: `[Sum of all items]`
- Fertilizer Type: `[Comma-separated types]`
- Unit Price: `[From database]`
- Total Amount: `[Calculated]`
- Station Info: `[Selected station details]`
- Created User Name: `[Logged-in user]`

### Flows
1. Browse/search requests in list
2. Click request to view details
3. Click "CREATE NEW REQUEST" button
4. Fill form → Auto-summary updates
5. Submit → New request created
6. Click "ROUTE TO ADMIN" → Pending Admin Manager

---

## 5.3 Admin Manager Dashboard

### Purpose
Approval dashboard for Admin Manager with stock visibility.

### Components

**Header Bar**
- FDMS logo
- Dashboard title
- User info and role
- Logout button

**Left Pane - Pending Queue (30%)**
- Pending requests list sorted by SLA
- Each item shows:
  - Request ID
  - Station name
  - Route info
  - SLA countdown
  - Priority badge

**Right Pane - Detail View (70%)**

**Stock Availability Panel**
- Collapsible/always visible section
- Table showing:
  ```
  | Fertilizer | Available | Booked | Status |
  |------------|-----------|--------|--------|
  | Urea       | 450 MT    | 50 MT  | ✓ Stock |
  | DAP        | 280 MT    | 30 MT  | ✓ Stock |
  ```

**Request Detail**
- Request header with status badges
- Fertilizer order table
- Station info
- Destination info

**Action Buttons**
- **"APPROVE & RELEASE STOCK"** (green)
  - Approves request
  - Deducts stock immediately
  - Routes to Finance
- **"DECLINE"** (red)
  - Opens decline reason dialog
  - Requires 50+ character reason

### Flows
1. View pending queue
2. Select request
3. Review stock availability
4. Review order details
5. Click APPROVE or DECLINE
6. If APPROVE: Stock released, status → pending_finance
7. If DECLINE: Status → declined, return to Admin Staff

---

## 5.4 Finance Dashboard

### Purpose
Invoice generation and release by Finance Staff/Cashier.

### Components

**Header Bar**
- FDMS logo
- Dashboard title
- User info and role
- Logout button

**Stats Bar**
- Pending count
- Cleared today
- Total value
- Invoice count

**Left Sidebar - Queues (25%)**
- Pending list (for invoice)
- Invoiced list (released/pending)

**Main Area - Request Detail**
- Request header
- Invoice preview (if generated)
- Fertilizer order table
- Audit log

**NEW: Invoice Actions**
- **"GENERATE INVOICE"** - Creates invoice
- **"RELEASE INVOICE"** (green) - Releases to warehouse
- **"DECLINE INVOICE"** (red) - Declines with reason

**Invoice Print Section**
- Ledger preview terminal display
- **"PRINT"** button → Opens print dialog

### NEW: Invoice Print Dialog
Generates properly formatted invoice:
```
╔══════════════════════════════════════════════════╗
║          FERTILIZER DISTRIBUTION              ║
║          MANAGEMENT SYSTEM                   ║
║                                          ║
║  INVOICE #: INV-8801      DATE: 2026-04-19 ║
║                                          ║
║  BILL TO:                                        ║
║  Colombo Central Station                       ║
║  Colombo District                          ║
║  Contact: Station Manager 1                 ║
║  Phone: +94 11 2000123                     ║
║                                          ║
║  ─────────────────────────────────────────  ║
║                                          ║
║  ITEM          QTY    UNIT PRICE    TOTAL      ║
║  ─────────────────────────────────────────  ║
║  Urea 46-0-0    50    4,500    225,000  ║
║  DAP 18-46-0     30    8,200    246,000  ║
║                                          ║
║  ─────────────────────────────────────────  ║
║  SUBTOTAL:                    471,000        ║
║  TAX (5%):                     23,550      ║
║  ─────────────────────────────────────────  ║
║  GRAND TOTAL:                 494,550        ║
║                                          ║
║  ─────────────────────────────────────────  ║
║  PAYMENT METHOD: [ ] Cash [ ] Credit [ ]    ║
║                                          ║
║  PAYMENT STATUS: PENDING / PAID             ║
║                                          ║
║  ─────────────────────────────────────────  ║
║  Authorized Signature: ________________     ║
║                                          ║
╚══════════════════════════════════════════════════╝
```

### Flows
1. Select request from pending
2. Click "GENERATE INVOICE"
3. View invoice preview
4. Click "RELEASE INVOICE" → Confirmation → Status: released
5. OR Click "DECLINE INVOICE" → Reason → Return to Admin
6. Click "PRINT" → Opens print window with formatted invoice

---

## 5.5 Warehouse Dashboard

### Purpose
Stock management, order preparation, driver assignment.

### Components

**Header Bar**
- Standard header

**Stats Bar**
- Cleared count
- Booking count
- Prepping count
- Shipped count

**IMS Toggle Button**
- Switch between Orders view and Inventory view

**IMS View - Full Stock Table**
```
| SKU | Type | Product | Available | Booked | Prepping | Total | Status |
```

**Orders View - Queue Sidebar**
- Cleared requests
- Booking stock requests
- Prepping requests

**Order Detail**
- Request header
- Action buttons per stage
- Order items
- Delivery info

### Action Flows
1. Select cleared request
2. Click "BOOK STOCK" → Moves to bookings
3. Click "START PREPPING" → Status: prepping
4. Click "ASSIGN DRIVER" → Driver modal
5. Click "MARK SHIPPED" → Remove stock

---

## 5.6 Driver Portal (Mobile-Optimized)

### Purpose
Mobile-first driver interface without stat bar.

### Components

**Header Bar** (Simplified)
- FDMS logo
- User name
- Logout button

**No Stats Bar** (Removed per requirements)

**Tab Navigation**
- AVAILABLE JOBS
- MY JOBS
- COMPLETED

**Job Cards**
- Request ID
- Route info
- Cargo details
- Earnings estimate
- Bid/Accept buttons
- Status badges

### Mobile Optimizations
- Touch-friendly buttons (min 44px tap targets)
- Single column layout
- Large readable text
- Bottom action buttons where needed
- No horizontal scrolling

### Flows
1. View available jobs tab
2. Enter bid amount OR accept directly
3. View my jobs tab
4. Click "START TRIP"
5. View completed deliveries

---

# 6. IMPLEMENTATION DETAILS

## 6.1 File Structure
```
/src
  /components
    /dashboards
      AdminStaffDashboard.tsx
      AdminManagerDashboard.tsx  (renamed)
      FinanceDashboard.tsx
      WarehouseDashboard.tsx
      DriverPortal.tsx
    /login
      LoginScreen.tsx
    /shared
      DashboardHeader.tsx
      StatusBadge.tsx
      PriorityBadge.tsx
      SLACountdown.tsx
      AuditLog.tsx
    /ui  (Radix components)
  /data
    mockData.ts
  /store
    AppStore.tsx
  /types
    index.ts
  App.tsx
  main.tsx
  index.css
```

## 6.2 Key Functions

### Overdue Calculation
```typescript
const SLA_HOURS = 72; // 3 days

const isOverdue = (request: TransportRequest): boolean => {
  const completedStatuses = ['shipped', 'declined', 'completed'];
  if (completedStatuses.includes(request.status)) return false;
  
  const createdDate = new Date(request.date);
  const deadline = new Date(createdDate.getTime() + (SLA_HOURS * 60 * 60 * 1000));
  return new Date() > deadline;
};
```

### Stock Release
```typescript
const releaseStock = (request: TransportRequest, stock: StockItem[]) => {
  return stock.map(stockItem => {
    const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
    if (requestItem) {
      const qtyMT = requestItem.quantity / 20;
      return {
        ...stockItem,
        available: Math.max(0, stockItem.available - qtyMT),
        booked: stockItem.booked + qtyMT,
      };
    }
    return stockItem;
  });
};
```

### Invoice Generation
```typescript
const generateInvoice = (request: TransportRequest): Invoice => {
  const subtotal = request.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
  const taxTotal = request.items.reduce((sum, item) => sum + item.tax, 0);
  
  return {
    id: `INV-${request.id.split('-')[1]}`,
    requestId: request.id,
    generatedAt: new Date(),
    items: request.items,
    subtotal,
    taxTotal,
    grandTotal: subtotal + taxTotal,
  };
};
```

---

# 7. SLA & OVERDUE CALCULATIONS

## 7.1 SLA Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| SLA Period | 72 hours | 3 business days |
| Calculation | Created Date + 72h | Hard deadline |
| Check Frequency | Real-time | On every render |

## 7.2 Overdue Conditions

**Marked Overdue When:**
1. Current time > (Order Created Date + 72 hours)
2. AND Status is NOT in:
   - `shipped`
   - `declined`
   - `completed`

## 7.3 Visual Indicators

| Status | Color | Badge Text | Row styling |
|--------|-------|-----------|-----------|
| On Time | Green | Normal status | Default |
| At Risk (< 6h) | Orange | Normal status + warning | Orange left border |
| Critical (< 2h) | Red | Normal status + warning | Red left border |
| Overdue | Red | **OVERDUE** | Red left border, red background tint |

---

# 8. INVOICE GENERATION & PRINTING

## 8.1 Invoice Generation Process
```
1. Finance selects request
2. Clicks "GENERATE INVOICE"
3. System calculates:
   - Subtotal = Σ(quantity × unitCost)
   - Tax = 5% of subtotal
   - Grand Total = Subtotal + Tax
4. Creates Invoice record with unique ID
5. Updates request status to "invoiced"
6. Adds audit log entry
```

## 8.2 Invoice Print Implementation

### Print Window Generation
```typescript
const printInvoice = (invoice: Invoice, request: TransportRequest) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.id}</title>
      <style>
        body { font-family: monospace; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border: 1px solid #ccc; }
        .header { text-align: center; margin-bottom: 20px; }
        .total-row { font-weight: bold; }
      </style>
    </head>
    <body>
      ${generateInvoiceHTML(invoice, request)}
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};
```

---

# 9. STOCK MANAGEMENT

## 9.1 Stock States

| State | Description | Can Be Booked? |
|-------|------------|---------------|
| Available | Ready to fulfill | Yes |
| Booked | Temporarily held | No |
| Prepping | Being loaded to truck | No |
| Total | Sum of all above | - |

## 9.2 Stock Flow
```
Available → Booked → Prepping → Shipped (removed)
```

## 9.3 Stock Release by Admin Manager
```
Admin Manager APPROVES request
→ Automatically deducts stock from Available
→ Adds to Booked
→ Status changes to pending_finance
```

---

# 10. AUDIT LOGGING

## 10.1 Audit Entry Structure
```typescript
interface AuditLogEntry {
  id: string;           // Random ID
  timestamp: Date;     // Current time
  user: string;        // User who performed action
  role: UserRole;       // Their role
  action: string;      // Action name (e.g., "APPROVED")
  details: string;      // Human-readable details
}
```

## 10.2 Actions Logged
| Action | User | Details |
|--------|------|---------|
| REQUEST_CREATED | Admin Staff | "Request created with X items" |
| ROUTED | Admin Staff | "Routed to Admin Manager" |
| APPROVED | Admin Manager | "Request approved and stock released" |
| DECLINED | Admin Manager | "Declined: [reason]" |
| INVOICE_GENERATED | Finance | "Invoice [ID] generated" |
| INVOICE_RELEASED | Finance | "Invoice released to warehouse" |
| INVOICE_DECLINED | Finance | "Invoice declined: [reason]" |
| STOCK_BOOKED | Warehouse | "Stock reserved for order" |
| PREPPING | Warehouse | "Order being prepared" |
| DRIVER_ASSIGNED | Warehouse | "Driver [name] assigned" |
| SHIPPED | Warehouse | "Order shipped" |

---

# 11. MOBILE & RESPONSIVE DESIGN

## 11.1 Driver Portal Mobile Optimizations

### Removed Elements
- Top statistics bar (removed completely)
- Large padding and margins for touch
- Complex multi-column layouts

### Added Features
- Single column card layout
- Minimum 44px touch targets
- Bottom-positioned action buttons
- Simple tab navigation
- Large readable fonts (16px base)

### Responsive Breakpoints
| Breakpoint | Target |
|------------|--------|
| < 640px | Mobile |
| 640-1024px | Tablet |
| > 1024px | Desktop |

---

# 12. FUTURE IMPROVEMENTS

## 12.1 Recommended Enhancements

### High Priority
1. **Real Backend** - Replace localStorage with actual API
2. **Email Notifications** - Send emails on status changes
3. **PDF Export** - Export all requests to PDF
4. **Date Range Filters** - Filter by date range
5. **Advanced Search** - Full-text search across all fields

### Medium Priority
1. **Dashboard Charts** - Visual analytics
2. **Driver Mobile App** - Native iOS/Android
3. **SMS Notifications** - SMS alerts
4. **Offline Mode** - Work without internet
5. **Multi-language** - Sinhala/Tamil support

### Lower Priority
1. **KPI Dashboard** - Performance metrics
2. **Forecasting** - Predict demand
3. **Route Optimization** - AI routing
4. **QR Scanning** - Track deliveries
5. **Insurance Integration** - Vehicle insurance

## 12.2 Known Limitations

| Limitation | Description | Workaround |
|-----------|------------|-----------|
| No real authentication | Demo only | Integrate with LDAP/Active Directory |
| No email notifications | Manual process | Add email service |
| localStorage limits | 5MB max | Use IndexedDB or backend |
| No offline support | Must be online | Add PWA capabilities |
| Single browser session | No multi-device | Add session management |

---

# APPENDIX A: DEFAULT CREDENTIALS

| Role | Employee ID | Password | Name |
|------|------------|----------|------|
| Admin Staff | ADM001 | fdms123 | Kasun Perera |
| Admin Manager | MGR001 | fdms123 | Nimal Fernando |
| Finance | FIN001 | fdms123 | Dilani Silva |
| Warehouse | WAR001 | fdms123 | Ruwan Kumara |
| Driver | DRV001 | fdms123 | Saman Jayasinghe |

---

# APPENDIX B: DEFAULT FERTILIZER TYPES

| SKU | Name | Type | Unit Cost (LKR) |
|-----|------|------|----------------|
| FER-UREA-50 | Urea (46-0-0) - 50kg bag | Urea | 4,500 |
| FER-DAP-50 | DAP (18-46-0) - 50kg bag | DAP | 8,200 |
| FER-MOP-50 | MOP (0-0-60) - 50kg bag | MOP | 6,800 |
| FER-NPK-50 | NPK (15-15-15) - 50kg bag | NPK | 7,500 |
| FER-TSP-50 | TSP (0-46-0) - 50kg bag | TSP | 5,200 |
| FER-SUL-50 | Sulphur (90%) - 50kg bag | Sulphur | 3,200 |

---

# DOCUMENT REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-19 | Initial documentation for audit purposes |

---

*This documentation is intended for system audit and onboarding purposes.*