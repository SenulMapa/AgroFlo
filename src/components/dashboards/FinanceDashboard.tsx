import { useState, useMemo } from 'react';
import { useAppStore, useRequests, useSelectedRequest, useInvoices } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import { StatusBadge } from '../shared/StatusBadge';
import { AuditLog } from '../shared/AuditLog';
import {
  FileText, CheckCircle, DollarSign,
  TrendingUp, Printer, XCircle, Loader2
} from 'lucide-react';

interface FinanceDashboardProps {
  onLogout: () => void;
}

export function FinanceDashboard({ onLogout }: FinanceDashboardProps) {
  const { state, dispatch } = useAppStore();
  const requests = useRequests();
  const selectedRequest = useSelectedRequest();
  const invoices = useInvoices();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerLines, setLedgerLines] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const pendingFinance = useMemo(() => {
    return requests.filter(r => r.status === 'pending_finance' || r.status === 'approved');
  }, [requests]);

  const clearedRequests = useMemo(() => {
    return requests.filter(r => ['released', 'booking_stock', 'prepping', 'shipped'].includes(r.status));
  }, [requests]);

  const invoicedRequests = useMemo(() => {
    return requests.filter(r => r.status === 'invoiced');
  }, [requests]);

  const stats = useMemo(() => {
    const totalValue = clearedRequests.reduce((sum, r) =>
      sum + r.items.reduce((mSum, item) => mSum + item.total, 0), 0
    );
    return {
      pendingCount: pendingFinance.length,
      clearedToday: clearedRequests.filter(r => {
        const today = new Date();
        const cleared = r.clearedAt;
        return cleared &&
          cleared.getDate() === today.getDate() &&
          cleared.getMonth() === today.getMonth() &&
          cleared.getFullYear() === today.getFullYear();
      }).length,
      totalValue,
      invoiceCount: invoices.length,
    };
  }, [pendingFinance, clearedRequests, invoices]);

  const handleSelectRequest = (requestId: string) => {
    dispatch({ type: 'SELECT_REQUEST', payload: requestId });
    setShowLedger(false);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedRequest) return;

    setIsGenerating(true);
    setShowLedger(true);
    setLedgerLines([]);

    // Terminal cascade effect
    const lines = [
      `> INITIALIZING INVOICE GENERATION...`,
      `> REQUEST ID: ${selectedRequest.id}`,
      `> STATION: ${selectedRequest.station.name}`,
      `> PROCESSING ${selectedRequest.items.length} LINE ITEMS...`,
      ...selectedRequest.items.map(item =>
        `> ${item.sku} | ${item.type} | QTY:${item.quantity} bags | LKR ${item.unitCost.toLocaleString()} | TAX:LKR ${item.tax.toLocaleString()}`
      ),
      `> CALCULATING TOTALS...`,
      `> GENERATING INVOICE ID...`,
      `> COMPLETE.`,
    ];

    for (let i = 0; i < lines.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setLedgerLines(prev => [...prev, lines[i]]);
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    dispatch({
      type: 'GENERATE_INVOICE',
      payload: {
        requestId: selectedRequest.id,
        user: state.currentUser?.name || 'Finance',
      },
    });

    setIsGenerating(false);
  };

  const handleReleaseInvoice = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    dispatch({
      type: 'RELEASE_INVOICE',
      payload: {
        requestId: selectedRequest.id,
        user: state.currentUser?.name || 'Finance',
      },
    });

    setIsProcessing(false);
    setShowReleaseModal(false);
  };

  const handleDeclineInvoice = async () => {
    if (!selectedRequest) return;

    if (declineReason.length < 50) {
      setReasonError('Reason must be at least 50 characters');
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    dispatch({
      type: 'DECLINE_INVOICE',
      payload: {
        requestId: selectedRequest.id,
        reason: declineReason,
        user: state.currentUser?.name || 'Finance',
      },
    });

    setIsProcessing(false);
    setShowDeclineModal(false);
    setDeclineReason('');
  };

  const handlePrintInvoice = () => {
    if (!selectedRequest?.invoiceId) return;

    const invoice = invoices.find(inv => inv.id === selectedRequest.invoiceId);
    if (!invoice) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { font-size: 12px; color: #666; }
    .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .invoice-info div { font-size: 14px; }
    .bill-to { margin-bottom: 20px; }
    .bill-to h3 { font-size: 12px; color: #666; margin-bottom: 5px; }
    .bill-to p { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; padding: 8px; border-bottom: 1px solid #000; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #ccc; font-size: 12px; }
    th:last-child, td:last-child { text-align: right; }
    .totals { margin-top: 20px; }
    .totals-row { display: flex; justify-content: flex-end; padding: 5px 0; }
    .totals-row:last-child { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 10px; }
    .totals-label { width: 150px; text-align: right; padding-right: 20px; }
    .totals-value { width: 120px; text-align: right; }
    .footer { margin-top: 50px; border-top: 1px solid #000; padding-top: 20px; }
    .signature { margin-top: 50px; }
    .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 50px; }
    .signature-label { font-size: 12px; color: #666; margin-top: 5px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>Fertilizer Distribution Management System</p>
  </div>
  
  <div class="invoice-info">
    <div>
      <strong>Invoice #:</strong> ${invoice.id}<br/>
      <strong>Date:</strong> ${formatDate(invoice.generatedAt)}
    </div>
    <div>
      <strong>Request #:</strong> ${invoice.requestId}
    </div>
  </div>
  
  <div class="bill-to">
    <h3>BILL TO:</h3>
    <p><strong>${selectedRequest.station.name}</strong><br/>
    ${selectedRequest.station.location}<br/>
    Contact: ${selectedRequest.station.contactPerson}<br/>
    Phone: ${selectedRequest.station.phone}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>ITEM</th>
        <th>QTY</th>
        <th>UNIT PRICE</th>
        <th>TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity} bags</td>
          <td>${formatCurrency(item.unitCost)}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <div class="totals-label">Subtotal:</div>
      <div class="totals-value">${formatCurrency(invoice.subtotal)}</div>
    </div>
    <div class="totals-row">
      <div class="totals-label">Tax (5%):</div>
      <div class="totals-value">${formatCurrency(invoice.taxTotal)}</div>
    </div>
    <div class="totals-row">
      <div class="totals-label">GRAND TOTAL:</div>
      <div class="totals-value">${formatCurrency(invoice.grandTotal)}</div>
    </div>
  </div>
  
  <div class="footer">
    <div><strong>Payment Status:</strong> PENDING</div>
  </div>
  
  <div class="signature">
    <div class="signature-line"></div>
    <div class="signature-label">Authorized Signature</div>
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
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

  const getRequestTotal = (request: typeof requests[0]) => {
    return request.items.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Finance Dashboard" onLogout={onLogout} />

      {/* Stats Bar */}
      <div className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-4 gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 flex items-center justify-center rounded">
            <FileText className="w-4 h-4 text-[#15803d]" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.pendingCount}</div>
            <div className="text-xs text-[#64748b] uppercase">Pending</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-100 flex items-center justify-center rounded">
            <CheckCircle className="w-4 h-4 text-[#0d9488]" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.clearedToday}</div>
            <div className="text-xs text-[#64748b] uppercase">Cleared Today</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 flex items-center justify-center rounded">
            <DollarSign className="w-4 h-4 text-[#15803d]" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-[#64748b] uppercase">Total Value</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-100 flex items-center justify-center rounded">
            <TrendingUp className="w-4 h-4 text-[#0d9488]" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{stats.invoiceCount}</div>
            <div className="text-xs text-[#64748b] uppercase">Invoices</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Queues */}
        <div className="w-[25%] border-r border-[#e2e8f0] bg-white flex flex-col">
          {/* Pending Finance Queue */}
          <div className="flex-1 flex flex-col border-b border-[#e2e8f0]">
            <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Pending Finance ({pendingFinance.length})
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {pendingFinance.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#64748b]">No pending items</div>
              ) : (
                <div className="divide-y divide-[#e2e8f0]">
                  {pendingFinance.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => handleSelectRequest(request.id)}
                      className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold">{request.id}</span>
                        <span className="font-mono text-xs text-[#15803d]">
                          {formatCurrency(getRequestTotal(request))}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748b]">{request.station.name}</div>
                      <div className="text-xs text-[#64748b]">{request.station.district} → {request.destination}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoiced Queue */}
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                Invoiced ({invoicedRequests.length})
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {invoicedRequests.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#64748b]">No invoiced items</div>
              ) : (
                <div className="divide-y divide-[#e2e8f0]">
                  {invoicedRequests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => handleSelectRequest(request.id)}
                      className={`p-3 cursor-pointer hover:bg-[#f0fdf4] transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold">{request.id}</span>
                        <span className="font-mono text-xs text-[#0d9488]">
                          {request.invoiceId}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748b]">{request.station.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane - Detail & Ledger */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Section - Request Detail */}
          <div className="h-[60%] overflow-auto p-4">
            {!selectedRequest ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 text-[#e2e8f0] mx-auto mb-3" />
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
                  <div className="flex items-center gap-2">
                    {(selectedRequest.status === 'pending_finance' || selectedRequest.status === 'approved') && (
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            GENERATING...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-1" />
                            GENERATE INVOICE
                          </>
                        )}
                      </button>
                    )}
                    {selectedRequest.status === 'invoiced' && (
                      <>
                        <button
                          onClick={() => setShowDeclineModal(true)}
                          className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#dc2626] text-white hover:bg-red-700 transition-colors rounded"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          DECLINE
                        </button>
                        <button
                          onClick={() => setShowReleaseModal(true)}
                          className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 transition-colors rounded"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          RELEASE
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Invoice Preview (if exists) */}
                {selectedRequest.invoiceId && (
                  <div className="bg-white border border-[#e2e8f0] rounded border-l-4 border-l-[#0d9488]">
                    <div className="px-3 py-2 border-b border-[#e2e8f0] bg-emerald-50 flex items-center justify-between rounded-t">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Invoice Generated
                      </span>
                      <span className="font-mono text-sm font-semibold text-emerald-700">
                        {selectedRequest.invoiceId}
                      </span>
                    </div>
                    <div className="p-4">
                      {invoices.find(inv => inv.id === selectedRequest.invoiceId) && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Subtotal</span>
                            <span className="text-sm font-mono font-medium text-[#1e293b]">
                              {formatCurrency(invoices.find(inv => inv.id === selectedRequest.invoiceId)!.subtotal)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Tax</span>
                            <span className="text-sm font-mono font-medium text-[#1e293b]">
                              {formatCurrency(invoices.find(inv => inv.id === selectedRequest.invoiceId)!.taxTotal)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Grand Total</span>
                            <span className="text-sm font-mono font-bold text-[#15803d]">
                              {formatCurrency(invoices.find(inv => inv.id === selectedRequest.invoiceId)!.grandTotal)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fertilizer Order */}
                <div className="bg-white border border-[#e2e8f0] rounded">
                  <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between rounded-t">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Fertilizer Order
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
                        <td colSpan={5} className="text-right text-xs font-semibold py-2 px-3">TOTAL:</td>
                        <td className="text-right font-mono text-sm font-bold text-[#15803d] py-2 px-3">
                          {formatCurrency(getRequestTotal(selectedRequest))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <AuditLog entries={selectedRequest.auditLog} />
              </div>
            )}
          </div>

          {/* Bottom Section - Ledger Preview */}
          <div className="h-[40%] border-t border-[#e2e8f0] bg-[#f1f5f9] flex flex-col">
            <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-[#64748b]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Ledger Preview
                </span>
              </div>
              {selectedRequest?.invoiceId && (
                <button 
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1 text-xs text-[#15803d] hover:underline cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  PRINT
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-xs">
              {!selectedRequest ? (
                <div className="text-gray-500 text-center py-8">
                  Select a request to view ledger preview
                </div>
              ) : showLedger && ledgerLines.length > 0 ? (
                <div className="space-y-1">
                  {ledgerLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`${
                        line.startsWith('> COMPLETE') ? 'text-green-400' :
                        line.startsWith('>') ? 'text-green-300' : 'text-gray-400'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ) : selectedRequest.invoiceId ? (
                <div className="space-y-1 text-green-300">
                  <div>{`> INVOICE: ${selectedRequest.invoiceId}`}</div>
                  <div>{`> REQUEST: ${selectedRequest.id}`}</div>
                  <div>{`> STATION: ${selectedRequest.station.name}`}</div>
                  <div>{`> DATE: ${formatDate(new Date())}`}</div>
                  <div className="text-gray-500">{'─'.repeat(60)}</div>
                  {selectedRequest.items.map((item, idx) => (
                    <div key={idx}>
                      {`> ${item.sku} | ${item.type.padEnd(8)} | ${item.quantity.toString().padStart(4)} bags | LKR ${item.total.toLocaleString().padStart(12)}`}
                    </div>
                  ))}
                  <div className="text-gray-500">{'─'.repeat(60)}</div>
                  <div className="text-green-400 font-bold">
                    {`> TOTAL: LKR ${getRequestTotal(selectedRequest).toLocaleString().padStart(45)}`}
                  </div>
                  <div className="text-gray-500">{'─'.repeat(60)}</div>
                  <div className="text-emerald-400">{`> STATUS: CLEARED FOR WAREHOUSE`}</div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Generate invoice to view ledger entry
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Release Invoice Confirmation Modal */}
      {showReleaseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md border border-[#e2e8f0] rounded p-6">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">Confirm Release Invoice</h3>
            <p className="text-sm text-[#64748b] mb-4">
              Are you sure you want to release invoice {selectedRequest.invoiceId}? This will notify warehouse to proceed with dispatch.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReleaseModal(false)}
                className="px-4 py-2 text-sm border border-[#e2e8f0] rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReleaseInvoice}
                disabled={isProcessing}
                className="px-4 py-2 text-sm bg-[#15803d] text-white rounded hover:bg-green-800"
              >
                {isProcessing ? 'Processing...' : 'Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Invoice Modal */}
      {showDeclineModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg border border-[#e2e8f0] rounded p-6">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-2">Decline Invoice</h3>
            <p className="text-sm text-[#64748b] mb-4">
             Please provide a reason for declining invoice {selectedRequest.invoiceId}.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => {
                setDeclineReason(e.target.value);
                setReasonError(null);
              }}
              placeholder="Reason (min 50 characters)"
              className="w-full h-32 p-3 border border-[#e2e8f0] text-sm rounded mb-2"
            />
            <div className="text-xs text-right mb-4">
              {declineReason.length} / 50 characters
              {reasonError && <span className="text-red-500 ml-2">{reasonError}</span>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-sm border border-[#e2e8f0] rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineInvoice}
                disabled={isProcessing || declineReason.length < 50}
                className="px-4 py-2 text-sm bg-[#dc2626] text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
