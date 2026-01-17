'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  MapPin, 
  Grid3X3, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight,
  Layers,
  Box,
  Warehouse,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  MoreVertical
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface StorageLocation {
  id: string;
  code: string;
  name: string;
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
  type: 'standard' | 'cold_storage' | 'hazmat' | 'bulk' | 'picking';
  capacity: number;
  utilized: number;
  status: 'available' | 'full' | 'reserved' | 'blocked';
  currentItem?: string;
  currentQty?: number;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  type: 'receiving' | 'storage' | 'picking' | 'shipping' | 'staging';
  locationsCount: number;
  utilization: number;
  temperature?: string;
}

interface WarehouseStats {
  totalLocations: number;
  availableLocations: number;
  totalCapacity: number;
  currentStock: number;
  utilizationRate: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockZones: Zone[] = [
  { id: 'Z1', name: 'Receiving Area', code: 'RCV', type: 'receiving', locationsCount: 12, utilization: 45 },
  { id: 'Z2', name: 'Main Storage A', code: 'MSA', type: 'storage', locationsCount: 150, utilization: 78 },
  { id: 'Z3', name: 'Main Storage B', code: 'MSB', type: 'storage', locationsCount: 150, utilization: 82 },
  { id: 'Z4', name: 'Cold Storage', code: 'CLD', type: 'storage', locationsCount: 40, utilization: 65, temperature: '2-8°C' },
  { id: 'Z5', name: 'Picking Zone', code: 'PCK', type: 'picking', locationsCount: 80, utilization: 90 },
  { id: 'Z6', name: 'Shipping Dock', code: 'SHP', type: 'shipping', locationsCount: 8, utilization: 25 },
  { id: 'Z7', name: 'Staging Area', code: 'STG', type: 'staging', locationsCount: 20, utilization: 40 },
];

const mockLocations: StorageLocation[] = [
  { id: 'L001', code: 'MSA-A01-R01-B01', name: 'Main Storage A - Aisle 1 - Rack 1 - Bin 1', zone: 'Main Storage A', aisle: 'A01', rack: 'R01', bin: 'B01', type: 'standard', capacity: 100, utilized: 85, status: 'available', currentItem: 'Industrial Valve', currentQty: 85 },
  { id: 'L002', code: 'MSA-A01-R01-B02', name: 'Main Storage A - Aisle 1 - Rack 1 - Bin 2', zone: 'Main Storage A', aisle: 'A01', rack: 'R01', bin: 'B02', type: 'standard', capacity: 100, utilized: 100, status: 'full', currentItem: 'Sensor Module', currentQty: 100 },
  { id: 'L003', code: 'MSA-A01-R01-B03', name: 'Main Storage A - Aisle 1 - Rack 1 - Bin 3', zone: 'Main Storage A', aisle: 'A01', rack: 'R01', bin: 'B03', type: 'standard', capacity: 100, utilized: 0, status: 'available' },
  { id: 'L004', code: 'MSA-A01-R02-B01', name: 'Main Storage A - Aisle 1 - Rack 2 - Bin 1', zone: 'Main Storage A', aisle: 'A01', rack: 'R02', bin: 'B01', type: 'standard', capacity: 100, utilized: 50, status: 'reserved', currentItem: 'Control Panel', currentQty: 50 },
  { id: 'L005', code: 'CLD-A01-R01-B01', name: 'Cold Storage - Aisle 1 - Rack 1 - Bin 1', zone: 'Cold Storage', aisle: 'A01', rack: 'R01', bin: 'B01', type: 'cold_storage', capacity: 50, utilized: 40, status: 'available', currentItem: 'Temperature Sensor', currentQty: 40 },
  { id: 'L006', code: 'MSB-A02-R01-B01', name: 'Main Storage B - Aisle 2 - Rack 1 - Bin 1', zone: 'Main Storage B', aisle: 'A02', rack: 'R01', bin: 'B01', type: 'bulk', capacity: 500, utilized: 320, status: 'available', currentItem: 'Steel Rods', currentQty: 320 },
  { id: 'L007', code: 'PCK-A01-R01-B01', name: 'Picking Zone - Aisle 1 - Rack 1 - Bin 1', zone: 'Picking Zone', aisle: 'A01', rack: 'R01', bin: 'B01', type: 'picking', capacity: 30, utilized: 28, status: 'available', currentItem: 'Assembly Kit', currentQty: 28 },
  { id: 'L008', code: 'MSA-A02-R03-B02', name: 'Main Storage A - Aisle 2 - Rack 3 - Bin 2', zone: 'Main Storage A', aisle: 'A02', rack: 'R03', bin: 'B02', type: 'standard', capacity: 100, utilized: 0, status: 'blocked' },
];

const mockStats: WarehouseStats = {
  totalLocations: 460,
  availableLocations: 145,
  totalCapacity: 45000,
  currentStock: 32500,
  utilizationRate: 72.2,
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: StorageLocation['status'] }) {
  const config = {
    available: { label: 'Available', className: 'bg-green-100 text-green-700' },
    full: { label: 'Full', className: 'bg-blue-100 text-blue-700' },
    reserved: { label: 'Reserved', className: 'bg-yellow-100 text-yellow-700' },
    blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: StorageLocation['type'] }) {
  const config = {
    standard: { label: 'Standard', className: 'bg-gray-100 text-gray-700' },
    cold_storage: { label: 'Cold Storage', className: 'bg-cyan-100 text-cyan-700' },
    hazmat: { label: 'Hazmat', className: 'bg-orange-100 text-orange-700' },
    bulk: { label: 'Bulk', className: 'bg-purple-100 text-purple-700' },
    picking: { label: 'Picking', className: 'bg-indigo-100 text-indigo-700' },
  }[type];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ZoneCard({ zone }: { zone: Zone }) {
  const typeColors = {
    receiving: 'border-l-blue-500',
    storage: 'border-l-green-500',
    picking: 'border-l-yellow-500',
    shipping: 'border-l-purple-500',
    staging: 'border-l-gray-500',
  }[zone.type];

  return (
    <div className={`bg-white border rounded-lg p-4 border-l-4 ${typeColors} hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{zone.name}</h3>
          <p className="text-sm text-gray-500">{zone.code}</p>
        </div>
        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 capitalize">
          {zone.type}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Locations</span>
          <span className="font-medium">{zone.locationsCount}</span>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Utilization</span>
            <span className={`font-medium ${
              zone.utilization > 80 ? 'text-red-600' : 
              zone.utilization > 60 ? 'text-yellow-600' : 'text-green-600'
            }`}>{zone.utilization}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                zone.utilization > 80 ? 'bg-red-500' : 
                zone.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${zone.utilization}%` }}
            />
          </div>
        </div>
        {zone.temperature && (
          <div className="flex items-center gap-1 text-sm text-cyan-600 mt-2">
            <span>🌡️ {zone.temperature}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LocationTable({ locations }: { locations: StorageLocation[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location Code</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Item</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {locations.map((location) => (
            <tr key={location.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{location.code}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{location.zone}</td>
              <td className="px-4 py-3">
                <TypeBadge type={location.type} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        location.utilized / location.capacity >= 0.9 ? 'bg-red-500' :
                        location.utilized / location.capacity >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(location.utilized / location.capacity) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{location.utilized}/{location.capacity}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {location.currentItem ? (
                  <div>
                    <p className="text-gray-900">{location.currentItem}</p>
                    <p className="text-xs text-gray-500">Qty: {location.currentQty}</p>
                  </div>
                ) : (
                  <span className="text-gray-400">Empty</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={location.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="More">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
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

function VisualWarehouseMap() {
  // Simplified visual representation
  const aisles = ['A', 'B', 'C', 'D', 'E'];
  const racks = [1, 2, 3, 4, 5, 6];

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Warehouse Map</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" /> Full
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-300" /> Blocked
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex gap-1 mb-2">
            <div className="w-8" />
            {racks.map((rack) => (
              <div key={rack} className="flex-1 text-center text-xs text-gray-500">
                R{rack}
              </div>
            ))}
          </div>
          {/* Rows */}
          {aisles.map((aisle) => (
            <div key={aisle} className="flex gap-1 mb-1">
              <div className="w-8 text-xs text-gray-500 flex items-center justify-center">
                {aisle}
              </div>
              {racks.map((rack) => {
                const utilization = Math.random();
                return (
                  <div 
                    key={`${aisle}-${rack}`}
                    className={`flex-1 h-8 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                      utilization > 0.9 ? 'bg-red-500' :
                      utilization > 0.5 ? 'bg-yellow-500' :
                      utilization > 0 ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    title={`Aisle ${aisle} - Rack ${rack}: ${Math.round(utilization * 100)}% utilized`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BinLocationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'zones' | 'map'>('list');

  const filteredLocations = useMemo(() => {
    return mockLocations.filter(location => {
      const matchesSearch = location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (location.currentItem?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesZone = zoneFilter === 'all' || location.zone === zoneFilter;
      const matchesStatus = statusFilter === 'all' || location.status === statusFilter;
      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [searchQuery, zoneFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bin Location Management</h1>
            <p className="text-gray-500">Manage warehouse storage locations and zones</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Grid3X3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.totalLocations}</p>
                <p className="text-sm text-gray-500">Total Locations</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.availableLocations}</p>
                <p className="text-sm text-gray-500">Available</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.totalCapacity.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Capacity</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Box className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.currentStock.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Current Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Layers className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.utilizationRate}%</p>
                <p className="text-sm text-gray-500">Utilization</p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('zones')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'zones' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              Zone View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'map' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              Map View
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
              </div>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Zones</option>
                {mockZones.map((zone) => (
                  <option key={zone.id} value={zone.name}>{zone.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="reserved">Reserved</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border">
            <LocationTable locations={filteredLocations} />
          </div>
        )}

        {viewMode === 'zones' && (
          <div className="grid grid-cols-4 gap-4">
            {mockZones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </div>
        )}

        {viewMode === 'map' && (
          <VisualWarehouseMap />
        )}
      </div>
    </div>
  );
}
