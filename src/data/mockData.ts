import type { TransportRequest, User, DriverInfo, Invoice, StockItem } from '@/types';

export const mockUsers: User[] = [
  { id: '1', employeeId: 'ADM001', name: 'Kasun Perera', role: 'admin_staff' },
  { id: '2', employeeId: 'MGR001', name: 'Nimal Fernando', role: 'admin_manager' },
  { id: '3', employeeId: 'FIN001', name: 'Dilani Silva', role: 'finance' },
  { id: '4', employeeId: 'WAR001', name: 'Ruwan Kumara', role: 'warehouse' },
  { id: '5', employeeId: 'RCV001', name: 'Gamage Dissanayake', role: 'receiver' },
];

export const mockDrivers: DriverInfo[] = [
  { id: 'd1', name: 'Sunil Wijesinghe', phone: '+94 77 123 4567', vehicleType: '10-Wheeler', licensePlate: 'CBA-3421', capacity: 20, rating: 4.8, location: { lat: 6.9271, lng: 79.8612, district: 'Colombo' }, isAvailable: true },
  { id: 'd2', name: 'Mahinda Rathnayake', phone: '+94 77 234 5678', vehicleType: '6-Wheeler', licensePlate: 'CBB-7823', capacity: 10, rating: 4.9, location: { lat: 7.2906, lng: 80.6337, district: 'Kandy' }, isAvailable: true },
  { id: 'd3', name: 'Pradeep Silva', phone: '+94 77 345 6789', vehicleType: '10-Wheeler', licensePlate: 'CBA-9934', capacity: 20, rating: 4.7, location: { lat: 6.0329, lng: 80.2168, district: 'Galle' }, isAvailable: true },
  { id: 'd4', name: 'Chamara Bandara', phone: '+94 77 456 7890', vehicleType: 'Trailer', licensePlate: 'CBA-2156', capacity: 30, rating: 4.6, location: { lat: 8.4855, lng: 80.3920, district: 'Jaffna' }, isAvailable: false },
  { id: 'd5', name: 'Nuwan Dissanayake', phone: '+94 77 567 8901', vehicleType: '6-Wheeler', licensePlate: 'CBB-6678', capacity: 10, rating: 4.9, location: { lat: 7.8731, lng: 80.7718, district: 'Matale' }, isAvailable: true },
  { id: 'd6', name: 'Ajith Gunawardena', phone: '+94 77 678 9012', vehicleType: '10-Wheeler', licensePlate: 'CBA-1122', capacity: 20, rating: 4.5, location: { lat: 6.7251, lng: 79.9420, district: 'Kalutara' }, isAvailable: true },
  { id: 'd7', name: 'Roshan Perera', phone: '+94 77 789 0123', vehicleType: '6-Wheeler', licensePlate: 'CBB-3344', capacity: 10, rating: 4.8, location: { lat: 7.0740, lng: 79.9167, district: 'Gampaha' }, isAvailable: true },
  { id: 'd8', name: 'Lalith Jayasinghe', phone: '+94 77 890 1234', vehicleType: 'Trailer', licensePlate: 'CBA-5566', capacity: 30, rating: 4.7, location: { lat: 6.7350, lng: 79.8900, district: 'Panadura' }, isAvailable: true },
];

export const mockStock: StockItem[] = [
  { sku: 'FER-UREA-50', name: 'Urea (46-0-0) - 50kg bag', type: 'Urea', available: 450, booked: 50, prepping: 20, total: 520 },
  { sku: 'FER-DAP-50', name: 'DAP (18-46-0) - 50kg bag', type: 'DAP', available: 280, booked: 30, prepping: 10, total: 320 },
  { sku: 'FER-MOP-50', name: 'MOP (0-0-60) - 50kg bag', type: 'MOP', available: 180, booked: 20, prepping: 5, total: 205 },
  { sku: 'FER-NPK-50', name: 'NPK (15-15-15) - 50kg bag', type: 'NPK', available: 350, booked: 40, prepping: 15, total: 405 },
  { sku: 'FER-TSP-50', name: 'TSP (0-46-0) - 50kg bag', type: 'TSP', available: 120, booked: 10, prepping: 0, total: 130 },
  { sku: 'FER-SUL-50', name: 'Sulphur (90%) - 50kg bag', type: 'Sulphur', available: 90, booked: 5, prepping: 0, total: 95 },
];

const createAuditLog = (user: string, role: string, action: string, details: string) => ({
  id: Math.random().toString(36).substr(2, 9),
  timestamp: new Date(),
  user,
  role: role as any,
  action,
  details,
});

export const generateMockRequests = (): TransportRequest[] => {
  const districts = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Matale', 'Kalutara', 'Gampaha', 'Kurunegala'];
  const origins = ['Station Portal', 'Phone', 'Email'];
  const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

  const stationNames = [
    'Colombo Central Station', 'Kandy District Office', 'Galle Regional Hub',
    'Jaffna Branch', 'Matale Supply Point', 'Kalutara Distribution Center',
    'Gampaha Station', 'Kurunegala Depot'
  ];

  const destinations = [
    'Anuradhapura Farming Coop', 'Polonnaruwa Agri Center', 'Hambantota Rice Mill',
    'Badulla Plantation Supply', 'Ratnapura Agri Depot', 'Moneragala Farm Store',
    'Ampara Irrigation Project', 'Trincomalee Harbor Storage'
  ];

  const fertilizerDatabase = [
    { sku: 'FER-UREA-50', name: 'Urea (46-0-0) - 50kg bag', type: 'Urea', unitCost: 4500 },
    { sku: 'FER-DAP-50', name: 'DAP (18-46-0) - 50kg bag', type: 'DAP', unitCost: 8200 },
    { sku: 'FER-MOP-50', name: 'MOP (0-0-60) - 50kg bag', type: 'MOP', unitCost: 6800 },
    { sku: 'FER-NPK-50', name: 'NPK (15-15-15) - 50kg bag', type: 'NPK', unitCost: 7500 },
    { sku: 'FER-TSP-50', name: 'TSP (0-46-0) - 50kg bag', type: 'TSP', unitCost: 5200 },
    { sku: 'FER-SUL-50', name: 'Sulphur (90%) - 50kg bag', type: 'Sulphur', unitCost: 3200 },
  ];

  const requests: TransportRequest[] = [];

  for (let i = 0; i < 25; i++) {
    const id = `REQ-${8800 + i}`;
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 72));

    const slaDeadline = new Date(date);
    slaDeadline.setHours(slaDeadline.getHours() + 24 + Math.floor(Math.random() * 48));

    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const ferItem = fertilizerDatabase[Math.floor(Math.random() * fertilizerDatabase.length)];
      const quantity = Math.floor(Math.random() * 100) + 10;
      const itemTotal = ferItem.unitCost * quantity;
      const tax = itemTotal * 0.05;
      subtotal += itemTotal + tax;

      items.push({
        sku: ferItem.sku,
        name: ferItem.name,
        type: ferItem.type,
        quantity,
        unitCost: ferItem.unitCost,
        tax,
        total: itemTotal + tax,
      });
    }

    const statusPool: TransportRequest['status'][] = ['new', 'pending_admin_manager', 'approved', 'pending_finance', 'invoiced', 'paid', 'released', 'booking_stock', 'prepping', 'driver_assigned', 'order_picked_up', 'delivered'];
    const status = statusPool[Math.floor(Math.random() * statusPool.length)];

    const stationIdx = Math.floor(Math.random() * stationNames.length);
    const auditLog = [createAuditLog('System', 'system', 'REQUEST_CREATED', `Request ${id} created via ${origins[Math.floor(Math.random() * origins.length)]} from ${stationNames[stationIdx]}`)];

    if (status !== 'new') {
      auditLog.push(createAuditLog('Kasun Perera', 'admin_staff', 'ROUTED', 'Routed to Admin Manager'));
    }

    if (['approved', 'pending_finance', 'invoiced', 'paid', 'released', 'booking_stock', 'prepping', 'driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Nimal Fernando', 'admin_manager', 'APPROVED', 'Request approved and stock released'));
    }

    if (['invoiced', 'paid', 'released', 'booking_stock', 'prepping', 'driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Dilani Silva', 'finance', 'INVOICE_GENERATED', `Invoice INV-${8800 + i} generated`));
    }

    if (['paid', 'released', 'booking_stock', 'prepping', 'driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Dilani Silva', 'finance', 'INVOICE_RELEASED', 'Invoice released to warehouse'));
    }

    if (['booking_stock', 'prepping', 'driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Ruwan Kumara', 'warehouse', 'STOCK_BOOKED', 'Stock reserved for order'));
    }

    if (['prepping', 'driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Ruwan Kumara', 'warehouse', 'PREPPING', 'Order being prepared for shipment'));
    }

    if (['driver_assigned', 'order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Ruwan Kumara', 'warehouse', 'DRIVER_ASSIGNED', 'Driver assigned to order'));
    }

    if (['order_picked_up', 'delivered'].includes(status)) {
      auditLog.push(createAuditLog('Ruwan Kumara', 'warehouse', 'ORDER_PICKED_UP', 'Driver picked up the order'));
    }

    if (status === 'delivered') {
      auditLog.push(createAuditLog('System', 'system', 'DELIVERED', 'Order delivered to receiver'));
    }

    const fromDistrict = districts[stationIdx];
    const toDistrict = destinations[Math.floor(Math.random() * destinations.length)];

    requests.push({
      id,
      date,
      origin: origins[Math.floor(Math.random() * origins.length)],
      status,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      station: {
        id: `STN-${1000 + stationIdx}`,
        name: stationNames[stationIdx],
        location: fromDistrict,
        district: fromDistrict,
        contactPerson: `Station Manager ${stationIdx + 1}`,
        phone: `+94 11 ${2000 + stationIdx}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      },
      destination: toDistrict,
      items,
      slaDeadline,
      auditLog,
      invoiceId: status !== 'new' && status !== 'pending_admin_manager' ? `INV-${8800 + i}` : undefined,
      route: {
        from: fromDistrict,
        to: toDistrict,
        distance: Math.floor(Math.random() * 300) + 50,
      },
    });
  }

  return requests.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const mockInvoices: Invoice[] = [
  {
    id: 'INV-8892',
    requestId: 'REQ-8892',
    generatedAt: new Date(),
    items: [
      { sku: 'FER-UREA-50', name: 'Urea (46-0-0) - 50kg bag', type: 'Urea', quantity: 50, unitCost: 4500, tax: 11250, total: 236250 },
      { sku: 'FER-DAP-50', name: 'DAP (18-46-0) - 50kg bag', type: 'DAP', quantity: 30, unitCost: 8200, tax: 12300, total: 258300 },
    ],
    subtotal: 471000,
    taxTotal: 23550,
    grandTotal: 494550,
    status: 'released',
  },
];

export const credentials: Record<string, { employeeId: string; password: string }> = {
  admin_staff: { employeeId: 'ADM001', password: 'fdms123' },
  admin_manager: { employeeId: 'MGR001', password: 'fdms123' },
  finance: { employeeId: 'FIN001', password: 'fdms123' },
  warehouse: { employeeId: 'WAR001', password: 'fdms123' },
  receiver: { employeeId: 'RCV001', password: 'fdms123' },
};
