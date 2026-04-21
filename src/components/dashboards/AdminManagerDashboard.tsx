import { useState, useMemo } from 'react';
import { useAppStore, useRequests, useSelectedRequest, useStock } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { SLACountdown } from '../shared/SLACountdown';
import { AuditLog } from '../shared/AuditLog';
import { isRequestOverdue } from '@/types';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Loader2, Clock, FileText, Warehouse } from 'lucide-react';

interface AdminManagerDashboardProps {
  onLogout: () => void;
}

export function AdminManagerDashboard({ onLogout }: AdminManagerDashboardProps) {
  const { state, dispatch } = useAppStore();
  const requests = useRequests();
  const selectedRequest = useSelectedRequest();
  const stock = useStock();
const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingRequests = useMemo(() => {
    return requests
      .filter(r => r.status === 'pending_admin_manager')
      .sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime());
  }, [requests]);

  const handleSelectRequest = (requestId: string) => {
    dispatch({ type: 'SELECT_REQUEST', payload: requestId });
  };

  const handleApproveAndRelease = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    dispatch({
      type: 'APPROVE_REQUEST',
      payload: {
        requestId: selectedRequest.id,
        user: state.currentUser?.name || 'Admin Manager',
      },
    });

    toast.success('Request approved successfully', {
      description: `${selectedRequest.id} has been approved and stock released`,
    });

    setIsProcessing(false);
  };

  const handleDeclineClick = () => {
    setShowDeclineModal(true);
    setDeclineReason('');
    setReasonError(null);
  };

  const handleConfirmDecline = async () => {
    if (!selectedRequest) return;

    if (declineReason.length < 50) {
      setReasonError('Reason must be at least 50 characters');
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    dispatch({
      type: 'DECLINE_REQUEST',
      payload: {
        requestId: selectedRequest.id,
        reason: declineReason,
        user: state.currentUser?.name || 'Admin Manager',
      },
    });

    toast.error('Request declined', {
      description: `${selectedRequest.id} has been declined`,
    });

    setIsProcessing(false);
    setShowDeclineModal(false);
    setDeclineReason('');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
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

  const getSLAColor = (deadline: Date) => {
    const hoursLeft = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return 'text-red-600 bg-red-50';
    if (hoursLeft < 2) return 'text-red-600 bg-red-50';
    if (hoursLeft < 6) return 'text-orange-600 bg-orange-50';
    return 'text-[#64748b] bg-[#f1f5f9]';
  };

  const getStockStatus = (stockItem: typeof stock[0]) => {
    const level = stockItem.available / stockItem.total;
    if (level > 0.3) return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
    if (level > 0.1) return { text: 'Low Stock', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Admin Manager Dashboard" onLogout={onLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Pending Queue (30%) */}
        <div className="w-[30%] border-r border-[#e2e8f0] bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Pending Queue
              </span>
              <span className="text-xs text-[#64748b]">
                {pendingRequests.length} items
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-[#0d9488] mx-auto mb-2" />
                <p className="text-sm text-[#64748b]">No pending requests</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e8f0]">
                {pendingRequests.map((request) => {
                  const overdue = isRequestOverdue(request);
                  return (
                    <div
                      key={request.id}
                      onClick={() => handleSelectRequest(request.id)}
                      className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                      } ${overdue ? 'bg-red-50 border-l-[3px] border-l-red-500' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono text-sm font-semibold text-[#1e293b]">{request.id}</span>
                        <PriorityBadge priority={request.priority} showIcon={false} />
                      </div>
                      <div className="text-xs text-[#64748b] mb-1">{request.station.name}</div>
                      <div className="text-xs text-[#64748b] mb-1">{request.station.district}</div>
                      <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${getSLAColor(request.slaDeadline)}`}>
                        <Clock className="w-3 h-3" />
                        <SLACountdown deadline={request.slaDeadline} />
                        {overdue && (
                          <span className="ml-1 px-1 bg-red-500 text-white rounded text-[10px]">OVERDUE</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Detail View (70%) */}
        <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-auto">
          {!selectedRequest ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-sm text-[#64748b] uppercase tracking-wider">
                  Select request to review
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Request Header */}
              <div className="bg-white border border-[#e2e8f0] rounded p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-mono font-semibold text-[#1e293b]">
                        {selectedRequest.id}
                      </h2>
                      <StatusBadge status={selectedRequest.status} />
                      <PriorityBadge priority={selectedRequest.priority} />
                      {isRequestOverdue(selectedRequest) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#64748b]">
                      <span>Received: {formatDate(selectedRequest.date)}</span>
                      <span>Origin: {selectedRequest.origin}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded ${getSLAColor(selectedRequest.slaDeadline)}`}>
                    <span className="text-xs font-semibold uppercase tracking-wider">SLA</span>
                    <SLACountdown deadline={selectedRequest.slaDeadline} className="block mt-1" />
                  </div>
                </div>
              </div>

              {/* Action Bar - Now before order details */}
              {selectedRequest.status === 'pending_admin_manager' && (
                <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#15803d]" />
                    <span className="text-sm text-[#1e293b]">Review required - Stock will be released on approval</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeclineClick}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#dc2626] text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      DECLINE
                    </button>
                    <button
                      onClick={handleApproveAndRelease}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      APPROVE & RELEASE STOCK
                    </button>
                  </div>
                </div>
              )}

              {/* Fertilizer Order */}
              <div className="bg-white border border-[#e2e8f0] rounded">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] rounded-t">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Fertilizer Order Details
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">SKU</th>
                      <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Type</th>
                      <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">Product</th>
                      <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">QTY</th>
                      <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">UNIT</th>
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
                        <td className="text-right font-mono text-xs py-2 px-3">{formatCurrency(item.unitCost)}</td>
                        <td className="text-right font-mono text-xs font-medium py-2 px-3">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f1f5f9]">
                    <tr>
                      <td colSpan={5} className="text-right text-xs font-semibold py-2 px-3">GRAND TOTAL:</td>
                      <td className="text-right font-mono text-sm font-bold text-[#15803d] py-2 px-3">
                        {formatCurrency(selectedRequest.items.reduce((sum, item) => sum + item.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Stock Availability - Below Order Details */}
              <div className="bg-white border border-[#e2e8f0] rounded">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] rounded-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-[#15803d]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Stock Availability
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-1 px-2 border-b border-[#e2e8f0]">Type</th>
                        <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-1 px-2 border-b border-[#e2e8f0]">Available</th>
                        <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-1 px-2 border-b border-[#e2e8f0]">Booked</th>
                        <th className="text-center font-semibold text-xs uppercase tracking-wider text-[#64748b] py-1 px-2 border-b border-[#e2e8f0]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((item, idx) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={idx} className="border-b border-[#e2e8f0]">
                            <td className="text-xs py-1 px-2">{item.type}</td>
                            <td className="text-right font-mono text-xs py-1 px-2 text-green-700">{item.available.toFixed(1)} MT</td>
                            <td className="text-right font-mono text-xs py-1 px-2 text-orange-700">{item.booked.toFixed(1)} MT</td>
                            <td className="text-center py-1 px-2">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${status.color}`}>
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Station & Route Info */}
              <div className="bg-white border border-[#e2e8f0] rounded p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] block mb-2">
                    Station
                  </span>
                  <div className="text-sm text-[#1e293b]">{selectedRequest.station.name}</div>
                  <div className="text-xs text-[#64748b]">{selectedRequest.station.district}</div>
                </div>

              {/* Audit Log */}
              <AuditLog entries={selectedRequest.auditLog} />
            </div>
          )}
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-red-50 flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#dc2626]" />
                <span className="text-sm font-semibold text-[#1e293b]">Decline Request</span>
              </div>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-[#64748b] hover:text-[#1e293b]"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-[#1e293b] mb-2">
                  You are declining request <span className="font-mono font-semibold">{selectedRequest.id}</span>
                </p>
                <p className="text-xs text-[#64748b]">
                  Please provide a detailed reason for this decline. This will be recorded in the audit log.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">
                  Reason for Decline <span className="text-[#ea580c]">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => {
                    setDeclineReason(e.target.value);
                    setReasonError(null);
                  }}
                  placeholder="Minimum 50 characters required..."
                  className="w-full h-32 p-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] resize-none rounded"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${declineReason.length < 50 ? 'text-[#ea580c]' : 'text-[#0d9488]'}`}>
                    {declineReason.length} / 50 characters
                  </span>
                  {reasonError && (
                    <span className="text-xs text-[#ea580c]">{reasonError}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50 transition-colors rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmDecline}
                  disabled={isProcessing || declineReason.length < 50}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#dc2626] text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      PROCESSING...
                    </>
                  ) : (
                    'CONFIRM DECLINE'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}