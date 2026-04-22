// AgriFlo - Agricultural Fertilizer Logistics System

export type UserRole = 'admin_staff' | 'admin_manager' | 'finance' | 'warehouse' | 'receiver' | 'inventory_manager' | null;

export const SLA_HOURS = 72;

export type RequestStatus =
  | 'new'                  // Admin staff receives from station
  | 'pending_admin_manager' // Sent to admin manager for approval
  | 'approved'             // Admin manager approved
  | 'declined'             // Declined with reason
  | 'pending_finance'      // Sent to finance
  | 'invoiced'             // Invoice generated
  | 'invoice_declined'     // Invoice declined by finance
  | 'paid'                // Payment confirmed (manual process)
  | 'released'             // Finance released to warehouse
  | 'cleared'              // Cleared for warehouse processing
  | 'booking_stock'        // Warehouse booking stock
  | 'prepping'             // Stock being prepared/loaded
  | 'driver_assigned'      // Driver assigned to route
  | 'order_picked_up'      // Driver picked up the order
  | 'delivered';          // Order delivered to receiver

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface StationInfo {
  id: string;
  stationCode: string;
  name: string;
  location: string;
  district: string;
  contactPerson: string;
  phone: string;
}

export interface FertilizerItem {
  sku: string;
  name: string;           // e.g., "Urea 46-0-0", "DAP 18-46-0"
  type: string;           // e.g., "Urea", "DAP", "MOP", "NPK"
  quantity: number;       // in metric tons or bags
  unitCost: number;
  tax: number;
  total: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

export interface DriverBid {
  driverId: string;
  driverName: string;
  bidAmount: number;
  estimatedTime: number;  // hours
  distance: number;       // km
  timestamp: Date;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;    // e.g., "10-Wheeler", "6-Wheeler", "Trailer"
  licensePlate: string;
  capacity: number;       // metric tons
  rating: number;
  location: {
    lat: number;
    lng: number;
    district: string;
  };
  isAvailable: boolean;
}

export interface TransportRequest {
  id: string;
  dbId?: string; // Actual Supabase UUID for DB operations
  date: Date;
  orderCreatedDate?: Date;
  origin: string;
  status: RequestStatus;
  priority: Priority;
  station: StationInfo;
  destination: string;
  items: FertilizerItem[];
  slaDeadline: Date;
  createdByUser?: string;
  createdByUserId?: string;
  assignedTo?: string;
  assignedDriver?: DriverInfo;
  driverAssignedAt?: Date;
  auditLog: AuditLogEntry[];
  declineReason?: string;
  invoiceId?: string;
  invoiceGeneratedAt?: Date;
  clearedAt?: Date;
  releasedAt?: Date;
  warehouseNotes?: string;
  stockBookedAt?: Date;
  driverBids?: DriverBid[];
  pickedUpAt?: Date;
  deliveredAt?: Date;
  lastNotifiedAt?: Date;
  route?: {
    from: string;
    to: string;
    distance: number;
  };
}

export type InvoiceStatus = 'generated' | 'approved' | 'released' | 'declined' | 'paid';

export interface Invoice {
  id: string;
  requestId: string;
  generatedAt: Date;
  items: FertilizerItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  releasedAt?: Date;
  paymentMethod?: 'cash' | 'credit' | 'account';
  paidAt?: Date;
  declineReason?: string;
}

export function isRequestOverdue(request: TransportRequest): boolean {
  const finalStatuses = ['delivered'];
  if (finalStatuses.includes(request.status)) return false;
  
  const createdDate = new Date(request.date);
  const deadline = new Date(createdDate.getTime() + (SLA_HOURS * 60 * 60 * 1000));
  return new Date() > deadline;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface FilterState {
  district: string;
  priority: Priority | 'all';
  status: RequestStatus | 'all';
  searchQuery: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingSigning: number;
  pendingFinance: number;
  clearedToday: number;
  avgProcessingTime: number;
}

// Simple IMS (Inventory Management System) types
export interface StockItem {
  sku: string;
  name: string;
  type: string;
  available: number;    // Available stock (metric tons)
  booked: number;       // Temporarily held (booked)
  prepping: number;     // Being loaded
  total: number;        // Total in warehouse
}
