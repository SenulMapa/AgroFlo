import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { TransportRequest, User, UserRole, Invoice, DriverInfo, DriverBid, StockItem, FertilizerItem, StationInfo, Priority } from '@/types';
import { getRequests, createRequest, updateRequest, updateRequestItems, updateRequestStatus } from '@/lib/db/requests';
import { getDrivers } from '@/lib/db/drivers';
import { getStock, bookStock, startPreppingStock, completePickupStock } from '@/lib/db/stock';
import { getInvoices } from '@/lib/db/invoices';
import { toast } from 'sonner';

function restoreDates<T extends { date?: string | Date; slaDeadline?: string | Date; clearedAt?: string | Date; invoiceGeneratedAt?: string | Date; stockBookedAt?: string | Date; driverAssignedAt?: string | Date; pickedUpAt?: string | Date; deliveredAt?: string | Date; generatedAt?: string | Date; releasedAt?: string | Date; paidAt?: string | Date; auditLog?: { timestamp: string | Date }[] }>(data: T[]): T[] {
  return data.map((item) => {
    const restored = { ...item } as T;
    if ('date' in restored && restored.date) restored.date = new Date(restored.date as string);
    if ('slaDeadline' in restored && restored.slaDeadline) restored.slaDeadline = new Date(restored.slaDeadline as string);
    if ('clearedAt' in restored && restored.clearedAt) restored.clearedAt = new Date(restored.clearedAt as string);
    if ('invoiceGeneratedAt' in restored && restored.invoiceGeneratedAt) restored.invoiceGeneratedAt = new Date(restored.invoiceGeneratedAt as string);
    if ('stockBookedAt' in restored && restored.stockBookedAt) restored.stockBookedAt = new Date(restored.stockBookedAt as string);
    if ('driverAssignedAt' in restored && restored.driverAssignedAt) restored.driverAssignedAt = new Date(restored.driverAssignedAt as string);
    if ('pickedUpAt' in restored && restored.pickedUpAt) restored.pickedUpAt = new Date(restored.pickedUpAt as string);
    if ('deliveredAt' in restored && restored.deliveredAt) restored.deliveredAt = new Date(restored.deliveredAt as string);
    if ('generatedAt' in restored && restored.generatedAt) restored.generatedAt = new Date(restored.generatedAt as string);
    if ('releasedAt' in restored && restored.releasedAt) restored.releasedAt = new Date(restored.releasedAt as string);
    if ('paidAt' in restored && restored.paidAt) restored.paidAt = new Date(restored.paidAt as string);
    if ('auditLog' in restored && restored.auditLog?.length) {
      restored.auditLog = restored.auditLog.map((a) => ({ ...a, timestamp: new Date(a.timestamp as string) }));
    }
    return restored;
  });
}

async function loadFromDB(): Promise<Partial<AppState>> {
  try {
    console.log('Loading data from Supabase...');
    const [requests, drivers, stock, invoices] = await Promise.all([
      getRequests(),
      getDrivers(true),
      getStock(),
      getInvoices(),
    ]);
    console.log('Supabase data loaded:', { requests: requests.length, drivers: drivers.length, stock: stock.length, invoices: invoices.length });
    if (requests.length === 0 && drivers.length === 0 && stock.length === 0) {
      console.warn('No data from Supabase - all tables empty!');
    }
    return {
      requests: restoreDates(requests),
      drivers,
      stock,
      invoices: restoreDates(invoices),
    } as Partial<AppState>;
  } catch (e) {
    console.error('Failed to load from Supabase DB:', e);
    return {};
  }
}

interface AppState {
  currentUser: User | null;
  requests: TransportRequest[];
  invoices: Invoice[];
  drivers: DriverInfo[];
  stock: StockItem[];
  selectedRequestId: string | null;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_REQUESTS'; payload: TransportRequest[] }
  | { type: 'SELECT_REQUEST'; payload: string | null }
  | { type: 'UPDATE_REQUEST'; payload: TransportRequest }
  | { type: 'ADD_REQUEST'; payload: TransportRequest }
  | { type: 'CREATE_NEW_REQUEST'; payload: { station: StationInfo; items: FertilizerItem[]; priority: Priority; destination?: string; orderCreatedDate: Date; user: string } }
  | { type: 'EDIT_REQUEST'; payload: { requestId: string; station: StationInfo; items: FertilizerItem[]; priority: Priority; user: string } }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'SET_INVOICES'; payload: Invoice[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ROUTE_REQUEST'; payload: { requestId: string; newStatus: TransportRequest['status']; user: string; role: UserRole } }
  | { type: 'APPROVE_REQUEST'; payload: { requestId: string; user: string } }
  | { type: 'DECLINE_REQUEST'; payload: { requestId: string; reason: string; user: string } }
  | { type: 'GENERATE_INVOICE'; payload: { requestId: string; user: string } }
  | { type: 'RELEASE_INVOICE'; payload: { requestId: string; user: string } }
  | { type: 'DECLINE_INVOICE'; payload: { requestId: string; reason: string; user: string } }
  | { type: 'MARK_INVOICE_PAID'; payload: { requestId: string; user: string } }
  | { type: 'CLEAR_FOR_WAREHOUSE'; payload: { requestId: string; user: string } }
  | { type: 'BOOK_STOCK'; payload: { requestId: string; user: string } }
  | { type: 'START_PREPPING'; payload: { requestId: string; user: string } }
  | { type: 'MARK_PICKED_UP'; payload: { requestId: string; user: string } }
  | { type: 'ASSIGN_DRIVER'; payload: { requestId: string; driver: DriverInfo; user: string } }
  | { type: 'ADD_DRIVER_BID'; payload: { requestId: string; bid: DriverBid } }
  | { type: 'UPDATE_STOCK'; payload: StockItem[] }
  | { type: 'UPDATE_DRIVERS'; payload: DriverInfo[] }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  currentUser: null,
  requests: [],
  invoices: [],
  drivers: [],
  stock: [],
  selectedRequestId: null,
  isLoading: false,
  error: null,
};

async function handleCreateNewRequest(
  payload: { station: StationInfo; items: FertilizerItem[]; priority: Priority; destination?: string; orderCreatedDate: Date; user: string },
  dispatch: React.Dispatch<AppAction>
) {
  const { station, items, priority, destination, orderCreatedDate, user } = payload;
  
  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + 72);

  const dbResult = await createRequest(
    station.id,
    user,
    destination || '',
    priority,
    items.map(i => ({
      sku: i.sku,
      quantity: i.quantity,
      unitCost: i.unitCost,
      tax: i.tax,
      total: i.total,
      name: i.name,
      type: i.type,
    })),
    orderCreatedDate.toISOString(),
    slaDeadline.toISOString()
  );

  if (dbResult.error) {
    toast.error('Failed to save request to database', { description: dbResult.error.message });
    return;
  }

  dispatch({ type: 'CREATE_NEW_REQUEST', payload });
}

async function handleEditRequest(
  payload: { requestId: string; station: StationInfo; items: FertilizerItem[]; priority: Priority; user: string },
  dispatch: React.Dispatch<AppAction>
) {
  const { requestId, station, items, priority, user } = payload;

  await updateRequest(requestId, {
    station_id: station.id,
    priority,
  });

  await updateRequestItems(requestId, items.map(i => ({
    sku: i.sku,
    quantity: i.quantity,
    unitCost: i.unitCost,
    tax: i.tax,
    total: i.total,
    name: i.name,
    type: i.type,
  })));

  dispatch({ type: 'EDIT_REQUEST', payload });
}

async function handleRouteRequest(
  payload: { requestId: string; newStatus: TransportRequest['status']; user: string; role: UserRole },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const { requestId, newStatus } = payload;
  
  const { error } = await updateRequestStatus(requestId, newStatus);
  
  if (error) {
    toast.error('Failed to route request', { description: error.message });
    return;
  }

  dispatch({ type: 'ROUTE_REQUEST', payload });
}

async function handleApproveRequest(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request) return;

  await bookStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity })));

  await updateRequestStatus(payload.requestId, 'pending_finance');

  dispatch({ type: 'APPROVE_REQUEST', payload });
}

async function handleDeclineRequest(
  payload: { requestId: string; reason: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const { requestId, reason } = payload;

  await updateRequest(requestId, {
    status: 'declined',
    decline_reason: reason,
  });

  dispatch({ type: 'DECLINE_REQUEST', payload });
}

async function handleGenerateInvoice(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request) return;

  const { generateInvoice } = await import('@/lib/db/invoices');
  const subtotal = request.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
  const taxTotal = request.items.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = subtotal + taxTotal;

  const result = await generateInvoice(
    payload.requestId,
    payload.user,
    request.items,
    subtotal,
    taxTotal,
    grandTotal
  );

  if (!result) {
    toast.error('Failed to generate invoice in database');
    return;
  }

  dispatch({ type: 'GENERATE_INVOICE', payload });
}

async function handleReleaseInvoice(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request?.invoiceId) return;

  const { releaseInvoice } = await import('@/lib/db/invoices');
  const result = await releaseInvoice(request.invoiceId, payload.user);

  if (!result) {
    toast.error('Failed to release invoice in database');
    return;
  }

  dispatch({ type: 'RELEASE_INVOICE', payload });
}

async function handleMarkInvoicePaid(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request?.invoiceId) return;

  const { markInvoicePaid } = await import('@/lib/db/invoices');
  const result = await markInvoicePaid(request.invoiceId, 'account');

  if (!result) {
    toast.error('Failed to mark invoice as paid in database');
    return;
  }

  dispatch({ type: 'MARK_INVOICE_PAID', payload });
}

async function handleClearForWarehouse(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const { requestId } = payload;

  await updateRequest(requestId, {
    status: 'cleared',
    cleared_at: new Date().toISOString(),
  });

  dispatch({ type: 'CLEAR_FOR_WAREHOUSE', payload });
}

async function handleBookStock(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request) return;

  await bookStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity })));

  await updateRequest(payload.requestId, {
    status: 'booking_stock',
    stock_booked_at: new Date().toISOString(),
  });

  dispatch({ type: 'BOOK_STOCK', payload });
}

async function handleStartPrepping(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request) return;

  await startPreppingStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity })));

  await updateRequest(payload.requestId, { status: 'prepping' });

  dispatch({ type: 'START_PREPPING', payload });
}

async function handleMarkPickedUp(
  payload: { requestId: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request) return;

  await completePickupStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity })));

  await updateRequest(payload.requestId, {
    status: 'order_picked_up',
    picked_up_at: new Date().toISOString(),
  });

  dispatch({ type: 'MARK_PICKED_UP', payload });
}

async function handleAssignDriver(
  payload: { requestId: string; driver: DriverInfo; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const { assignDriver } = await import('@/lib/db/drivers');
  
  const result = await assignDriver(payload.requestId, payload.driver.id, payload.user);

  if (!result) {
    toast.error('Failed to assign driver in database');
    return;
  }

  dispatch({ type: 'ASSIGN_DRIVER', payload });
}

async function handleDeclineInvoice(
  payload: { requestId: string; reason: string; user: string },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const request = currentState.requests.find(r => r.id === payload.requestId);
  if (!request?.invoiceId) return;

  const { declineInvoice } = await import('@/lib/db/invoices');
  const result = await declineInvoice(request.invoiceId, payload.reason, payload.user);

  if (!result) {
    toast.error('Failed to decline invoice in database');
    return;
  }

  dispatch({ type: 'DECLINE_INVOICE', payload });
}

async function handleAddDriverBid(
  payload: { requestId: string; bid: DriverBid },
  dispatch: React.Dispatch<AppAction>,
  currentState: AppState
)
) {
  const { submitDriverBid } = await import('@/lib/db/drivers');
  
  const result = await submitDriverBid(
    payload.requestId,
    payload.bid.driverId,
    payload.bid.driverName,
    payload.bid.bidAmount,
    payload.bid.estimatedTime * 60,
    payload.bid.distance
  );

  if (!result) {
    toast.error('Failed to submit bid to database');
    return;
  }

  dispatch({ type: 'ADD_DRIVER_BID', payload });
}

const createAuditLog = (user: string, role: UserRole, action: string, details: string) => ({
  id: Math.random().toString(36).substr(2, 9),
  timestamp: new Date(),
  user,
  role,
  action,
  details,
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };

    case 'SET_REQUESTS':
      return { ...state, requests: action.payload };

    case 'SELECT_REQUEST':
      return { ...state, selectedRequestId: action.payload };

    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r => r.id === action.payload.id ? action.payload : r),
      };

    case 'ADD_REQUEST':
      return { ...state, requests: [action.payload, ...state.requests] };

    case 'EDIT_REQUEST': {
      const { requestId, station, items, priority, user } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              station,
              items,
              priority,
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'admin_staff', 'REQUEST_EDITED', `Request edited: ${items.length} item(s)`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload] };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_INVOICES':
      return { ...state, invoices: action.payload };

    case 'UPDATE_DRIVERS':
      return { ...state, drivers: action.payload };

    case 'ROUTE_REQUEST': {
      const { requestId, newStatus, user, role } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: newStatus,
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, role, 'ROUTED', `Routed to ${newStatus.replace('_', ' ')}`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'CREATE_NEW_REQUEST': {
      const { station, items, priority, destination = '', orderCreatedDate, user } = action.payload;
      const existingIds = state.requests.map(r => {
        const match = r.id.match(/REQ-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextId = Math.max(...existingIds, 8899) + 1;
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + 72);

      const newRequest: TransportRequest = {
        id: `REQ-${nextId}`,
        date: new Date(),
        orderCreatedDate,
        origin: 'Station Portal',
        status: 'new',
        priority,
        station,
        destination,
        items,
        slaDeadline,
        createdByUser: user,
        auditLog: [
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            user,
            role: 'admin_staff',
            action: 'REQUEST_CREATED',
            details: `Request ${nextId} created for ${station.name}`,
          },
        ],
      };

      return {
        ...state,
        requests: [newRequest, ...state.requests],
      };
    }

    case 'APPROVE_REQUEST': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      const updatedStock = state.stock.map(stockItem => {
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

      return {
        ...state,
        stock: updatedStock,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'pending_finance',
              releasedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'admin_manager', 'APPROVED', 'Request approved and stock released'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'DECLINE_REQUEST': {
      const { requestId, reason, user } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'declined',
              declineReason: reason,
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'admin_manager', 'DECLINED', `Declined: ${reason}`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'GENERATE_INVOICE': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      const invoiceId = `INV-${requestId.split('-')[1]}`;
      const subtotal = request.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
      const taxTotal = request.items.reduce((sum, item) => sum + item.tax, 0);
      const grandTotal = subtotal + taxTotal;

      const newInvoice: Invoice = {
        id: invoiceId,
        requestId,
        generatedAt: new Date(),
        items: request.items,
        subtotal,
        taxTotal,
        grandTotal,
        status: 'generated',
      };

      return {
        ...state,
        invoices: [...state.invoices, newInvoice],
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'invoiced',
              invoiceId,
              invoiceGeneratedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_GENERATED', `Invoice ${invoiceId} generated`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'RELEASE_INVOICE': {
      const { requestId, user } = action.payload;
      return {
        ...state,
        invoices: state.invoices.map(inv => {
          if (inv.requestId === requestId) {
            return {
              ...inv,
              status: 'released',
              releasedAt: new Date(),
            };
          }
          return inv;
        }),
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'released',
              clearedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_RELEASED', 'Invoice released to warehouse'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'DECLINE_INVOICE': {
      const { requestId, reason, user } = action.payload;
      return {
        ...state,
        invoices: state.invoices.map(inv => {
          if (inv.requestId === requestId) {
            return {
              ...inv,
              status: 'declined',
              declineReason: reason,
            };
          }
          return inv;
        }),
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'invoice_declined',
              declineReason: reason,
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_DECLINED', `Invoice declined: ${reason}`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'MARK_INVOICE_PAID': {
      const { requestId, user } = action.payload;
      return {
        ...state,
        invoices: state.invoices.map(inv => {
          if (inv.requestId === requestId) {
            return {
              ...inv,
              status: 'paid',
              paidAt: new Date(),
            };
          }
          return inv;
        }),
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'paid',
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'PAYMENT_CONFIRMED', 'Payment confirmed'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'CLEAR_FOR_WAREHOUSE': {
      const { requestId, user } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'cleared',
              clearedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'CLEARED', 'Cleared for warehouse processing'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'BOOK_STOCK': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'booking_stock',
              stockBookedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'STOCK_BOOKED', 'Stock reserved for order'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'START_PREPPING': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      // Update stock: move from booked to prepping
      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity / 20;
          return {
            ...stockItem,
            booked: Math.max(0, stockItem.booked - qtyMT),
            prepping: stockItem.prepping + qtyMT,
          };
        }
        return stockItem;
      });

      return {
        ...state,
        stock: updatedStock,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'prepping',
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'PREPPING', 'Order being prepared for shipment'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'MARK_PICKED_UP': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity / 20;
          return {
            ...stockItem,
            prepping: Math.max(0, stockItem.prepping - qtyMT),
            total: Math.max(0, stockItem.total - qtyMT),
          };
        }
        return stockItem;
      });

      return {
        ...state,
        stock: updatedStock,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'order_picked_up',
              pickedUpAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'ORDER_PICKED_UP', 'Driver picked up the order'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'ASSIGN_DRIVER': {
      const { requestId, driver, user } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'driver_assigned',
              assignedDriver: driver,
              driverAssignedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'DRIVER_ASSIGNED', `Driver ${driver.name} assigned`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'ADD_DRIVER_BID': {
      const { requestId, bid } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              driverBids: [...(r.driverBids || []), bid],
            };
          }
          return r;
        }),
      };
    }

    case 'UPDATE_STOCK':
      return { ...state, stock: action.payload };

    case 'LOGOUT':
      return { ...initialState, requests: state.requests };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(appReducer, initialState);

  const dispatch: React.Dispatch<AppAction> = async (action) => {
    rawDispatch(action);

    switch (action.type) {
      case 'CREATE_NEW_REQUEST':
        handleCreateNewRequest(action.payload, rawDispatch, state);
        break;
      case 'EDIT_REQUEST':
        handleEditRequest(action.payload, rawDispatch, state);
        break;
      case 'ROUTE_REQUEST':
        handleRouteRequest(action.payload, rawDispatch, state);
        break;
      case 'APPROVE_REQUEST':
        handleApproveRequest(action.payload, rawDispatch, state);
        break;
      case 'DECLINE_REQUEST':
        handleDeclineRequest(action.payload, rawDispatch, state);
        break;
      case 'GENERATE_INVOICE':
        handleGenerateInvoice(action.payload, rawDispatch, state);
        break;
      case 'RELEASE_INVOICE':
        handleReleaseInvoice(action.payload, rawDispatch, state);
        break;
      case 'DECLINE_INVOICE':
        handleDeclineInvoice(action.payload, rawDispatch, state);
        break;
      case 'MARK_INVOICE_PAID':
        handleMarkInvoicePaid(action.payload, rawDispatch, state);
        break;
      case 'CLEAR_FOR_WAREHOUSE':
        handleClearForWarehouse(action.payload, rawDispatch, state);
        break;
      case 'BOOK_STOCK':
        handleBookStock(action.payload, rawDispatch, state);
        break;
      case 'START_PREPPING':
        handleStartPrepping(action.payload, rawDispatch, state);
        break;
      case 'MARK_PICKED_UP':
        handleMarkPickedUp(action.payload, rawDispatch, state);
        break;
      case 'ASSIGN_DRIVER':
        handleAssignDriver(action.payload, rawDispatch, state);
        break;
      case 'ADD_DRIVER_BID':
        handleAddDriverBid(action.payload, rawDispatch, state);
        break;
    }
  };

  useEffect(() => {
    async function loadData() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const dbData = await loadFromDB();
        if (dbData.requests?.length) {
          dispatch({ type: 'SET_REQUESTS', payload: dbData.requests });
        }
        if (dbData.drivers?.length) {
          dispatch({ type: 'UPDATE_DRIVERS', payload: dbData.drivers });
        }
        if (dbData.stock?.length) {
          dispatch({ type: 'UPDATE_STOCK', payload: dbData.stock });
        }
        if (dbData.invoices?.length) {
          dispatch({ type: 'SET_INVOICES', payload: dbData.invoices });
        }
      } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data from server' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}

// Selector hooks
export function useCurrentUser() {
  const { state } = useAppStore();
  return state.currentUser;
}

export function useRequests() {
  const { state } = useAppStore();
  return state.requests;
}

export function useSelectedRequest() {
  const { state } = useAppStore();
  return state.requests.find(r => r.id === state.selectedRequestId) || null;
}

export function useDrivers() {
  const { state } = useAppStore();
  return state.drivers;
}

export function useInvoices() {
  const { state } = useAppStore();
  return state.invoices;
}

export function useStock() {
  const { state } = useAppStore();
  return state.stock;
}
