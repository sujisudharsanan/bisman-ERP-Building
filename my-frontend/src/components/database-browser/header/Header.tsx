 'use client';

import React, { useState } from 'react';
import { Plus, Download, ChevronDown, User } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  currentTable: string;
  rowCount: number;
  columnCount: number;
  onAddRow: () => void;
  onExport: () => void;
}

interface TableMetadata {
  [key: string]: {
    displayName: string;
    description: string;
    columns: number;
  };
}

const tableMetadata: TableMetadata = {
  users: { displayName: 'Users', description: 'System user accounts and profiles', columns: 14 },
  products: { displayName: 'Products', description: 'Product catalog and inventory items', columns: 18 },
  orders: { displayName: 'Orders', description: 'Customer orders and transactions', columns: 12 },
  transactions: { displayName: 'Transactions', description: 'Financial transaction records', columns: 16 },
  inventory: { displayName: 'Inventory', description: 'Stock levels and warehouse data', columns: 10 },
  suppliers: { displayName: 'Suppliers', description: 'Vendor and supplier information', columns: 8 },
  categories: { displayName: 'Categories', description: 'Product categorization system', columns: 6 },
  audit_logs: { displayName: 'Audit Logs', description: 'System activity and change logs', columns: 20 },
  permissions: { displayName: 'Permissions', description: 'User access permissions', columns: 7 },
  roles: { displayName: 'Roles', description: 'System roles and privileges', columns: 5 },
  dashboard: { displayName: 'Dashboard', description: 'Overview and analytics', columns: 0 },
};

export default function Header({ 
  currentTable, 
  rowCount, 
  columnCount, 
  onAddRow, 
  onExport 
}: HeaderProps) {
  // DEBUG: log imported components to catch "Element type is invalid" issues
  try {
    if (typeof window !== 'undefined') {
      // Client runtime
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Header imports (client):', {
        Avatar: typeof Avatar,
        AvatarImage: typeof AvatarImage,
        AvatarFallback: typeof AvatarFallback,
      });
    } else {
      // SSR/runtime
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Header imports (ssr):', {
        Avatar: !!Avatar,
        AvatarImage: !!AvatarImage,
        AvatarFallback: !!AvatarFallback,
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG] Error while logging Header imports', e);
  }

  const metadata = tableMetadata[currentTable] || { 
    displayName: currentTable, 
    description: 'Database table', 
    columns: columnCount 
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Table Info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Browsing Table: <span className="text-blue-600">{metadata.displayName}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">{metadata.description}</p>
          </div>
          
          {currentTable !== 'dashboard' && (
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                <span className="font-medium">Rows:</span>
                <span className="ml-1 text-blue-600">{rowCount.toLocaleString()}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                <span className="font-medium">Columns:</span>
                <span className="ml-1 text-green-600">{metadata.columns}</span>
              </Badge>
            </div>
          )}
        </div>

        {/* Right Section - Actions and Profile */}
        <div className="flex items-center space-x-3">
          {currentTable !== 'dashboard' && (
            <>
              {/* Add New Row Button */}
              <button 
                onClick={onAddRow}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Row
              </button>

              {/* Export Button */}
              <button 
                onClick={onExport}
                className="flex items-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Sheets
              </button>

              <div className="h-6 w-px bg-gray-300" />
            </>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/api/placeholder/32/32" alt="Admin" />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">Retail Client Mgmt</p>
                <p className="text-xs text-gray-500">admin@bisman.com</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
