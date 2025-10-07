'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Sidebar from './sidebar/Sidebar';
import Header from './header/Header';
import DataTable from './datagrid/DataTable';

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'id' | 'foreign_key';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

// Sample data for different tables
const sampleData = {
  users: [
    {
      id: 1,
      username: 'john_doe',
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      status: true,
      role_id: 2,
      created_at: '2024-01-15T10:30:00Z',
      last_login: '2024-10-06T08:15:00Z',
      phone: '+1-555-0123',
      department: 'Engineering',
      salary: 75000,
      is_active: true,
      manager_id: 5,
      bio: 'Senior software engineer with expertise in React and Node.js. Passionate about building scalable web applications.'
    },
    {
      id: 2,
      username: 'jane_smith',
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      status: true,
      role_id: 3,
      created_at: '2024-02-20T14:22:00Z',
      last_login: '2024-10-06T09:45:00Z',
      phone: '+1-555-0124',
      department: 'Marketing',
      salary: 68000,
      is_active: true,
      manager_id: 8,
      bio: 'Digital marketing specialist focused on growth strategies and customer acquisition.'
    },
    {
      id: 3,
      username: 'admin_user',
      email: 'admin@example.com',
      first_name: 'System',
      last_name: 'Administrator',
      status: true,
      role_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-10-06T10:00:00Z',
      phone: '+1-555-0100',
      department: 'IT',
      salary: 95000,
      is_active: true,
      manager_id: null,
      bio: 'System administrator responsible for maintaining infrastructure and security protocols.'
    }
  ],
  products: [
    {
      id: 1,
      name: 'Premium Gasoline',
      sku: 'FUEL-PREM-001',
      price: 4.25,
      category_id: 1,
      supplier_id: 10,
      stock_quantity: 15000,
      unit: 'gallons',
      status: true,
      created_at: '2024-01-01T00:00:00Z'
    }
  ],
  audit_logs: [
    {
      id: 1,
      table_name: 'users',
      record_id: 1,
      action: 'UPDATE',
      old_values: '{"email": "old@example.com"}',
      new_values: '{"email": "john.doe@example.com"}',
      user_id: 3,
      timestamp: '2024-10-06T10:15:00Z',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  ]
};

// Column definitions for different tables
const tableColumns: Record<string, TableColumn[]> = {
  users: [
    { key: 'id', label: 'ID', type: 'id', width: 'w-16' },
    { key: 'username', label: 'Username', type: 'text', width: 'w-32' },
    { key: 'email', label: 'Email', type: 'email', width: 'w-48' },
    { key: 'first_name', label: 'First Name', type: 'text', width: 'w-32' },
    { key: 'last_name', label: 'Last Name', type: 'text', width: 'w-32' },
    { key: 'department', label: 'Department', type: 'text', width: 'w-32' },
    { key: 'salary', label: 'Salary', type: 'number', width: 'w-24' },
    { key: 'role_id', label: 'Role', type: 'foreign_key', width: 'w-20' },
    { key: 'is_active', label: 'Active', type: 'boolean', width: 'w-20' },
    { key: 'created_at', label: 'Created', type: 'date', width: 'w-32' }
  ],
  products: [
    { key: 'id', label: 'ID', type: 'id', width: 'w-16' },
    { key: 'name', label: 'Product Name', type: 'text', width: 'w-48' },
    { key: 'sku', label: 'SKU', type: 'text', width: 'w-32' },
    { key: 'price', label: 'Price', type: 'number', width: 'w-24' },
    { key: 'status', label: 'Status', type: 'boolean', width: 'w-20' }
  ],
  audit_logs: [
    { key: 'id', label: 'ID', type: 'id', width: 'w-16' },
    { key: 'table_name', label: 'Table', type: 'text', width: 'w-32' },
    { key: 'action', label: 'Action', type: 'text', width: 'w-24' },
    { key: 'user_id', label: 'User', type: 'foreign_key', width: 'w-20' },
    { key: 'timestamp', label: 'Timestamp', type: 'date', width: 'w-40' }
  ]
};

export default function DatabaseBrowser() {
  const [activeTable, setActiveTable] = useState('users');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Get current table data
  const currentData = sampleData[activeTable as keyof typeof sampleData] || [];
  const currentColumns = tableColumns[activeTable] || [];
  const totalRows = currentData.length;

  // Handle table selection
  const handleTableSelect = (table: string) => {
    setActiveTable(table);
    setCurrentPage(1);
    if (typeof toast !== 'undefined') {
      toast.success(`Switched to ${table} table`);
    }
  };

  // Handle actions
  const handleAddRow = () => {
    console.log(`Add new row to ${activeTable} table`);
  };

  const handleExport = () => {
    console.log(`Exporting ${activeTable} data to CSV`);
  };

  const handleEdit = (row: any) => {
    console.log(`Editing ${activeTable} record:`, row.id);
  };

  const handleDelete = (row: any) => {
    console.log(`Delete ${activeTable} record:`, row.id);
  };

  const handleView = (row: any) => {
    console.log(`Viewing ${activeTable} record:`, row.id);
  };

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeTable={activeTable}
        onTableSelect={handleTableSelect}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-0' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <Header
          currentTable={activeTable}
          rowCount={totalRows}
          columnCount={currentColumns.length}
          onAddRow={handleAddRow}
          onExport={handleExport}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTable === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 h-full overflow-auto"
              >
                <div className="max-w-6xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Overview</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Tables:</span>
                          <span className="font-medium">10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Records:</span>
                          <span className="font-medium">234,567</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={activeTable}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <DataTable
                  tableName={activeTable}
                  data={currentData}
                  columns={currentColumns}
                  totalRows={totalRows}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
