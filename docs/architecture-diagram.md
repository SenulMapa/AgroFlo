# AgroFlo — High-Level Architecture Diagram

## Mermaid Diagram

```mermaid
graph TB
    %% Styling
    classDef actor fill:#fecaca,stroke:#dc2626,stroke-width:1px
    classDef actorAlt fill:#bbf7d0,stroke:#16a34a,stroke-width:1px
    classDef actorBlue fill:#bfdbfe,stroke:#2563eb,stroke-width:1px
    classDef actorPurple fill:#e9d5ff,stroke:#9333ea,stroke-width:1px
    classDef actorOrange fill:#fed7aa,stroke:#ea580c,stroke-width:1px
    classDef layer fill:#f8fafc,stroke:#64748b,stroke-width:1px
    classDef interfaceLayer fill:#fce7f3,stroke:#db2777,stroke-width:2px
    classDef coreLayer fill:#dcfce7,stroke:#15803d,stroke-width:2px
    classDef dataLayer fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px
    classDef external fill:#ffffff,stroke:#334155,stroke-width:1px
    classDef module fill:#ffffff,stroke:#15803d,stroke-width:1px

    subgraph users["<b>USERS / ACTORS</b>"]
        A1["<b>Admin Staff</b><br/>Creates & routes requests"]
        A2["<b>Admin Manager</b><br/>Approves / Rejects requests"]
        A3["<b>Finance</b><br/>Invoicing & payments"]
        A4["<b>Warehouse Officer</b><br/>Stock & dispatch"]
        A5["<b>Receiver</b><br/>Tracks delivery"]
        UA["<b>Web Browser</b><br/>Desktop / Mobile / Tablet"]
    end

    subgraph interface["<b>INTERFACE LAYER</b>"]
        IF["<b>React SPA (Vite + TypeScript)</b><br/>Role-based dashboards<br/>Login / Auth flow<br/>Toast notifications"]
    end

    subgraph core["<b>CORE PROCESSING LAYER</b>"]
        GW["<b>API Gateway</b><br/>REST / Supabase"]
        
        M1["<b>Request Management</b>"]
        M2["<b>Approval Workflow</b>"]
        M3["<b>Invoice Management</b>"]
        M4["<b>Stock Management</b>"]
        M5["<b>Dispatch & Logistics</b>"]
        M6["<b>Audit & Tracking</b>"]
    end

    subgraph data["<b>DATA LAYER</b>"]
        DB["<b>Supabase PostgreSQL</b><br/>transport_requests<br/>invoices<br/>stock_levels<br/>drivers<br/>audit_logs"]
    end

    subgraph external["<b>EXTERNAL INTEGRATIONS</b>"]
        E1["<b>Email / SMS</b><br/>Notification Service"]
        E2["<b>Payment Gateway</b><br/>Bank Integration"]
        E3["<b>GPS / Maps</b><br/>Driver Tracking"]
    end

    %% Connections
    A1 --> UA
    A2 --> UA
    A3 --> UA
    A4 --> UA
    A5 --> UA

    UA --> IF
    IF --> GW
    GW --> M1
    GW --> M2
    GW --> M3
    GW --> M4
    GW --> M5
    GW --> M6

    M1 --> DB
    M2 --> DB
    M3 --> DB
    M4 --> DB
    M5 --> DB
    M6 --> DB

    M3 -.-> E1
    M3 -.-> E2
    M5 -.-> E3

    %% Class assignments
    class A1 actor
    class A2 actorAlt
    class A3 actorBlue
    class A4 actorPurple
    class A5 actorOrange
    class UA layer
    class IF interfaceLayer
    class core layer
    class GW coreLayer
    class M1,M2,M3,M4,M5,M6 module
    class DB dataLayer
    class E1,E2,E3 external
```

## PlantUML Source

```plantuml
@startuml
skinparam rectangle {
  BackgroundColor #f8fafc
  BorderColor #64748b
}
skinparam componentStyle rectangle

rectangle "USERS / ACTORS" {
  rectangle "Admin Staff" #fecaca as A1
  rectangle "Admin Manager" #bbf7d0 as A2
  rectangle "Finance" #bfdbfe as A3
  rectangle "Warehouse Officer" #e9d5ff as A4
  rectangle "Receiver" #fed7aa as A5
  rectangle "Web Browser\n(Desktop/Mobile/Tablet)" #f8fafc as UA
}

rectangle "INTERFACE LAYER" #fce7f3 {
  rectangle "React SPA\n(Vite + TypeScript)\nRole-based dashboards\nLogin / Auth\nToast Notifications" #ffffff as IF
}

rectangle "CORE PROCESSING LAYER" #dcfce7 {
  rectangle "API Gateway\nREST / Supabase" #bbf7d0 as GW
  
  rectangle "Request\nManagement" #ffffff as M1
  rectangle "Approval\nWorkflow" #ffffff as M2
  rectangle "Invoice\nManagement" #ffffff as M3
  rectangle "Stock\nManagement" #ffffff as M4
  rectangle "Dispatch &\nLogistics" #ffffff as M5
  rectangle "Audit &\nTracking" #ffffff as M6
}

rectangle "DATA LAYER" #dbeafe {
  rectangle "Supabase PostgreSQL\ntransport_requests\ninvoices\nstock_levels\ndrivers\naudit_logs" #ffffff as DB
}

rectangle "EXTERNAL INTEGRATIONS" #ffffff {
  rectangle "Email / SMS\nNotification Service" as E1
  rectangle "Payment Gateway\nBank Integration" as E2
  rectangle "GPS / Maps\nDriver Tracking" as E3
}

A1 --> UA
A2 --> UA
A3 --> UA
A4 --> UA
A5 --> UA

UA -down-> IF
IF -down-> GW
GW -down-> M1
GW -down-> M2
GW -down-> M3
GW -down-> M4
GW -down-> M5
GW -down-> M6

M1 -up-> DB
M2 -up-> DB
M3 -up-> DB
M4 -up-> DB
M5 -up-> DB
M6 -up-> DB

M3 ..> E1 : webhook
M3 ..> E2 : webhook
M5 ..> E3 : webhook

@enduml
```

## Layer Descriptions

| Layer | Description |
|-------|-------------|
| **Users / Actors** | All roles interact via browser. No desktop apps. |
| **Interface Layer** | Single React SPA with role-based routing. Login via auth flow, notifications via toasts. |
| **Core Processing Layer** | 6 functional modules managed by React Context (AppStore). All business logic here. Supabase client used for DB access. |
| **Data Layer** | Supabase PostgreSQL. Tables: transport_requests, invoices, stock_levels, drivers, audit_logs. |
| **External Integrations** | Email/SMS for notifications, Bank API for payments, GPS for driver tracking. |

## Data Flow

```
User → Web Browser → React SPA (Interface) → API Gateway → Core Modules
                                                              ↓
                                               Supabase PostgreSQL (Data)
                                                              ↓
                                               External Services (Email/SMS, Payment, GPS)
```