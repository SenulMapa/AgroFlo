import { useState, useMemo } from 'react';
import { useRequests } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import type { RequestStatus } from '@/types';
import {
  Package, Truck, CheckCircle, Clock, MapPin,
  Search, ChevronRight, Circle
} from 'lucide-react';

interface ReceiverPortalProps {
  onLogout: () => void;
}

const STATUS_FLOW: { status: RequestStatus; label: string }[] = [
  { status: 'new', label: 'Order Created' },
  { status: 'pending_admin_manager', label: 'Admin Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'pending_finance', label: 'Pending Invoice' },
  { status: 'invoiced', label: 'Invoiced' },
  { status: 'paid', label: 'Payment Confirmed' },
  { status: 'released', label: 'Released to Warehouse' },
  { status: 'booking_stock', label: 'Stock Booked' },
  { status: 'prepping', label: 'Preparing Order' },
  { status: 'driver_assigned', label: 'Driver Assigned' },
  { status: 'order_picked_up', label: 'Order Picked Up' },
  { status: 'delivered', label: 'Delivered' },
];

export function ReceiverPortal({ onLogout }: ReceiverPortalProps) {
  const requests = useRequests();
  const [searchQuery, setSearchQuery] = useState('');

  const foundRequest = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return requests.find(r => 
      r.id.toLowerCase() === searchQuery.trim().toLowerCase() ||
      r.invoiceId?.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [requests, searchQuery]);

  const getCurrentStepIndex = (status: RequestStatus) => {
    const idx = STATUS_FLOW.findIndex(s => s.status === status);
    return idx >= 0 ? idx : 0;
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-LK', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Receiver Portal" onLogout={onLogout} />

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* Search */}
          <div className="bg-white border border-[#e2e8f0] rounded-lg mb-6">
            <div className="px-4 py-4 border-b border-[#e2e8f0] bg-green-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-[#15803d]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1e293b]">
                  Track Your Order
                </h2>
              </div>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Order ID (e.g., REQ-8900) or Invoice ID"
                  className="w-full h-12 pl-10 pr-4 border border-[#e2e8f0] text-lg rounded focus:outline-none focus:border-[#15803d] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Not Found */}
          {searchQuery && !foundRequest && (
            <div className="bg-white border border-red-200 rounded-lg p-8 text-center">
              <Package className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-600 mb-1">Order Not Found</h3>
              <p className="text-sm text-[#64748b]">
                No order found with ID "{searchQuery}". Please check and try again.
              </p>
            </div>
          )}

          {/* Found - Timeline View */}
          {foundRequest && (
            <div className="bg-white border border-[#e2e8f0] rounded-lg">
              {/* Header */}
              <div className="px-4 py-4 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#15803d] flex items-center justify-center rounded">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-mono text-lg font-bold text-[#1e293b]">{foundRequest.id}</h3>
                    <p className="text-xs text-[#64748b]">
                      Invoice: {foundRequest.invoiceId || '-'}
                    </p>
                  </div>
                </div>
                {foundRequest.status === 'delivered' ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    DELIVERED
                  </span>
                ) : foundRequest.status === 'order_picked_up' ? (
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                    IN TRANSIT
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    PROCESSING
                  </span>
                )}
              </div>

              {/* Order Info */}
              <div className="p-4 border-b border-[#e2e8f0]">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">
                      Destination
                    </span>
                    <span className="text-sm flex items-center gap-1 text-[#1e293b]">
                      <MapPin className="w-3 h-3" />
                      {foundRequest.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">
                      Total Amount
                    </span>
                    <span className="text-sm font-mono font-semibold text-[#15803d]">
                      {formatCurrency(foundRequest.items.reduce((s, i) => s + i.total, 0))}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-2">
                    Items
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {foundRequest.items.map((item, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-50 text-xs rounded">
                        {item.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tracking Timeline - Pizza Hut Style */}
              <div className="p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] block mb-4">
                  Order Progress Timeline
                </span>
                <div className="relative">
                  {STATUS_FLOW.map((step, idx) => {
                    const currentIdx = getCurrentStepIndex(foundRequest.status);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.status} className="flex items-start relative">
                        {/* Line connector */}
                        {idx < STATUS_FLOW.length - 1 && (
                          <div className={`absolute left-[18px] top-8 w-0.5 h-8 ${
                            isCompleted ? 'bg-[#15803d]' : 'bg-gray-200'
                          }`} />
                        )}

                        <div className="flex items-start gap-3 pb-6">
                          <div className={`w-9 h-9 flex items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? 'bg-[#15803d] border-[#15803d] text-white'
                              : isCurrent
                                ? 'bg-white border-[#15803d] text-[#15803d] animate-pulse'
                                : 'bg-white border-gray-200 text-gray-300'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : isCurrent ? (
                              <Clock className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 pt-1.5">
                            <div className={`text-sm font-medium ${
                              isCompleted || isCurrent ? 'text-[#1e293b]' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </div>
                            <div className="text-xs text-[#64748b]">
                              {isCompleted && idx > 0 && (
                                <span>Completed {formatDate(foundRequest.auditLog?.[idx]?.timestamp)}</span>
                              )}
                              {isCurrent && (
                                <span className="text-[#15803d]">In Progress...</span>
                              )}
                              {!isCompleted && !isCurrent && (
                                <span>Pending</span>
                              )}
                            </div>
                          </div>
                          {idx < STATUS_FLOW.length - 1 && (
                            <ChevronRight className={`w-4 h-4 pt-2 ${
                              isCompleted ? 'text-[#15803d]' : 'text-gray-300'
                            }`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Driver Info (if assigned) */}
              {foundRequest.assignedDriver && (
                <div className="px-4 py-4 bg-teal-50 border-t border-[#e2e8f0] rounded-b">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 block mb-2">
                    Driver Details
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 flex items-center justify-center rounded">
                        <Truck className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1e293b]">
                          {foundRequest.assignedDriver.name}
                        </div>
                        <div className="text-xs text-[#64748b]">
                          {foundRequest.assignedDriver.vehicleType} • {foundRequest.assignedDriver.licensePlate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500 text-sm">
                        <span>★</span>
                        <span className="font-medium">{foundRequest.assignedDriver.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}