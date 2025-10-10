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

// Dynamic columns from server rows
const inferColumns = (rows: any[]): TableColumn[] => {
  const first = rows && rows[0] ? rows[0] : null;
  if (!first) return [];
  return Object.keys(first).map(key => {
    const val = (first as any)[key];
    let type: TableColumn['type'] = 'text';
    if (key === 'id' || /_id$/.test(key)) type = key === 'id' ? 'id' : 'foreign_key';
    else if (typeof val === 'number') type = 'number';
    else if (typeof val === 'boolean') type = 'boolean';
    else if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) type = 'date';
    else if (typeof val === 'string' && val.includes('@')) type = 'email';
    return { key, label: key.replace(/_/g, ' '), type };
  });
};

export default function DatabaseBrowser() {
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState('users');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load tables list and initial data
  useEffect(() => {
    const loadTables = async () => {
      try {
        const res = await fetch('/api/v1/super-admin/tables', { credentials: 'include' });
        const json = await res.json();
        const names: string[] = (json?.data || []).map((t: any) => t.name);
        setTables(names);
        if (names.length && !names.includes(activeTable)) setActiveTable(names[0]);
      } catch (e:any) {
        setTables(['users']);
      }
    };
    loadTables();
  }, []);

  const toColumns = (c: any, r: any[]): TableColumn[] => {
    if (!c || (Array.isArray(c) && !c.length)) return inferColumns(r);
    if (Array.isArray(c) && typeof c[0] === 'string') {
      return (c as string[]).map((key) => {
        const sample = r && r[0] ? r[0][key] : undefined;
        let type: TableColumn['type'] = 'text';
        if (key === 'id' || /_id$/.test(key)) type = key === 'id' ? 'id' : 'foreign_key';
        else if (typeof sample === 'number') type = 'number';
        else if (typeof sample === 'boolean') type = 'boolean';
        else if (typeof sample === 'string' && /\d{4}-\d{2}-\d{2}T/.test(sample)) type = 'date';
        else if (typeof sample === 'string' && sample.includes('@')) type = 'email';
        return { key, label: key.replace(/_/g, ' '), type };
      });
    }
    return c as TableColumn[];
  };

  const loadData = async (table: string, page = 1, size = pageSize) => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/v1/super-admin/tables/${table}?page=${page}&limit=${size}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      const r = json.data?.rows || json.data?.users || json.data?.data || json.data || [];
      const cols = toColumns(json.data?.columns, r);
      setRows(r);
      setColumns(cols);
      setTotalRows(json.data?.count || r.length || 0);
    } catch (e:any) {
      setErr(e.message);
      setRows([]); setColumns([]); setTotalRows(0);
    } finally { setLoading(false); }
  };

  // Handle table selection
  const handleTableSelect = (table: string) => {
    setActiveTable(table);
    setCurrentPage(1);
    loadData(table, 1, pageSize);
    if (typeof toast !== 'undefined') toast.success(`Switched to ${table} table`);
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

  useEffect(() => {
    if (activeTable) loadData(activeTable, currentPage, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTable]);

  return (
    <div className="flex h-screen max-h-screen w-full max-w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeTable={activeTable}
        onTableSelect={handleTableSelect}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        tables={tables}
      />

      {/* Main Content */}
      <div className={`flex-1 min-w-0 overflow-hidden flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-0' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <Header
          currentTable={activeTable}
          rowCount={totalRows}
          columnCount={columns.length}
          onAddRow={handleAddRow}
          onExport={handleExport}
        />

        {/* Content Area */}
  <div className="flex-1 overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            {activeTable === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 lg:p-6 h-full overflow-auto"
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
                {err && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 m-4 rounded">{err}</div>
                )}
                <DataTable
                  tableName={activeTable}
                  data={rows}
                  columns={columns}
                  totalRows={totalRows}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={(p)=>{ setCurrentPage(p); loadData(activeTable, p, pageSize); }}
                  onPageSizeChange={(s)=>{ setPageSize(s); setCurrentPage(1); loadData(activeTable, 1, s); }}
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
