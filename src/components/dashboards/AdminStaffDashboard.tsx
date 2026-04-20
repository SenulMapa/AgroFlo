import { useState, useMemo } from 'react';
import { useAppStore, useRequests, useSelectedRequest } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { SLACountdown } from '../shared/SLACountdown';
import { AuditLog } from '../shared/AuditLog';
import { isRequestOverdue, type Priority } from '@/types';
import { fertilizerPrices } from '@/data/fertilizerDatabase';
import {
  Search, MapPin, Calendar, Phone,
  ArrowRight, Package, AlertCircle, Loader2
} from 'lucide-react';

interface AdminStaffDashboardProps {
  onLogout: () => void;
}

export function AdminStaffDashboard({ onLogout }: AdminStaffDashboardProps) {
  const { state, dispatch } = useAppStore();
  const requests = useRequests();
  const selectedRequest = useSelectedRequest();
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [isRouting, setIsRouting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [fertilizerType, setFertilizerType] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [priority, setPriority] = useState<Priority>('medium');
  
  const [isCreating, setIsCreating] = useState(false);

  const districts = useMemo(() => {
    const uniqueDistricts = new Set(requests.map(r => r.station.district));
    return ['all', ...Array.from(uniqueDistricts)];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch =
        request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.origin.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDistrict = districtFilter === 'all' || request.station.district === districtFilter;
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

      return matchesSearch && matchesDistrict && matchesPriority;
    });
  }, [requests, searchQuery, districtFilter, priorityFilter]);

  const newRequests = filteredRequests.filter(r => r.status === 'new');

  const handleSelectRequest = (requestId: string) => {
    dispatch({ type: 'SELECT_REQUEST', payload: requestId });
  };

  const handleRouteToSigning = async () => {
    if (!selectedRequest) return;

    setIsRouting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    dispatch({
      type: 'ROUTE_REQUEST',
      payload: {
        requestId: selectedRequest.id,
        newStatus: 'pending_admin_manager',
        user: state.currentUser?.name || 'Admin Staff',
        role: 'admin_staff',
      },
    });

    setIsRouting(false);
  };

  const handleCreateRequest = async () => {
    if (!selectedStation || !fertilizerType) return;
    
    if (quantity <= 0 || quantity > 10000) {
      alert('Please enter a valid quantity between 1 and 10,000');
      return;
    }

    setIsCreating(true);
    
    // Fetch unit price from "database"
    const ferData = fertilizerPrices.find(p => p.type === fertilizerType);
    if (!ferData) {
      setIsCreating(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    const stations = [
      { id: 'STN-1001', name: 'Colombo Central Station', district: 'Colombo', location: 'Colombo', contactPerson: 'Station Manager 1', phone: '+94 11 2000123' },
      { id: 'STN-1002', name: 'Kandy District Office', district: 'Kandy', location: 'Kandy', contactPerson: 'Station Manager 2', phone: '+94 81 2000124' },
      { id: 'STN-1003', name: 'Galle Regional Hub', district: 'Galle', location: 'Galle', contactPerson: 'Station Manager 3', phone: '+94 91 2000125' },
      { id: 'STN-1004', name: 'Jaffna Branch', district: 'Jaffna', location: 'Jaffna', contactPerson: 'Station Manager 4', phone: '+94 21 2000126' },
      { id: 'STN-1005', name: 'Matale Supply Point', district: 'Matale', location: 'Matale', contactPerson: 'Station Manager 5', phone: '+94 66 2000127' },
      { id: 'STN-1006', name: 'Kalutara Distribution Center', district: 'Kalutara', location: 'Kalutara', contactPerson: 'Station Manager 6', phone: '+94 34 2000128' },
      { id: 'STN-1007', name: 'Gampaha Station', district: 'Gampaha', location: 'Gampaha', contactPerson: 'Station Manager 7', phone: '+94 33 2000129' },
      { id: 'STN-1008', name: 'Kurunegala Depot', district: 'Kurunegala', location: 'Kurunegala', contactPerson: 'Station Manager 8', phone: '+94 37 2000130' },
    ];

    const station = stations.find(s => s.id === selectedStation) || stations[0];
    const itemTotal = ferData.unitCost * quantity;
    const tax = itemTotal * ferData.taxRate;
    const orderCreatedDate = new Date();

    dispatch({
      type: 'CREATE_NEW_REQUEST',
      payload: {
        station,
        items: [{
          sku: ferData.sku,
          name: ferData.name,
          type: ferData.type,
          quantity,
          unitCost: ferData.unitCost,
          tax,
          total: itemTotal + tax,
        }],
        priority,
        orderCreatedDate,
        user: state.currentUser?.name || 'Admin Staff',
      },
    });

    setIsCreating(false);
    setShowCreateModal(false);
    setSelectedStation('');
    setFertilizerType('');
    setQuantity(50);
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

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Staff Dashboard" onLogout={onLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Request List (40%) */}
        <div className="w-[40%] border-r border-[#e2e8f0] bg-white flex flex-col">
          {/* Filter Bar */}
          <div className="p-3 border-b border-[#e2e8f0] bg-[#f1f5f9] space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="flex-1 h-7 px-2 border border-[#e2e8f0] text-xs focus:outline-none focus:border-[#15803d] bg-white rounded"
              >
                <option value="all">All Districts</option>
                {districts.filter(r => r !== 'all').map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
                className="flex-1 h-7 px-2 border border-[#e2e8f0] text-xs focus:outline-none focus:border-[#15803d] bg-white rounded"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="px-3 py-2 border-b border-[#e2e8f0] flex items-center justify-between">
            <span className="text-xs text-[#64748b]">
              {newRequests.length} NEW REQUESTS
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 transition-colors rounded"
            >
              <Package className="w-3 h-3" />
              CREATE NEW REQUEST
            </button>
          </div>

          {/* Request List */}
          <div className="flex-1 overflow-auto">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-[#64748b] mx-auto mb-2" />
                <p className="text-sm text-[#64748b]">No requests found</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">ID</th>
                    <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">DATE</th>
                    <th className="text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">ORIGIN</th>
                    <th className="w-24 text-left font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const overdue = isRequestOverdue(request);
                    return (
                    <tr
                      key={request.id}
                      onClick={() => handleSelectRequest(request.id)}
                      className={`cursor-pointer ${selectedRequest?.id === request.id ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#15803d]' : ''} ${overdue ? 'bg-red-50' : ''} hover:bg-[#f0fdf4] border-b border-[#e2e8f0]`}
                    >
                      <td className="font-mono text-xs py-2 px-3">{request.id}</td>
                      <td className="text-xs py-2 px-3">{formatDate(request.date)}</td>
                      <td className="text-xs py-2 px-3">{request.origin}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={request.status} />
                        {overdue && <span className="ml-1 px-1 bg-red-500 text-white text-[10px] rounded">OVERDUE</span>}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Pane - Detail View (60%) */}
        <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-auto">
          {!selectedRequest ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Package className="w-12 h-12 text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-sm text-[#64748b] uppercase tracking-wider">
                  Select request to view details
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
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#64748b]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(selectedRequest.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedRequest.station.district}
                      </span>
                      <SLACountdown deadline={selectedRequest.slaDeadline} />
                    </div>
                  </div>
                  {selectedRequest.status === 'new' && (
                    <button
                      onClick={handleRouteToSigning}
                      disabled={isRouting}
                      className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                    >
                      {isRouting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ROUTING...
                        </>
                      ) : (
                        <>
                          ROUTE TO ADMIN
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Station Info */}
              <div className="bg-white border border-[#e2e8f0] rounded">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f1f5f9] rounded-t">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Station Information
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Station Name</span>
                      <span className="text-sm font-medium text-[#1e293b]">{selectedRequest.station.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Station ID</span>
                      <span className="text-sm font-mono font-medium text-[#1e293b]">{selectedRequest.station.id}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Contact Person</span>
                      <span className="text-sm text-[#1e293b]">{selectedRequest.station.contactPerson}</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">Phone</span>
                      <span className="text-sm flex items-center gap-1 text-[#1e293b]">
                        <Phone className="w-3 h-3" />
                        {selectedRequest.station.phone}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-[#64748b] uppercase tracking-wider block mb-1">District</span>
                      <span className="text-sm flex items-center gap-1 text-[#1e293b]">
                        <MapPin className="w-3 h-3" />
                        {selectedRequest.station.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fertilizer Items */}
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
                      <th className="text-right font-semibold text-xs uppercase tracking-wider text-[#64748b] py-2 px-3 border-b border-[#e2e8f0] bg-white h-8">QTY (bags)</th>
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
                        {formatCurrency(selectedRequest.items.reduce((sum, item) => sum + item.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              

              {/* Audit Log */}
              <AuditLog entries={selectedRequest.auditLog} />
            </div>
          )}
        </div>
      </div>

      {/* Create New Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#15803d] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Create New Fertilizer Request</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Station Selection */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Station</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                >
                  <option value="">Select Station...</option>
                  <option value="STN-1001">Colombo Central Station</option>
                  <option value="STN-1002">Kandy District Office</option>
                  <option value="STN-1003">Galle Regional Hub</option>
                  <option value="STN-1004">Jaffna Branch</option>
                  <option value="STN-1005">Matale Supply Point</option>
                  <option value="STN-1006">Kalutara Distribution Center</option>
                  <option value="STN-1007">Gampaha Station</option>
                  <option value="STN-1008">Kurunegala Depot</option>
                </select>
              </div>

              {/* Fertilizer Type */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Fertilizer Type</label>
                <select
                  value={fertilizerType}
                  onChange={(e) => setFertilizerType(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                >
                  <option value="">Select Fertilizer...</option>
                  <option value="Urea">Urea (46-0-0) - LKR 4,500/bag</option>
                  <option value="DAP">DAP (18-46-0) - LKR 8,200/bag</option>
                  <option value="MOP">MOP (0-0-60) - LKR 6,800/bag</option>
                  <option value="NPK">NPK (15-15-15) - LKR 7,500/bag</option>
                  <option value="TSP">TSP (0-46-0) - LKR 5,200/bag</option>
                  <option value="Sulphur">Sulphur (90%) - LKR 3,200/bag</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Quantity (bags)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min={10}
                  max={500}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Order Summary Preview */}
              {fertilizerType && quantity > 0 && (
                <div className="bg-[#f1f5f9] rounded p-3 border border-[#e2e8f0]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] block mb-2">Order Summary</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748b]">Order Date:</span>
                      <span className="ml-2 text-[#1e293b]">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Quantity:</span>
                      <span className="ml-2 text-[#1e293b]">{quantity} bags</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Type:</span>
                      <span className="ml-2 text-[#1e293b]">{fertilizerType}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Unit Price:</span>
                      <span className="ml-2 text-[#1e293b]">
                        {fertilizerType === 'Urea' && 'LKR 4,500'}
                        {fertilizerType === 'DAP' && 'LKR 8,200'}
                        {fertilizerType === 'MOP' && 'LKR 6,800'}
                        {fertilizerType === 'NPK' && 'LKR 7,500'}
                        {fertilizerType === 'TSP' && 'LKR 5,200'}
                        {fertilizerType === 'Sulphur' && 'LKR 3,200'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#64748b]">Total:</span>
                      <span className="ml-2 text-[#15803d] font-semibold">
                        {fertilizerType === 'Urea' && `LKR ${(4500 * quantity * 1.05).toLocaleString()}`}
                        {fertilizerType === 'DAP' && `LKR ${(8200 * quantity * 1.05).toLocaleString()}`}
                        {fertilizerType === 'MOP' && `LKR ${(6800 * quantity * 1.05).toLocaleString()}`}
                        {fertilizerType === 'NPK' && `LKR ${(7500 * quantity * 1.05).toLocaleString()}`}
                        {fertilizerType === 'TSP' && `LKR ${(5200 * quantity * 1.05).toLocaleString()}`}
                        {fertilizerType === 'Sulphur' && `LKR ${(3200 * quantity * 1.05).toLocaleString()}`}
                      </span>
                      <span className="text-[10px] text-[#64748b]">(incl. 5% tax)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50 transition-colors rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateRequest}
                  disabled={isCreating || !selectedStation || !fertilizerType}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-[#15803d] text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      CREATING...
                    </>
                  ) : (
                    'CREATE REQUEST'
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
