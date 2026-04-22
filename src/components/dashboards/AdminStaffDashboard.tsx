import { useState, useMemo } from 'react';
import { useAppStore, useRequests, useSelectedRequest, useStations } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityBadge } from '../shared/PriorityBadge';
import { SLACountdown } from '../shared/SLACountdown';
import { AuditLog } from '../shared/AuditLog';
import { isRequestOverdue, type Priority } from '@/types';
import { fertilizerPrices } from '@/data/fertilizerDatabase';
import { toast } from 'sonner';
import {
  Search, MapPin, Calendar, Phone,
  ArrowRight, Package, AlertCircle, Loader2, Pencil
} from 'lucide-react';

interface AdminStaffDashboardProps {
  onLogout: () => void;
}

export function AdminStaffDashboard({ onLogout }: AdminStaffDashboardProps) {
  const { state, dispatch } = useAppStore();
  const requests = useRequests();
  const stations = useStations();
  const selectedRequest = useSelectedRequest();
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStation, setEditStation] = useState('');
  const [editFertilizerType, setEditFertilizerType] = useState('');
  const [editQuantity, setEditQuantity] = useState(50);
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [selectedStation, setSelectedStation] = useState('');
  const [fertilizerType, setFertilizerType] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [priority, setPriority] = useState<Priority>('medium');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

      const reqDate = new Date(request.date);
      const matchesDateFrom = !dateFrom || reqDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || reqDate <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesDistrict && matchesPriority && matchesDateFrom && matchesDateTo;
    });
  }, [requests, searchQuery, districtFilter, priorityFilter, dateFrom, dateTo]);

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
        user: state.currentUser?.id || '',
        role: 'admin_staff',
      },
    });

    setIsRouting(false);
  };

  const handleCreateRequest = async () => {
    if (!selectedStation || !fertilizerType || !state.currentUser?.id) {
      console.error('Missing required fields for request creation');
      return;
    }

    if (quantity <= 0 || quantity > 10000) {
      alert('Please enter a valid quantity between 1 and 10,000');
      return;
    }

    setIsCreating(true);

    const ferData = fertilizerPrices.find(p => p.type === fertilizerType);
    if (!ferData) {
      setIsCreating(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    const station = stations.find(s => s.id === selectedStation || s.name === selectedStation) || stations[0];
    if (!station) {
      console.error('Station not found');
      setIsCreating(false);
      return;
    }

    const tax = ferData.unitCost * quantity * 0.05;
    const itemTotal = ferData.unitCost * quantity;

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
        orderCreatedDate: new Date(),
        user: state.currentUser?.id || '',
      },
    });

    setIsCreating(false);
    setShowCreateModal(false);
    setSelectedStation('');
    setFertilizerType('');
    setQuantity(50);
    toast.success('Request created successfully');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const handleEditClick = () => {
    if (!selectedRequest) return;
    const item = selectedRequest.items[0];
    setEditStation(selectedRequest.station.id);
    setEditFertilizerType(item?.type || '');
    setEditQuantity(item?.quantity || 50);
    setEditPriority(selectedRequest.priority);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest || !editStation || !editFertilizerType || !state.currentUser?.id) {
      console.error('Missing required fields for edit:', { stationId: editStation, fertilizer: editFertilizerType, userId: state.currentUser?.id });
      return;
    }
    
    if (editQuantity <= 0 || editQuantity > 10000) {
      alert('Please enter a valid quantity between 1 and 10,000');
      return;
    }

    setIsEditing(true);
    const ferData = fertilizerPrices.find(p => p.type === editFertilizerType);
    if (!ferData) { setIsEditing(false); return; }

    // stations is now loaded from DB with real UUIDs via useStations() hook
    const station = stations.find(s => s.id === editStation) || stations[0];
    const itemTotal = ferData.unitCost * editQuantity;
    const tax = itemTotal * ferData.taxRate;
    const items = [{
      sku: ferData.sku,
      name: ferData.name,
      type: ferData.type,
      quantity: editQuantity,
      unitCost: ferData.unitCost,
      tax,
      total: itemTotal + tax,
    }];

    dispatch({
      type: 'EDIT_REQUEST',
      payload: {
        requestId: selectedRequest.id,
        station,
        items,
        priority: editPriority,
        user: state.currentUser?.id || '',
      },
    });

    setIsEditing(false);
    setShowEditModal(false);
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
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 h-7 px-2 border border-[#e2e8f0] text-xs focus:outline-none focus:border-[#15803d] bg-white rounded"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 h-7 px-2 border border-[#e2e8f0] text-xs focus:outline-none focus:border-[#15803d] bg-white rounded"
                title="To date"
              />
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditClick}
                        className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50 transition-colors rounded"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        EDIT
                      </button>
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
                    </div>
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
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.district}</option>
                  ))}
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

      {/* Edit Request Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-blue-600 flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Edit Fertilizer Request</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editStation}
                  onChange={(e) => setEditStation(e.target.value)}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                >
                  <option value="">Select Station...</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.district}</option>
                  ))}
                </select>
              </div>

              {/* Fertilizer Type */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Fertilizer Type</label>
                <select
                  value={editFertilizerType}
                  onChange={(e) => setEditFertilizerType(e.target.value)}
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
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                  min={10}
                  max={10000}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-white border border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50 transition-colors rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isEditing || !editStation || !editFertilizerType}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      SAVING...
                    </>
                  ) : (
                    'SAVE CHANGES'
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
