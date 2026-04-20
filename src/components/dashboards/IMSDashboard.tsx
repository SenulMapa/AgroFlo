import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/AppStore';
import { DashboardHeader } from '../shared/DashboardHeader';
import {
  getProductsWithStock,
  getStockLogs,
  addProduct,
  addStock,
  removeStock,
  getLowStockProducts,
  getOutOfStockProducts,
  type StockWithLogs,
  type StockLog,
} from '@/lib/db/ims';
import {
  Package, Plus, TrendingDown,
  Search, History, AlertTriangle,
  ArrowDown, ArrowUp
} from 'lucide-react';

interface IMSDashboardProps {
  onLogout: () => void;
}

type TabType = 'products' | 'stock-in' | 'stock-out' | 'history' | 'alerts';

export function IMSDashboard({ onLogout }: IMSDashboardProps) {
  const { state } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [products, setProducts] = useState<StockWithLogs[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<StockWithLogs[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<StockWithLogs[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    type: '',
    category: '',
    unit: 'bag',
    unit_weight_kg: 50,
    unit_cost: 0,
    min_stock_threshold: 10,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, logsData, lowData, outData] = await Promise.all([
        getProductsWithStock(),
        getStockLogs(undefined, 100),
        getLowStockProducts(),
        getOutOfStockProducts(),
      ]);
      setProducts(productsData);
      setLogs(logsData);
      setLowStockProducts(lowData);
      setOutOfStockProducts(outData);
    } catch (e) {
      console.error('Error loading IMS data:', e);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-LK', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-orange-100 text-orange-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.sku || !formData.type) {
      alert('Please fill in required fields');
      return;
    }

    const result = await addProduct(formData);
    if (result) {
      setShowProductModal(false);
      setFormData({
        sku: '',
        name: '',
        type: '',
        category: '',
        unit: 'bag',
        unit_weight_kg: 50,
        unit_cost: 0,
        min_stock_threshold: 10,
      });
      loadData();
    }
  };

  const lowStockCount = products.filter(p => p.stock_status === 'low_stock').length;
  const outOfStockCount = products.filter(p => p.stock_status === 'out_of_stock').length;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <DashboardHeader title="Inventory Management System" onLogout={onLogout} />

      {/* Stats Bar */}
      <div className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-4 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 flex items-center justify-center rounded">
            <Package className="w-4 h-4 text-[#15803d]" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-[#1e293b]">{products.length}</div>
            <div className="text-xs text-[#64748b] uppercase">Products</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 flex items-center justify-center rounded">
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-orange-600">{lowStockCount}</div>
            <div className="text-xs text-[#64748b] uppercase">Low Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-100 flex items-center justify-center rounded">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <div className="text-lg font-mono font-semibold text-red-600">{outOfStockCount}</div>
            <div className="text-xs text-[#64748b] uppercase">Out of Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="h-8 pl-9 pr-3 border border-[#e2e8f0] text-sm rounded w-48 focus:outline-none focus:border-[#15803d]"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-[#e2e8f0] flex px-4">
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'stock-in', label: 'Stock In', icon: ArrowDown },
          { id: 'stock-out', label: 'Stock Out', icon: ArrowUp },
          { id: 'history', label: 'History', icon: History },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#15803d] text-[#15803d]'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'alerts' && (lowStockCount + outOfStockCount > 0) && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {lowStockCount + outOfStockCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'products' && (
          <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
                All Products ({filteredProducts.length})
              </span>
              <button
                onClick={() => {
                  setFormData({
                    sku: '',
                    name: '',
                    type: '',
                    category: '',
                    unit: 'bag',
                    unit_weight_kg: 50,
                    unit_cost: 0,
                    min_stock_threshold: 10,
                  });
                  setShowProductModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#15803d] text-white text-xs rounded hover:bg-green-800"
              >
                <Plus className="w-3 h-3" />
                Add Product
              </button>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f1f5f9]">
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">SKU</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Product</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Category</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Available</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Booked</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Total</th>
                  <th className="text-center text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Status</th>
                  <th className="text-center text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0] hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-xs">{product.sku}</td>
                    <td className="py-2 px-4 text-sm">{product.name}</td>
                    <td className="py-2 px-4 text-xs text-[#64748b]">{product.category || '-'}</td>
                    <td className="py-2 px-4 text-right font-mono text-sm text-green-700 font-medium">
                      {product.available_qty?.toFixed(1) || '0'}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-sm text-orange-700">
                      {product.booked_qty?.toFixed(1) || '0'}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-sm">
                      {product.total_qty?.toFixed(1) || '0'}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStockStatusColor(product.stock_status)}`}>
                        {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center text-xs text-[#64748b]">
                      Use Stock In/Out tabs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-[#64748b]">
                No products found
              </div>
            )}
          </div>
        )}

        {activeTab === 'stock-in' && (
          <div className="bg-white border border-[#e2e8f0] rounded p-6 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-green-600" />
              Stock In (Receive Stock)
            </h2>
            <ProductStockForm
              products={products}
              action="add"
              onSubmit={async (productId, quantity, reason) => {
                const success = await addStock(productId, quantity, reason, state.currentUser?.name || 'System');
                if (success) {
                  loadData();
                  alert('Stock added successfully');
                }
              }}
            />
          </div>
        )}

        {activeTab === 'stock-out' && (
          <div className="bg-white border border-[#e2e8f0] rounded p-6 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-red-600" />
              Stock Out (Dispatch Stock)
            </h2>
            <ProductStockForm
              products={products}
              action="remove"
              onSubmit={async (productId, quantity, reason) => {
                const success = await removeStock(productId, quantity, reason, state.currentUser?.name || 'System');
                if (success) {
                  loadData();
                  alert('Stock removed successfully');
                }
              }}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f1f5f9]">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
                Stock History ({logs.length})
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f1f5f9]">
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Date</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Product</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Type</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Before</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Change</th>
                  <th className="text-right text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">After</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">Reason</th>
                  <th className="text-left text-xs uppercase tracking-wider text-[#64748b] py-2 px-4 border-b border-[#e2e8f0]">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0]">
                    <td className="py-2 px-4 text-xs text-[#64748b]">{formatDate(log.created_at)}</td>
                    <td className="py-2 px-4 text-sm">
                      <div className="font-medium">{log.product_name}</div>
                      <div className="text-xs text-[#64748b] font-mono">{log.product_sku}</div>
                    </td>
                    <td className="py-2 px-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        log.change_type === 'stock_in' ? 'bg-green-100 text-green-800' :
                        log.change_type === 'stock_out' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.change_type === 'stock_in' ? 'Stock In' : 
                         log.change_type === 'stock_out' ? 'Stock Out' : 
                         'Adjustment'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-sm">{log.quantity_before?.toFixed(1)}</td>
                    <td className={`py-2 px-4 text-right font-mono text-sm font-medium ${
                      log.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {log.quantity_change >= 0 ? '+' : ''}{log.quantity_change?.toFixed(1)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-sm font-medium">{log.quantity_after?.toFixed(1)}</td>
                    <td className="py-2 px-4 text-sm text-[#64748b]">{log.reason || '-'}</td>
                    <td className="py-2 px-4 text-xs text-[#64748b]">{log.performed_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Low Stock */}
            <div className="bg-white border border-orange-200 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-200 bg-orange-50 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-800">
                  Low Stock Alert ({lowStockProducts.length})
                </span>
              </div>
              {lowStockProducts.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="text-left text-xs uppercase text-orange-700 py-2 px-4">Product</th>
                      <th className="text-right text-xs uppercase text-orange-700 py-2 px-4">Available</th>
                      <th className="text-right text-xs uppercase text-orange-700 py-2 px-4">Threshold</th>
                      <th className="text-center text-xs uppercase text-orange-700 py-2 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((product, idx) => (
                      <tr key={idx} className="border-b border-[#e2e8f0]">
                        <td className="py-2 px-4">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-[#64748b] font-mono">{product.sku}</div>
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-orange-700">{product.available_qty?.toFixed(1)}</td>
                        <td className="py-2 px-4 text-right font-mono text-[#64748b]">{product.min_stock_threshold}</td>
                        <td className="py-2 px-4 text-center text-xs text-[#64748b]">
                          Use Stock In tab
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-[#64748b]">No low stock items</div>
              )}
            </div>

            {/* Out of Stock */}
            <div className="bg-white border border-red-200 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800">
                  Out of Stock ({outOfStockProducts.length})
                </span>
              </div>
              {outOfStockProducts.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="text-left text-xs uppercase text-red-700 py-2 px-4">Product</th>
                      <th className="text-right text-xs uppercase text-red-700 py-2 px-4">Available</th>
                      <th className="text-center text-xs uppercase text-red-700 py-2 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockProducts.map((product, idx) => (
                      <tr key={idx} className="border-b border-[#e2e8f0]">
                        <td className="py-2 px-4">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-[#64748b] font-mono">{product.sku}</div>
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-red-600">{product.available_qty?.toFixed(1)}</td>
                        <td className="py-2 px-4 text-center text-xs text-[#64748b]">
                          Use Stock In tab
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-[#64748b]">No out of stock items</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg border border-[#e2e8f0] rounded animate-fade-in">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#15803d] flex items-center justify-between rounded-t">
              <span className="text-sm font-semibold text-white">Add New Product</span>
              <button onClick={() => setShowProductModal(false)} className="text-white hover:text-gray-200 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="FER-XXX-50"
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Urea (46-0-0)"
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  >
                    <option value="">Select Type...</option>
                    <option value="Urea">Urea</option>
                    <option value="DAP">DAP</option>
                    <option value="MOP">MOP</option>
                    <option value="NPK">NPK</option>
                    <option value="TSP">TSP</option>
                    <option value="Sulphur">Sulphur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Nitrogen, Phosphate, etc."
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  >
                    <option value="bag">Bag</option>
                    <option value="kg">kg</option>
                    <option value="ton">Ton</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.unit_weight_kg}
                    onChange={(e) => setFormData({ ...formData, unit_weight_kg: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Unit Cost (LKR)</label>
                  <input
                    type="number"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
                    className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Min Stock Threshold</label>
                <input
                  type="number"
                  value={formData.min_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, min_stock_threshold: Number(e.target.value) })}
                  placeholder="10"
                  className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-[#e2e8f0] text-sm rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-[#15803d] text-white text-sm rounded hover:bg-green-800"
                >
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for stock in/out forms
function ProductStockForm({
  products,
  action,
  onSubmit,
}: {
  products: StockWithLogs[];
  action: 'add' | 'remove';
  onSubmit: (productId: string, quantity: number, reason: string) => Promise<void>;
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.fertilizer_id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !reason) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(selectedProductId, quantity, reason);
      setSelectedProductId('');
      setQuantity(0);
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Product *</label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
        >
          <option value="">Select Product...</option>
          {products.map(p => (
            <option key={p.fertilizer_id} value={p.fertilizer_id}>
              {p.name} ({p.sku}) - Available: {p.available_qty?.toFixed(1)}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div className="bg-[#f1f5f9] rounded p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#64748b]">Current Stock:</span>
            <span className="font-mono font-semibold">{selectedProduct.available_qty?.toFixed(1)} {selectedProduct.unit}</span>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Quantity *</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          min={1}
          placeholder="Enter quantity"
          className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-[#64748b] block mb-1">Reason *</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={action === 'add' ? 'Purchase order, Return, etc.' : 'Dispatch, Damaged, etc.'}
          className="w-full h-10 px-3 border border-[#e2e8f0] text-sm focus:outline-none focus:border-[#15803d] rounded"
        />
      </div>

      {selectedProduct && quantity > 0 && action === 'remove' && quantity > (selectedProduct.available_qty || 0) && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
          Warning: Quantity exceeds available stock!
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 text-white text-sm font-medium rounded ${
          action === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        } disabled:opacity-50`}
      >
        {isSubmitting ? 'Processing...' : action === 'add' ? 'Receive Stock' : 'Dispatch Stock'}
      </button>
    </form>
  );
}

export default IMSDashboard;