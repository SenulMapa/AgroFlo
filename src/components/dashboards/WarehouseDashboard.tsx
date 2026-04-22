import { useState, useMemo } from 'react';
import { useAppStore, useRequests, useSelectedRequest, useDrivers, useInvoices } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import { StatusBadge } from '../shared/StatusBadge';
import { AuditLog } from '../shared/AuditLog';
import { addStock as imsAddStock, removeStock as imsRemoveStock, getProductsWithStock } from '@/lib/db/ims';
import type { StockWithLogs } from '@/lib/db/ims';
import type { DriverInfo } from '@/types';
import { toast } from 'sonner';
import {
  Package, CheckCircle, Truck, User, Phone,
  Star, Loader2, AlertCircle, Box,
  ClipboardCheck, Search, Warehouse,
  Link, MapPinOff, XCircle, ArrowDown, ArrowUp, RotateCcw
} from 'lucide-react';

interface WarehouseDashboardProps {
  onLogout: () => void;
}

export function WarehouseDashboard({ onLogout }: WarehouseDashboardProps) {
  const { state, dispatch } = useAppStore();
  const invoices = useInvoices();
  const requests = useRequests();
  const selectedRequest = useSelectedRequest();
  const drivers = useDrivers();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'drivers' | 'ims'>('orders');

  // IMS Stock In/Out state
  const [imsProducts, setImsProducts] = useState<StockWithLogs[]>([]);
  const [imsStockMode, setImsStockMode] = useState<'view' | 'in' | 'out'>('view');
  const [imsSelectedProduct, setImsSelectedProduct] = useState('');
  const [imsQuantity, setImsQuantity] = useState(0);
  const [imsReason, setImsReason] = useState('');
  const [isImsSubmitting, setIsImsSubmitting] = useState(false);

  const loadImsProducts = async () => {
    const products = await getProductsWithStock();
    setImsProducts(products);
  };

  // Load IMS products when switching to IMS tab
  useMemo(() => {
    if (activeTab === 'ims' && imsProducts.length === 0) {
      loadImsProducts();
    }
  }, [activeTab]);

  const handleImsStockSubmit = async () => {
    if (!imsSelectedProduct || !imsQuantity || !imsReason) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsImsSubmitting(true);
    try {
      const product = imsProducts.find(p => p.fertilizer_id === imsSelectedProduct);
      if (!product) {
        toast.error('Product not found');
        return;
      }
      const user = state.currentUser?.name || 'Warehouse';
      let success = false;
      if (imsStockMode === 'in') {
        success = await imsAddStock(imsSelectedProduct, imsQuantity, imsReason, user);
      } else {
        success = await imsRemoveStock(imsSelectedProduct, imsQuantity, imsReason, user);
      }
      if (success) {
        toast.success(`Stock ${imsStockMode === 'in' ? 'added' : 'removed'} successfully`);
        setImsSelectedProduct('');
        setImsQuantity(0);
        setImsReason('');
        setImsStockMode('view');
        await loadImsProducts();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (e) {
      toast.error('Error updating stock');
    } finally {
      setIsImsSubmitting(false);
    }
  };

  const clearedRequests = useMemo(() => {
    return requests
      .filter(r => r.status === 'paid')  // Only show requests with payment confirmed
      .sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0));
  }, [requests]);

  const bookingStockRequests = useMemo(() => {
    return requests
      .filter(r => r.status === 'booking_stock')
      .sort((a, b) => (b.stockBookedAt?.getTime() || 0) - (a.stockBookedAt?.getTime() || 0));
  }, [requests]);

  const preppingRequests = useMemo(() => {
    return requests
      .filter(r => r.status === 'prepping')
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [requests]);

  const pickedUpRequests = useMemo(() => {
    return requests
      .filter(r => r.status === 'order_picked_up')
      .sort((a, b) => (b.pickedUpAt?.getTime() || 0) - (a.pickedUpAt?.getTime() || 0));
  }, [requests]);

  const stats = useMemo(() => ({
    cleared: clearedRequests.length,
    booking: bookingStockRequests.length,
    prepping: preppingRequests.length,
    pickedUp: pickedUpRequests.length,
  }), [clearedRequests, bookingStockRequests, preppingRequests, pickedUpRequests]);

  const handleSelectRequest = (requestId: string) => {
    dispatch({ type: 'SELECT_REQUEST', payload: requestId });
  };

  const handleMarkPickedUp = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    dispatch({
      type: 'MARK_PICKED_UP',
      payload: {
        requestId: selectedRequest.id,
        user: state.currentUser?.name || 'Warehouse',
      },
    });

    toast.success('Order picked up', {
      description: `Driver ${selectedRequest.assignedDriver?.name} has picked up the order`,
    });

    setIsProcessing(false);
  };

  const handleAssignDriver = async (driver: DriverInfo) => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 400));

    dispatch({
      type: 'ASSIGN_DRIVER',
      payload: {
        requestId: selectedRequest.id,
        driver,
        user: state.currentUser?.name || 'Warehouse',
      },
    });

    setIsProcessing(false);
    setShowDriverModal(false);
  };

  const availableDrivers = drivers.filter(d =>
    d.isAvailable &&
    (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.location.district.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getActionButton = () => {
    if (!selectedRequest) return null;

    switch (selectedRequest.status) {
      case 'released':
      case 'cleared':
      case 'paid':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!selectedRequest) return;
                setIsProcessing(true);
                await new Promise(resolve => setTimeout(resolve, 500));
                dispatch({
                  type: 'CLEAR_FOR_WAREHOUSE',
                  payload: {
                    requestId: selectedRequest.id,
                    user: state.currentUser?.name || 'Warehouse',
                  },
                });
                toast.success('Request accepted', {
                  description: 'Request accepted. Now you can book stock.',
                });
                setIsProcessing(false);
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ACCEPTING...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  ACCEPT
                </>
              )}
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'DECLINE_REQUEST', payload: { requestId: selectedRequest.id, reason: 'Declined by warehouse', user: state.currentUser?.name || 'Warehouse' } });
                toast.error('Request declined', {
                  description: `Request ${selectedRequest.id} has been declined`,
                });
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#dc2626] text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
            >
              <XCircle className="w-4 h-4 mr-1" />
              DENY
            </button>
          </div>
        );
      case 'booking_stock':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!selectedRequest) return;
                setIsProcessing(true);
                dispatch({
                  type: 'BOOK_STOCK',
                  payload: {
                    requestId: selectedRequest.id,
                    user: state.currentUser?.name || 'Warehouse',
                  },
                });
                toast.success('Stock booked', {
                  description: `Stock reserved for ${selectedRequest.id}`,
                });
                setIsProcessing(false);
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  BOOKING...
                </>
              ) : (
                <>
                  <Box className="w-4 h-4 mr-1" />
                  BOOK STOCK
                </>
              )}
            </button>
            <button
              onClick={async () => {
                if (!selectedRequest) return;
                setIsProcessing(true);
                dispatch({
                  type: 'START_PREPPING',
                  payload: {
                    requestId: selectedRequest.id,
                    user: state.currentUser?.name || 'Warehouse',
                  },
                });
                toast.success('Preparing stock', {
                  description: `Stock moved to prepping for ${selectedRequest.id}`,
                });
                setIsProcessing(false);
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#0d9488] text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  PREPARING...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4 mr-1" />
                  PREPARE STOCK
                </>
              )}
            </button>
          </div>
        );
      case 'prepping': {
        const hasDriver = !!selectedRequest.assignedDriver;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDriverModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50 transition-colors rounded"
            >
              <Truck className="w-4 h-4 mr-1" />
              {hasDriver ? 'CHANGE DRIVER' : 'ASSIGN DRIVER'}
            </button>
            {hasDriver && (
              <button
                onClick={handleMarkPickedUp}
                disabled={isProcessing}
                className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#0d9488] text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    PICKING UP...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    ORDER PICKED UP
                  </>
                )}
              </button>
            )}
          </div>
        );
      }
      case 'driver_assigned':
        return (
          <button
            onClick={handleMarkPickedUp}
            disabled={isProcessing}
            className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#0d9488] text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                PICKING UP...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                ORDER PICKED UP
              </>
            )}
          </button>
        );
      case 'order_picked_up':
        return (
          <button
            onClick={async () => {
              if (!selectedRequest) return;
              setIsProcessing(true);
              await new Promise(resolve => setTimeout(resolve, 500));
              dispatch({
                type: 'MARK_DELIVERED',
                payload: {
                  requestId: selectedRequest.id,
                  user: state.currentUser?.name || 'Warehouse',
                },
              });
              toast.success('Order delivered', {
                description: `Order ${selectedRequest.id} has been delivered`,
              });
              setIsProcessing(false);
            }}
            disabled={isProcessing}
            className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                PROCESSING...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                MARK AS DELIVERED
              </>
            )}
          </button>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <Box className="w-4 h-4 text-blue-600" />;
      case 'booking_stock': return <Package className="w-4 h-4 text-orange-600" />;
      case 'prepping': return <ClipboardCheck className="w-4 h-4 text-indigo-600" />;
      case 'driver_assigned': return <Truck className="w-4 h-4 text-purple-600" />;
      case 'order_picked_up': return <CheckCircle className="w-4 h-4 text-teal-600" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Box className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Warehouse & IMS Dashboard" onLogout={onLogout} />

      {/* Stats Bar */}
      <div className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-4 gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded">
            <Box className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.cleared}</div>
            <div className="text-xs text-[#64748b] uppercase">Cleared</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 flex items-center justify-center rounded">
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.booking}</div>
            <div className="text-xs text-[#64748b] uppercase">Booking</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 flex items-center justify-center rounded">
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.prepping}</div>
            <div className="text-xs text-[#64748b] uppercase">Prepping</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-100 flex items-center justify-center rounded">
            <Truck className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.pickedUp}</div>
            <div className="text-xs text-[#64748b] uppercase">Picked Up</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 h-8 px-4 text-xs font-medium border transition-colors rounded ${
              activeTab === 'orders'
                ? 'bg-[#15803d] text-white border-[#15803d] hover:bg-green-800'
                : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            ORDERS
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`inline-flex items-center gap-2 h-8 px-4 text-xs font-medium border transition-colors rounded ${
              activeTab === 'drivers'
                ? 'bg-[#15803d] text-white border-[#15803d] hover:bg-green-800'
                : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-gray-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            DRIVERS
          </button>
          <button
            onClick={() => setActiveTab('ims')}
            className={`inline-flex items-center gap-2 h-8 px-4 text-xs font-medium border transition-colors rounded ${
              activeTab === 'ims'
                ? 'bg-[#15803d] text-white border-[#15803d] hover:bg-green-800'
                : 'bg-white text-[#1e293b] border-[#e2e8f0] hover:bg-gray-50'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            STOCK (IMS)
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
{activeTab === 'ims' ? (
          /* IMS - Stock Management */
          <div className="flex-1 p-4 overflow-auto">
            {imsStockMode === 'view' ? (
              <>
                <div className="bg-white border border-[#e2e8f0] rounded mb-4">
                  <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-[#15803d]" />
                      <span className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
                        Inventory Management System
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImsStockMode('in')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        <ArrowDown className="w-3 h-3" />
                        Stock In
                      </button>
                      <button
                        onClick={() => setImsStockMode('out')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        <ArrowUp className="w-3 h-3" />
                        Stock Out
                      </button>
                      <button
                        onClick={loadImsProducts}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">SKU</th>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Type</th>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Product</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Available (MT)</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Booked (MT)</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Prepping (MT)</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Total (MT)</th>
                          <th className="text-center font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imsProducts.map((item, idx) => {
                          const stockLevel = item.total_qty > 0 ? item.available_qty / item.total_qty : 0;
                          const statusColor = stockLevel > 0.3 ? 'bg-green-100 text-green-800' : stockLevel > 0.1 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';
                          const statusText = stockLevel > 0.3 ? 'In Stock' : stockLevel > 0.1 ? 'Low Stock' : 'Critical';
                          return (
                            <tr key={idx} className="border-b border-[#e2e8f0] hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono text-xs">{item.sku}</td>
                              <td className="py-2 px-3 text-xs">{item.fertilizer_type}</td>
                              <td className="py-2 px-3 text-sm">{item.name}</td>
                              <td className="py-2 px-3 text-right font-mono text-sm text-green-700 font-medium">{item.available_qty?.toFixed(1) || '0'}</td>
                              <td className="py-2 px-3 text-right font-mono text-sm text-orange-700">{item.booked_qty?.toFixed(1) || '0'}</td>
                              <td className="py-2 px-3 text-right font-mono text-sm text-indigo-700">{item.prepping_qty?.toFixed(1) || '0'}</td>
                              <td className="py-2 px-3 text-right font-mono text-sm">{item.total_qty?.toFixed(1) || '0'}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${statusColor}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {imsProducts.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-[#64748b]">No products found</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-[#f1f5f9]">
                        <tr>
                          <td colSpan={3} className="text-right text-xs font-semibold py-2 px-3">TOTALS:</td>
                          <td className="text-right font-mono text-sm font-bold text-green-700 py-2 px-3">{imsProducts.reduce((s, i) => s + (i.available_qty || 0), 0).toFixed(1)}</td>
                          <td className="text-right font-mono text-sm py-2 px-3 text-orange-700">{imsProducts.reduce((s, i) => s + (i.booked_qty || 0), 0).toFixed(1)}</td>
                          <td className="text-right font-mono text-sm py-2 px-3 text-indigo-700">{imsProducts.reduce((s, i) => s + (i.prepping_qty || 0), 0).toFixed(1)}</td>
                          <td className="text-right font-mono text-sm font-bold py-2 px-3">{imsProducts.reduce((s, i) => s + (i.total_qty || 0), 0).toFixed(1)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-[#e2e8f0] rounded max-w-xl mx-auto">
                <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                  <div className="flex items-center gap-2">
                    {imsStockMode === 'in' ? (
                      <ArrowDown className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
                      {imsStockMode === 'in' ? 'Stock In' : 'Stock Out'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setImsStockMode('view');
                      setImsSelectedProduct('');
                      setImsQuantity(0);
                      setImsReason('');
                    }}
                    className="text-[#64748b] hover:text-[#1e293b] text-xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Product *</label>
                    <select
                      value={imsSelectedProduct}
                      onChange={(e) => setImsSelectedProduct(e.target.value)}
                      className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                    >
                      <option value="">Select Product...</option>
                      {imsProducts.map(p => (
                        <option key={p.fertilizer_id} value={p.fertilizer_id}>
                          {p.name} ({p.sku}) - Available: {p.available_qty?.toFixed(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Quantity (MT) *</label>
                    <input
                      type="number"
                      value={imsQuantity}
                      onChange={(e) => setImsQuantity(Number(e.target.value))}
                      min={1}
                      placeholder="Enter quantity"
                      className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Reason *</label>
                    <input
                      type="text"
                      value={imsReason}
                      onChange={(e) => setImsReason(e.target.value)}
                      placeholder={imsStockMode === 'in' ? 'Purchase order, Return, etc.' : 'Dispatch, Damaged, etc.'}
                      className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                    />
                  </div>
                  <button
                    onClick={handleImsStockSubmit}
                    disabled={isImsSubmitting}
                    className={`w-full py-2 text-white text-sm font-medium rounded ${
                      imsStockMode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50`}
                  >
                    {isImsSubmitting ? 'Processing...' : imsStockMode === 'in' ? 'Receive Stock' : 'Dispatch Stock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'drivers' ? (
          /* Driver Pool View */
          <div className="flex-1 p-4 overflow-auto">
            <div className="bg-white border border-[#e2e8f0] rounded">
              <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#15803d]" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
                    Driver Pool - Available for Assignment
                  </span>
                </div>
                <span className="text-xs text-[#64748b]">{drivers.length} drivers</span>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                  <input
                    type="text"
                    placeholder="Search drivers by name, vehicle, or district..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
                <div className="space-y-2">
                  {availableDrivers.length === 0 ? (
                    <div className="text-center py-8 text-[#64748b]">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No available drivers found</p>
                    </div>
                  ) : (
                    availableDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="p-4 border border-[#e2e8f0] hover:border-[#15803d] hover:bg-[#f0fdf4] transition-colors rounded"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#f1f5f9] flex items-center justify-center rounded">
                              <Truck className="w-6 h-6 text-[#64748b]" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#1e293b]">{driver.name}</div>
                              <div className="text-xs text-[#64748b]">
                                {driver.vehicleType} • {driver.licensePlate} • {driver.capacity} MT • {driver.location.district}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-semibold">{driver.rating}</span>
                            </div>
                            <div className="text-xs text-[#64748b]">{driver.phone}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Orders View - Left Sidebar + Right Detail */
          <>
            {/* Left Sidebar - Queues */}
            <div className="w-[25%] border-r border-[#e2e8f0] bg-white flex flex-col">
              {/* Cleared Queue */}
              <div className="flex-1 flex flex-col border-b border-[#e2e8f0]">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Cleared ({clearedRequests.length})
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  {clearedRequests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64748b]">No cleared items</div>
                  ) : (
                    <div className="divide-y divide-[#e2e8f0]">
                      {clearedRequests.map((request) => (
                        <div
                          key={request.id}
                          onClick={() => handleSelectRequest(request.id)}
                          className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                            selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(request.status)}
                            <span className="font-mono text-xs font-semibold">{request.id}</span>
                          </div>
                          <div className="text-xs text-[#64748b]">{request.station.name}</div>
                          <div className="text-xs text-[#64748b]">{request.station.district}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Stock Queue */}
              <div className="flex-1 flex flex-col border-b border-[#e2e8f0]">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Booking Stock ({bookingStockRequests.length})
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  {bookingStockRequests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64748b]">No items booking</div>
                  ) : (
                    <div className="divide-y divide-[#e2e8f0]">
                      {bookingStockRequests.map((request) => (
                        <div
                          key={request.id}
                          onClick={() => handleSelectRequest(request.id)}
                          className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                            selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(request.status)}
                            <span className="font-mono text-xs font-semibold">{request.id}</span>
                          </div>
                          <div className="text-xs text-[#64748b]">{request.station.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Prepping Queue */}
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Prepping ({preppingRequests.length})
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  {preppingRequests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64748b]">No items prepping</div>
                  ) : (
                    <div className="divide-y divide-[#e2e8f0]">
                      {preppingRequests.map((request) => (
                        <div
                          key={request.id}
                          onClick={() => handleSelectRequest(request.id)}
                          className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                            selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(request.status)}
                            <span className="font-mono text-xs font-semibold">{request.id}</span>
                          </div>
                          <div className="text-xs text-[#64748b]">{request.station.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Pane - Detail View */}
            <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-auto p-4">
              {!selectedRequest ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-[#e2e8f0] mx-auto mb-3" />
                    <p className="text-sm text-[#64748b] uppercase tracking-wider">
                      Select request to process
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-mono font-semibold text-[#1e293b]">{selectedRequest.id}</h2>
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                    {getActionButton()}
                  </div>

                  {/* Invoice Info Card */}
                  {selectedRequest.invoiceId && (
                    <div className="bg-white border border-[#e2e8f0] rounded border-l-4 border-l-[#0d9488]">
                      <div className="px-3 py-2 border-b border-[#e2e8f0] bg-emerald-50 flex items-center justify-between rounded-t">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                          Invoice Attached
                        </span>
                        <button onClick={() => setShowInvoiceModal(true)} className="font-mono text-sm font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          {selectedRequest.invoiceId}
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Invoice ID</span>
                            <span className="text-sm font-mono font-medium text-[#1e293b]">{selectedRequest.invoiceId}</span>
                          </div>
                          <div>
                            <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Payment Status</span>
                            <span className={`text-sm font-medium ${(() => {
                              const inv = invoices.find(i => i.id === selectedRequest.invoiceId || i.id === selectedRequest.invoiceId);
                              return inv?.paymentStatus === 'paid' ? 'text-[#15803d]' : 'text-orange-600';
                            })()}`}>
                              {(() => {
                                const inv = invoices.find(i => i.id === selectedRequest.invoiceId || i.id === selectedRequest.invoiceId);
                                return inv?.paymentStatus === 'paid' ? 'PAID' : 'PENDING';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned Driver Card */}
                  {selectedRequest.assignedDriver && (
                    <div className="bg-white border border-[#e2e8f0] rounded border-l-4 border-l-[#0d9488]">
                      <div className="px-3 py-2 border-b border-[#e2e8f0] bg-teal-50 rounded-t">
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                          Assigned Driver
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-teal-100 flex items-center justify-center rounded">
                              <Truck className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#1e293b]">{selectedRequest.assignedDriver.name}</div>
                              <div className="text-xs text-[#64748b] flex items-center gap-2">
                                <span>{selectedRequest.assignedDriver.vehicleType}</span>
                                <span>•</span>
                                <span className="font-mono">{selectedRequest.assignedDriver.licensePlate}</span>
                                <span>•</span>
                                <span>{selectedRequest.assignedDriver.capacity} MT</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-semibold">{selectedRequest.assignedDriver.rating}</span>
                            </div>
                            <div className="text-xs text-[#64748b] flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {selectedRequest.assignedDriver.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
)}

                  {/* Live Tracking */}
                  {(selectedRequest.status === 'order_picked_up' || selectedRequest.status === 'driver_assigned') && selectedRequest.assignedDriver && (
                    <div className="bg-white border border-[#e2e8f0] rounded border-l-4 border-l-[#0d9488]">
                      <div className="px-3 py-2 border-b border-[#e2e8f0] bg-teal-50 flex items-center justify-between rounded-t">
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 flex items-center gap-2">
                          <MapPinOff className="w-3 h-3" />
                          Live Tracking
                        </span>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                          {selectedRequest.status === 'order_picked_up' ? 'IN TRANSIT' : 'ASSIGNED'}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 flex items-center justify-center rounded-full animate-pulse">
                              <Truck className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#1e293b]">{selectedRequest.assignedDriver.name}</div>
                              <div className="text-xs text-teal-600">Driver en route</div>
                            </div>
                          </div>
                          <div className="text-right">
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    
                  {/* Fertilizer Items */}
                  <div className="bg-white border border-[#e2e8f0] rounded">
                    <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                        Items to Process
                      </span>
                      <span className="text-xs text-[#64748b]">
                        {selectedRequest.items.length} items
                      </span>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">SKU</th>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Type</th>
                          <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Product</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">QTY (bags)</th>
                          <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-[#e2e8f0]">
                            <td className="font-mono text-xs py-2 px-3">{item.sku}</td>
                            <td className="text-xs py-2 px-3">{item.type}</td>
                            <td className="text-xs py-2 px-3">{item.name}</td>
                            <td className="text-right font-mono text-xs py-2 px-3">{item.quantity}</td>
                            <td className="text-right font-mono text-xs font-medium py-2 px-3">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <AuditLog entries={selectedRequest.auditLog} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Driver Assignment Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#15803d]" />
                <span className="text-sm font-semibold text-[#1e293b]">Assign Driver</span>
              </div>
              <button
                onClick={() => setShowDriverModal(false)}
                className="text-[#64748b] hover:text-[#1e293b]"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Search drivers by name, vehicle, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                />
              </div>

              <div className="max-h-80 overflow-y-auto">
                {availableDrivers.length === 0 ? (
                  <div className="text-center py-8 text-[#64748b]">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No available drivers found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => handleAssignDriver(driver)}
                        className="p-3 border border-[#e2e8f0] hover:border-[#15803d] hover:bg-[#f0fdf4] cursor-pointer transition-colors rounded"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#f1f5f9] flex items-center justify-center rounded">
                              <User className="w-5 h-5 text-[#64748b]" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#1e293b]">{driver.name}</div>
                              <div className="text-xs text-[#64748b]">
                                {driver.vehicleType} • {driver.licensePlate} • {driver.capacity} MT • {driver.location.district}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-semibold">{driver.rating}</span>
                            </div>
                            <div className="text-xs text-[#64748b]">{driver.phone}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#15803d] flex items-center justify-between rounded-t sticky top-0">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Invoice Details</span>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-white hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1e293b]">INVOICE</h2>
                  <p className="text-sm text-[#64748b]">Fertilizer Distribution Management System</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-[#15803d]">{selectedRequest.invoiceId}</div>
                  <div className="text-xs text-[#64748b]">Date: {formatDate(selectedRequest.invoiceGeneratedAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#f1f5f9] rounded">
                <div>
                  <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Bill To</span>
                  <div className="font-semibold text-[#1e293b]">{selectedRequest.station.name}</div>
                  <div className="text-sm text-[#64748b]">{selectedRequest.station.location}</div>
                  <div className="text-sm text-[#64748b]">Contact: {selectedRequest.station.contactPerson}</div>
                  <div className="text-sm text-[#64748b]">Phone: {selectedRequest.station.phone}</div>
                </div>
                <div>
                  <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Request Details</span>
                  <div className="font-mono text-sm text-[#1e293b]">Request ID: {selectedRequest.id}</div>
                  <div className="text-sm text-[#64748b]">Priority: {selectedRequest.priority}</div>
                  <div className="text-sm text-[#64748b]">Status: {selectedRequest.status}</div>
                </div>
              </div>

              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-[#f1f5f9]">
                    <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border border-[#e2e8f0]">Item</th>
                    <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border border-[#e2e8f0]">Qty</th>
                    <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border border-[#e2e8f0]">Unit Price</th>
                    <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border border-[#e2e8f0]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 border border-[#e2e8f0] text-sm">{item.name}</td>
                      <td className="text-right py-2 px-3 border border-[#e2e8f0] font-mono text-sm">{item.quantity}</td>
                      <td className="text-right py-2 px-3 border border-[#e2e8f0] font-mono text-sm">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right py-2 px-3 border border-[#e2e8f0] font-mono text-sm font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right text-sm font-semibold py-2 px-3 border border-[#e2e8f0]">GRAND TOTAL:</td>
                    <td className="text-right font-mono text-base font-bold text-[#15803d] py-2 px-3 border border-[#e2e8f0]">
                      {formatCurrency(selectedRequest.items.reduce((sum, item) => sum + item.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex items-center justify-between">
                <div className="text-sm text-[#64748b]">
                  Payment Status: <span className={`font-semibold ${selectedRequest.status === 'paid' || selectedRequest.status === 'released' || selectedRequest.status === 'booking_stock' || selectedRequest.status === 'prepping' || selectedRequest.status === 'driver_assigned' || selectedRequest.status === 'order_picked_up' || selectedRequest.status === 'delivered' ? 'text-[#15803d]' : 'text-orange-600'}`}>
                    {selectedRequest.status === 'paid' || selectedRequest.status === 'released' || selectedRequest.status === 'cleared' || selectedRequest.status === 'booking_stock' || selectedRequest.status === 'prepping' || selectedRequest.status === 'driver_assigned' || selectedRequest.status === 'order_picked_up' || selectedRequest.status === 'delivered' ? 'Payment Made' : 'Pending'}
                  </span>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-[#15803d] text-white text-sm font-medium rounded hover:bg-green-800"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
