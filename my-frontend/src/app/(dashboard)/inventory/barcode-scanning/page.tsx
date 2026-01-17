'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Barcode, 
  Scan, 
  Camera,
  Search, 
  Plus,
  Download,
  Upload,
  Printer,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Filter
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface BarcodeItem {
  id: string;
  barcode: string;
  type: 'EAN13' | 'UPC' | 'CODE128' | 'QR' | 'DATAMATRIX';
  itemName: string;
  sku: string;
  category: string;
  quantity: number;
  location: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastScanned?: string;
  printCount: number;
}

interface ScanLog {
  id: string;
  barcode: string;
  itemName: string;
  action: 'in' | 'out' | 'count' | 'lookup';
  quantity: number;
  location: string;
  user: string;
  timestamp: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockBarcodeItems: BarcodeItem[] = [
  {
    id: 'B001',
    barcode: '4901234567890',
    type: 'EAN13',
    itemName: 'Industrial Valve Assembly',
    sku: 'IVA-001',
    category: 'Mechanical Parts',
    quantity: 150,
    location: 'MSA-A01-R01-B01',
    status: 'active',
    createdAt: '2024-01-05',
    lastScanned: '2024-01-15 14:30',
    printCount: 50
  },
  {
    id: 'B002',
    barcode: '012345678905',
    type: 'UPC',
    itemName: 'Control Panel Module',
    sku: 'CPM-002',
    category: 'Electronics',
    quantity: 80,
    location: 'MSA-A02-R01-B03',
    status: 'active',
    createdAt: '2024-01-06',
    lastScanned: '2024-01-15 11:20',
    printCount: 30
  },
  {
    id: 'B003',
    barcode: 'SAK003-2024-LOT1',
    type: 'CODE128',
    itemName: 'Sensor Array Kit',
    sku: 'SAK-003',
    category: 'Electronics',
    quantity: 200,
    location: 'CLD-A01-R02-B01',
    status: 'active',
    createdAt: '2024-01-08',
    lastScanned: '2024-01-14 16:45',
    printCount: 75
  },
  {
    id: 'B004',
    barcode: 'HPU004-BATCH-2024',
    type: 'QR',
    itemName: 'Hydraulic Pump Unit',
    sku: 'HPU-004',
    category: 'Mechanical Parts',
    quantity: 45,
    location: 'MSB-A01-R03-B02',
    status: 'inactive',
    createdAt: '2024-01-02',
    printCount: 20
  },
  {
    id: 'B005',
    barcode: 'SFS005-LOT-A',
    type: 'DATAMATRIX',
    itemName: 'Steel Frame Structure',
    sku: 'SFS-005',
    category: 'Raw Materials',
    quantity: 30,
    location: 'MSB-A02-R01-B01',
    status: 'pending',
    createdAt: '2024-01-10',
    printCount: 0
  }
];

const mockScanLogs: ScanLog[] = [
  { id: 'S001', barcode: '4901234567890', itemName: 'Industrial Valve Assembly', action: 'out', quantity: 10, location: 'MSA-A01-R01-B01', user: 'John Doe', timestamp: '2024-01-15 14:30' },
  { id: 'S002', barcode: '012345678905', itemName: 'Control Panel Module', action: 'in', quantity: 25, location: 'MSA-A02-R01-B03', user: 'Jane Smith', timestamp: '2024-01-15 11:20' },
  { id: 'S003', barcode: 'SAK003-2024-LOT1', itemName: 'Sensor Array Kit', action: 'count', quantity: 200, location: 'CLD-A01-R02-B01', user: 'Mike Wilson', timestamp: '2024-01-14 16:45' },
  { id: 'S004', barcode: '4901234567890', itemName: 'Industrial Valve Assembly', action: 'lookup', quantity: 0, location: 'MSA-A01-R01-B01', user: 'Sarah Brown', timestamp: '2024-01-14 10:15' },
  { id: 'S005', barcode: '012345678905', itemName: 'Control Panel Module', action: 'out', quantity: 5, location: 'MSA-A02-R01-B03', user: 'Tom Johnson', timestamp: '2024-01-13 09:30' },
];

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: BarcodeItem['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: BarcodeItem['type'] }) {
  const config = {
    EAN13: { label: 'EAN-13', className: 'bg-blue-100 text-blue-700' },
    UPC: { label: 'UPC', className: 'bg-purple-100 text-purple-700' },
    CODE128: { label: 'Code 128', className: 'bg-indigo-100 text-indigo-700' },
    QR: { label: 'QR Code', className: 'bg-green-100 text-green-700' },
    DATAMATRIX: { label: 'Data Matrix', className: 'bg-orange-100 text-orange-700' },
  }[type];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ActionBadge({ action }: { action: ScanLog['action'] }) {
  const config = {
    in: { label: 'Stock In', className: 'bg-green-100 text-green-700' },
    out: { label: 'Stock Out', className: 'bg-red-100 text-red-700' },
    count: { label: 'Stock Count', className: 'bg-blue-100 text-blue-700' },
    lookup: { label: 'Lookup', className: 'bg-gray-100 text-gray-700' },
  }[action];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function BarcodeVisual({ barcode, type }: { barcode: string; type: BarcodeItem['type'] }) {
  if (type === 'QR' || type === 'DATAMATRIX') {
    return (
      <div className="w-16 h-16 bg-gray-900 flex items-center justify-center rounded">
        <QrCode className="w-12 h-12 text-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-px h-10">
        {barcode.split('').slice(0, 12).map((_, i) => (
          <div 
            key={i}
            className="bg-gray-900"
            style={{ 
              width: Math.random() > 0.5 ? '2px' : '1px',
              opacity: Math.random() > 0.3 ? 1 : 0
            }}
          />
        ))}
      </div>
      <span className="text-xs font-mono mt-1">{barcode}</span>
    </div>
  );
}

function ScannerWidget() {
  const [scanInput, setScanInput] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);

  const handleScan = () => {
    if (scanInput) {
      setLastScan(scanInput);
      setScanInput('');
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white/20 rounded-lg">
          <Scan className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Quick Scan</h3>
          <p className="text-blue-100 text-sm">Scan or enter barcode</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Enter or scan barcode..."
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        <button 
          onClick={handleScan}
          className="px-4 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
        >
          Scan
        </button>
      </div>

      {lastScan && (
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-sm text-blue-100">Last scanned:</p>
          <p className="font-mono font-semibold">{lastScan}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">
          <Camera className="w-4 h-4" />
          Camera Scan
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">
          <Upload className="w-4 h-4" />
          Bulk Scan
        </button>
      </div>
    </div>
  );
}

function BarcodeTable({ items }: { items: BarcodeItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Scanned</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <BarcodeVisual barcode={item.barcode} type={item.type} />
                </div>
              </td>
              <td className="px-4 py-3">
                <TypeBadge type={item.type} />
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{item.itemName}</p>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.location}</td>
              <td className="px-4 py-3 text-sm font-medium">{item.quantity}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {item.lastScanned || 'Never'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded" title="Print">
                    <Printer className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="Copy">
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScanLogTable({ logs }: { logs: ScanLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">{log.timestamp}</td>
              <td className="px-4 py-3 font-mono text-sm">{log.barcode}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{log.itemName}</td>
              <td className="px-4 py-3">
                <ActionBadge action={log.action} />
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {log.quantity > 0 ? log.quantity : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.location}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.user}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BarcodeScanningPage() {
  const [activeTab, setActiveTab] = useState<'barcodes' | 'logs'>('barcodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return mockBarcodeItems.filter(item => {
      const matchesSearch = item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const stats = {
    totalBarcodes: mockBarcodeItems.length,
    activeBarcodes: mockBarcodeItems.filter(i => i.status === 'active').length,
    scansToday: 45,
    printedToday: 120
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Barcode Scanning</h1>
            <p className="text-gray-500">Manage barcodes and scan inventory</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Printer className="w-4 h-4" />
              Print Labels
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Generate Barcode
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats and Scanner */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="col-span-1 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalBarcodes}</p>
                <p className="text-sm text-gray-500">Total Barcodes</p>
              </div>
            </div>
          </div>
          <div className="col-span-1 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeBarcodes}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="col-span-1 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Scan className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scansToday}</p>
                <p className="text-sm text-gray-500">Scans Today</p>
              </div>
            </div>
          </div>
          <div className="col-span-1 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Printer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.printedToday}</p>
                <p className="text-sm text-gray-500">Printed Today</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-1">
            <ScannerWidget />
          </div>
          <div className="col-span-2 bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 text-left">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Stock In</p>
                  <p className="text-sm text-gray-500">Receive inventory</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 text-left">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Package className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Stock Out</p>
                  <p className="text-sm text-gray-500">Dispatch inventory</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 text-left">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Stock Count</p>
                  <p className="text-sm text-gray-500">Verify inventory</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 text-left">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Item Lookup</p>
                  <p className="text-sm text-gray-500">Find item details</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('barcodes')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'barcodes' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Barcode Registry
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'logs' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Scan History
          </button>
        </div>

        {activeTab === 'barcodes' && (
          <>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search barcodes, items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="EAN13">EAN-13</option>
                <option value="UPC">UPC</option>
                <option value="CODE128">Code 128</option>
                <option value="QR">QR Code</option>
                <option value="DATAMATRIX">Data Matrix</option>
              </select>
            </div>

            <div className="bg-white rounded-lg border">
              <BarcodeTable items={filteredItems} />
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg border">
            <ScanLogTable logs={mockScanLogs} />
          </div>
        )}
      </div>
    </div>
  );
}
