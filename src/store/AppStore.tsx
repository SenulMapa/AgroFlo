import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { TransportRequest, User, UserRole, Invoice, DriverInfo, DriverBid, StockItem, FertilizerItem, StationInfo, Priority } from '@/types';
import { generateMockRequests, mockDrivers, mockStock } from '@/data/mockData';
import { getRequests } from '@/lib/db/requests';
import { getDrivers } from '@/lib/db/drivers';
import { getStock } from '@/lib/db/stock';
import { getInvoices } from '@/lib/db/invoices';

const STORAGE_KEY = 'agriflo_state';

async function loadFromDB(): Promise<Partial<AppState>> {
  try {
    const [requests, drivers, stock, invoices] = await Promise.all([
      getRequests(),
      getDrivers(true),
      getStock(),
      getInvoices(),
    ]);
    return { requests, drivers, stock, invoices } as Partial<AppState>;
  } catch (e) {
    console.warn('Failed to load from DB:', e);
    return {};
  }
}

function loadFromStorage(): AppState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects
      parsed.requests = parsed.requests.map((r: TransportRequest) => ({
        ...r,
        date: new Date(r.date),
        slaDeadline: new Date(r.slaDeadline),
        clearedAt: r.clearedAt ? new Date(r.clearedAt) : undefined,
        invoiceGeneratedAt: r.invoiceGeneratedAt ? new Date(r.invoiceGeneratedAt) : undefined,
        stockBookedAt: r.stockBookedAt ? new Date(r.stockBookedAt) : undefined,
        driverAssignedAt: r.driverAssignedAt ? new Date(r.driverAssignedAt) : undefined,
        pickedUpAt: r.pickedUpAt ? new Date(r.pickedUpAt) : undefined,
        deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
        auditLog: r.auditLog.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })),
      }));
      parsed.invoices = parsed.invoices.map((inv: Invoice) => ({
        ...inv,
        generatedAt: new Date(inv.generatedAt),
      }));
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
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
  | { type: 'CREATE_NEW_REQUEST'; payload: { station: StationInfo; items: FertilizerItem[]; priority: Priority; destination: string; orderCreatedDate: Date; user: string } }
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
  | { type: 'CLEAR_FOR_WAREHOUSE'; payload: { requestId: string; user: string } }
  | { type: 'BOOK_STOCK'; payload: { requestId: string; user: string } }
  | { type: 'START_PREPPING'; payload: { requestId: string; user: string } }
  | { type: 'MARK_PICKED_UP'; payload: { requestId: string; user: string } }
  | { type: 'ASSIGN_DRIVER'; payload: { requestId: string; driver: DriverInfo; user: string } }
  | { type: 'ADD_DRIVER_BID'; payload: { requestId: string; bid: DriverBid } }
  | { type: 'UPDATE_STOCK'; payload: StockItem[] }
  | { type: 'UPDATE_DRIVERS'; payload: DriverInfo[] }
  | { type: 'LOGOUT' };

const initialState: AppState = (() => {
  const stored = loadFromStorage();
  if (stored) {
    return { ...stored, currentUser: null, selectedRequestId: null, isLoading: false, error: null };
  }
  return {
    currentUser: null,
    requests: generateMockRequests(),
    invoices: [],
    drivers: mockDrivers,
    stock: mockStock,
    selectedRequestId: null,
    isLoading: false,
    error: null,
  };
})();

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
      const { station, items, priority, destination, orderCreatedDate, user } = action.payload;
      const nextId = 8900 + state.requests.length;
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

    case 'CLEAR_FOR_WAREHOUSE': {
      const { requestId, user } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'released',
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

      // Update stock: move from available to booked
      const updatedStock = state.stock.map(stockItem => {
        const requestItem = request.items.find(ri => ri.sku === stockItem.sku);
        if (requestItem) {
          const qtyMT = requestItem.quantity / 20; // Convert bags to metric tons (approx)
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

      return {
        ...state,
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
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load from Supabase on mount
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

  // Save to localStorage as backup
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

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
