import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { TransportRequest, User, UserRole, Invoice, DriverInfo, DriverBid, StockItem, FertilizerItem, StationInfo, Priority } from '@/types';
import { getRequests, createRequest, updateRequestStatusWithAudit } from '@/lib/db/requests';
import { getDrivers, assignDriver, submitDriverBid } from '@/lib/db/drivers';
import { getStock, bookStock, releaseStock, moveToTotal } from '@/lib/db/stock';
import { getInvoices, generateInvoice, markInvoicePaid } from '@/lib/db/invoices';
import { getStations } from '@/lib/db/stations';

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
    const [requests, drivers, stock, invoices, stations] = await Promise.all([
      getRequests(),
      getDrivers(true),
      getStock(),
      getInvoices(),
      getStations(),
    ]);
    console.log('Supabase data loaded:', { requests: requests.length, drivers: drivers.length, stock: stock.length, invoices: invoices.length, stations: stations.length });
    if (requests.length === 0 && drivers.length === 0 && stock.length === 0) {
      console.warn('No data from Supabase - all tables empty!');
    }
    return {
      requests: restoreDates(requests),
      drivers,
      stock,
      stations,
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
  stations: StationInfo[];
  selectedRequestId: string | null;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_REQUESTS'; payload: TransportRequest[] }
  | { type: 'SELECT_REQUEST'; payload: string | null }
  | { type: 'SET_REQUEST_DB_ID'; payload: { requestCode: string; dbId: string } }
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
  | { type: 'APPROVE_INVOICE'; payload: { requestId: string; user: string } }
  | { type: 'RELEASE_INVOICE'; payload: { requestId: string; user: string } }
  | { type: 'DECLINE_INVOICE'; payload: { requestId: string; reason: string; user: string } }
  | { type: 'MARK_INVOICE_PAID'; payload: { requestId: string; user: string } }
  | { type: 'CLEAR_FOR_WAREHOUSE'; payload: { requestId: string; user: string } }
  | { type: 'BOOK_STOCK'; payload: { requestId: string; user: string } }
  | { type: 'START_PREPPING'; payload: { requestId: string; user: string } }
  | { type: 'MARK_PICKED_UP'; payload: { requestId: string; user: string } }
  | { type: 'MARK_DELIVERED'; payload: { requestId: string; user: string } }
  | { type: 'ASSIGN_DRIVER'; payload: { requestId: string; driver: DriverInfo; user: string } }
  | { type: 'ADD_DRIVER_BID'; payload: { requestId: string; bid: DriverBid } }
  | { type: 'UPDATE_STOCK'; payload: StockItem[] }
  | { type: 'UPDATE_DRIVERS'; payload: DriverInfo[] }
  | { type: 'SET_STATIONS'; payload: StationInfo[] }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  currentUser: null,
  requests: [],
  invoices: [],
  drivers: [],
  stock: [],
  stations: [],
  selectedRequestId: null,
  isLoading: false,
  error: null,
};

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

    case 'SET_REQUEST_DB_ID':
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === action.payload.requestCode ? { ...r, dbId: action.payload.dbId } : r
        ),
      };

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

    case 'SET_STATIONS':
      return { ...state, stations: action.payload };

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

      if (!user) {
        console.error('CREATE_NEW_REQUEST: user is required');
        return state;
      }

      // Optimistic UI update with temp ID
      const existingCodes = state.requests.map(r => {
        const match = r.id.match(/REQ-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextCode = Math.max(...existingCodes, 0) + 1;
      const slaDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const optimisticRequest: TransportRequest = {
        id: `REQ-${String(nextCode).padStart(5, '0')}`,
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
            details: `Request REQ-${String(nextCode).padStart(5, '0')} created for ${station.name}`,
          },
        ],
      };

      // DB write - persist to Supabase
      createRequest(
        station.id,
        destination,
        priority,
        user,
        items.map(i => ({ sku: i.sku, quantity: i.quantity, unitCost: i.unitCost, tax: i.tax, total: i.total, name: i.name, type: i.type }))
      ).then(res => {
        if (res?.request && pendingRequestCallback) {
          pendingRequestCallback(res.request.request_code, res.request.id);
        }
      }).catch(err => console.error('Failed to create request in DB:', err));

      return {
        ...state,
        requests: [optimisticRequest, ...state.requests],
      };
    }

    case 'APPROVE_REQUEST': {
      const { requestId, user } = action.payload;
      const request = state.requests.find(r => r.id === requestId);
      if (!request) return state;

      bookStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity }))).catch(err => console.error('Failed to book stock:', err));

      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity * 50 / 1000;
          return {
            ...stockItem,
            available: Math.max(0, stockItem.available - qtyMT),
            booked: stockItem.booked + qtyMT,
          };
        }
        return stockItem;
      });

      if (request.dbId) {
        updateRequestStatusWithAudit(request.dbId, 'pending_finance', user, 'admin_manager', 'APPROVED', 'Request approved and stock released');
      }

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
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'declined', user, 'admin_manager', 'DECLINED', `Declined: ${reason}`);
      }
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

      const subtotal = request.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
      const taxTotal = request.items.reduce((sum, item) => sum + item.tax, 0);
      const grandTotal = subtotal + taxTotal;

      if (request.dbId) {
        const userId = state.currentUser?.id || '';
        generateInvoice(request.dbId, userId, request.items, subtotal, taxTotal, grandTotal).catch(err =>
          console.error('Failed to generate invoice in DB:', err)
        );
      }

      const newInvoice: Invoice = {
        id: `INV-${requestId.split('-')[1]}`,
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
              invoiceId: newInvoice.id,
              invoiceGeneratedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_GENERATED', `Invoice ${newInvoice.id} generated`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'APPROVE_INVOICE': {
      const { requestId, user } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'approved', user, 'finance', 'INVOICE_APPROVED', 'Invoice approved and awaiting payment');
      }
      return {
        ...state,
        invoices: state.invoices.map(inv => {
          if (inv.requestId === requestId) {
            return {
              ...inv,
              status: 'approved',
            };
          }
          return inv;
        }),
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'approved',
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_APPROVED', 'Invoice approved and awaiting payment'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'RELEASE_INVOICE': {
      const { requestId, user } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'cleared', user, 'finance', 'INVOICE_RELEASED', 'Invoice released and cleared for warehouse dispatch');
      }
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
              status: 'cleared',
              clearedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'finance', 'INVOICE_RELEASED', 'Invoice released and cleared for warehouse dispatch'),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'DECLINE_INVOICE': {
      const { requestId, reason, user } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'invoice_declined', user, 'finance', 'INVOICE_DECLINED', `Invoice declined: ${reason}`);
      }
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
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        const invoice = state.invoices.find(inv => inv.requestId === requestId);
        if (invoice?.id) {
          markInvoicePaid(invoice.id, invoice.paymentMethod || 'cash').catch(err =>
            console.error('Failed to mark invoice paid in DB:', err)
          );
        }
      }
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
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'booking_stock', user, 'warehouse', 'ACCEPTED', 'Request accepted by warehouse - ready for booking');
      }
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'booking_stock',
              clearedAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'ACCEPTED', 'Request accepted by warehouse'),
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

      // Update stock in database
      bookStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity }))).catch(err =>
        console.error('Failed to update stock in DB:', err)
      );

      if (request.dbId) {
        updateRequestStatusWithAudit(request.dbId, 'prepping', user, 'warehouse', 'STOCK_BOOKED', 'Stock reserved for order and ready for prepping');
      }

      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'prepping',
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

      // Update stock in database
      releaseStock(request.items.map(i => ({ sku: i.sku, quantity: i.quantity }))).catch(err =>
        console.error('Failed to update stock in DB:', err)
      );

      if (request.dbId) {
        updateRequestStatusWithAudit(request.dbId, 'prepping', user, 'warehouse', 'PREPPING', 'Order being prepared for shipment');
      }

      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity * 50 / 1000;
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

      if (request.dbId) {
        updateRequestStatusWithAudit(request.dbId, 'order_picked_up', user, 'warehouse', 'ORDER_PICKED_UP', 'Driver picked up the order');
        moveToTotal(request.items.map(i => ({ sku: i.sku, quantity: i.quantity }))).catch(err =>
          console.error('Failed to update stock in DB:', err)
        );
      }

      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity * 50 / 1000;
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

    case 'MARK_DELIVERED': {
      const { requestId, user } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'delivered', user, 'warehouse', 'DELIVERED', 'Order delivered to destination');
      }
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'delivered',
              deliveredAt: new Date(),
              auditLog: [
                ...r.auditLog,
                createAuditLog(user, 'warehouse', 'DELIVERED', `Order delivered to ${r.station.name}`),
              ],
            };
          }
          return r;
        }),
      };
    }

    case 'ASSIGN_DRIVER': {
      const { requestId, driver, user } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        updateRequestStatusWithAudit(req.dbId, 'driver_assigned', user, 'warehouse', 'DRIVER_ASSIGNED', `Driver ${driver.name} assigned`);
        assignDriver(req.dbId, driver.id, user).catch(err =>
          console.error('Failed to assign driver in DB:', err)
        );
      }
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
      const req = state.requests.find(r => r.id === requestId);
      if (req?.dbId) {
        submitDriverBid(req.dbId, bid.driverId, bid.driverName, bid.bidAmount, bid.estimatedTime, bid.distance).catch(err =>
          console.error('Failed to submit driver bid:', err)
        );
      }
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
  onRequestCreated?: (requestCode: string, dbId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let pendingRequestCallback: ((requestCode: string, dbId: string) => void) | null = null;

export function setOnRequestCreatedCallback(cb: (requestCode: string, dbId: string) => void) {
  pendingRequestCallback = cb;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    pendingRequestCallback = (requestCode: string, dbId: string) => {
      dispatch({ type: 'SET_REQUEST_DB_ID', payload: { requestCode, dbId } });
    };
    return () => { pendingRequestCallback = null; };
  }, [dispatch]);

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
        if (dbData.stations?.length) {
          dispatch({ type: 'SET_STATIONS', payload: dbData.stations });
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

export function useStations() {
  const { state } = useAppStore();
  return state.stations;
}
