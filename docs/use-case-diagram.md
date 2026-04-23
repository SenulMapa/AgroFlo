# AgroFlo — Use Case Diagram

## PlantUML Source

```plantuml
@startuml
skinparam actorStyle awesome

left to right direction

actor "Admin Staff" as admin_staff
actor "Admin Manager" as admin_manager
actor "Finance" as finance
actor "Warehouse Officer" as warehouse
actor "Receiver" as receiver

rectangle "AgroFlo System" {
  usecase "Create Fertilizer Request" as UC1
  usecase "Edit/Rename Request" as UC2
  usecase "View Requests" as UC3
  usecase "Route Request to Admin" as UC4

  usecase "Approve Request" as UC5
  usecase "Reject Request" as UC6
  usecase "View Pending Queue" as UC7
  usecase "Check Stock Availability" as UC8

  usecase "Generate Invoice" as UC9
  usecase "Release Invoice" as UC10
  usecase "Decline Invoice" as UC11
  usecase "View Invoice Status" as UC12
  usecase "Mark Invoice Paid" as UC13

  usecase "View Stock Records" as UC14
  usecase "Release Stock" as UC15
  usecase "Book Stock" as UC16
  usecase "Update Stock Levels" as UC17
  usecase "Low Stock Alerts" as UC18

  usecase "Assign Driver" as UC19
  usecase "Record Dispatch Details" as UC20
  usecase "Update Dispatch Status" as UC21

  usecase "Track Delivery" as UC22
  usecase "View Activity Records" as UC23
}

admin_staff --> UC1
admin_staff --> UC2
admin_staff --> UC3
admin_staff --> UC4

admin_manager --> UC5
admin_manager --> UC6
admin_manager --> UC7
admin_manager --> UC8
admin_manager --> UC23

finance --> UC9
finance --> UC10
finance --> UC11
finance --> UC12
finance --> UC13

warehouse --> UC14
warehouse --> UC15
warehouse --> UC16
warehouse --> UC17
warehouse --> UC18
warehouse --> UC19
warehouse --> UC20
warehouse --> UC21
warehouse --> UC23

receiver --> UC22

UC3 .> UC2 : <<extends>>
UC4 ..> UC7 : <<include>>
UC8 ..> UC15 : <<include>>
UC10 ..> UC15 : <<include>>
UC13 ..> UC17 : <<include>>

@enduml
```

## Mermaid Source (GitHub-friendly)

```mermaid
flowchart LR
    %% Actors
    AdminStaff["👤 Admin Staff"]
    AdminManager["👤 Admin Manager"]
    Finance["👤 Finance"]
    Warehouse["👤 Warehouse Officer"]
    Receiver["👤 Receiver"]

    subgraph "AgroFlo System"
        direction TB

        Request["📝 Request Management"]
        Req1["Create Request"]
        Req2["Edit Request"]
        Req3["View Requests"]
        Req4["Route Request"]

        Approval["✅ Approval Workflow"]
        Ap1["Approve Request"]
        Ap2["Reject Request"]
        Ap3["View Pending Queue"]
        Ap4["Check Stock Availability"]

        Invoice["💰 Invoice Management"]
        Inv1["Generate Invoice"]
        Inv2["Release Invoice"]
        Inv3["Decline Invoice"]
        Inv4["View Invoice Status"]
        Inv5["Mark Invoice Paid"]

        Stock["📦 Stock Management"]
        St1["View Stock Records"]
        St2["Book Stock"]
        St3["Release Stock"]
        St4["Auto Update Stock"]
        St5["Low Stock Alerts"]

        Dispatch["🚚 Dispatch"]
        Dsp1["Assign Driver"]
        Dsp2["Record Dispatch"]
        Dsp3["Update Status"]

        Tracking["📍 Tracking & Audit"]
        Track1["Track Delivery"]
        Audit1["View Activity Log"]
    end

    AdminStaff --> Req1
    AdminStaff --> Req2
    AdminStaff --> Req3
    AdminStaff --> Req4

    AdminManager --> Ap1
    AdminManager --> Ap2
    AdminManager --> Ap3
    AdminManager --> Ap4

    Finance --> Inv1
    Finance --> Inv2
    Finance --> Inv3
    Finance --> Inv4
    Finance --> Inv5

    Warehouse --> St1
    Warehouse --> St2
    Warehouse --> St3
    Warehouse --> St4
    Warehouse --> St5
    Warehouse --> Dsp1
    Warehouse --> Dsp2
    Warehouse --> Dsp3

    Receiver --> Track1

    Req2 -. extends .-> Req3
```

## Actor Summary

| Actor | Role | Use Cases |
|-------|------|-----------|
| **Admin Staff** | Creates and routes fertilizer requests | Create, Edit, View, Route |
| **Admin Manager** | Approves/rejects requests, monitors SLA | Approve, Reject, View Queue, Check Stock |
| **Finance** | Manages invoicing and payment | Generate, Release, Decline Invoice; View Status; Mark Paid |
| **Warehouse Officer** | Stock and dispatch operations | View Stock, Book, Release, Assign Driver, Record Dispatch |
| **Receiver** | External party tracking delivery | Track Delivery |

## Use Case Relationships

| Relationship | Use Case A | Use Case B | Type |
|-------------|-----------|-----------|------|
| Edit extends | Edit Request | View Requests | `<<extends>>` |
| Route includes | Route Request | (precondition) | `<<include>>` |
| Approve includes | Approve Request | Check Stock | `<<include>>` |
| Release includes | Release Invoice | Release Stock | `<<include>>` |
| Mark Paid updates | Mark Invoice Paid | Update Stock | `<<include>>` |