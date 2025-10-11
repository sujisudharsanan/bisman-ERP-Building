'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  ExternalLink,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
// Custom table components using standard HTML elements
const Table = ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className="w-full" {...props}>{children}</table>
);

const TableHeader = ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...props}>{children}</thead>
);

const TableBody = ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props}>{children}</tbody>
);

const TableRow = ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr {...props}>{children}</tr>
);

const TableHead = ({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
  <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ''}`} {...props}>
    {children}
  </th>
);

const TableCell = ({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
  <td className={`px-4 py-2 whitespace-nowrap text-sm text-gray-900 ${className || ''}`} {...props}>
    {children}
  </td>
);
// Temporarily replace dropdown with simple button until dropdown-menu component is fixed
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// Tooltip component temporarily removed due to import issues
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '@/components/ui/tooltip';
// Temporarily using standard HTML select until select component is fixed
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

interface DataTableProps {
  tableName: string;
  data: any[];
  columns: TableColumn[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onView: (row: any) => void;
}

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'id' | 'foreign_key';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable({
  tableName,
  data,
  columns,
  totalRows,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onView
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filter]) => {
      if (filter) {
        filtered = filtered.filter(row =>
          String(row[column]).toLowerCase().includes(filter.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection, columnFilters]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return null;
        return 'asc';
      });
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-4 h-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="w-4 h-4" />;
    return <ArrowUpDown className="w-4 h-4" />;
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderCellContent = (value: any, column: TableColumn) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>;
    }

    switch (column.type) {
      case 'id':
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {value}
          </Badge>
        );
      case 'foreign_key':
        return (
          <button 
            className="flex items-center text-blue-600 hover:text-blue-800"
            title={`Click to view related record (ID: ${value})`}
          >
            {value}
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        );
      case 'boolean':
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        );
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800">
            {value}
          </a>
        );
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        const stringValue = String(value);
        if (stringValue.length > 50) {
          return (
            <span 
              className="cursor-help" 
              title={stringValue}
            >
              {truncateText(stringValue)}
            </span>
          );
        }
        return stringValue;
    }
  };

  const totalPages = Math.ceil(totalRows / pageSize);
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden bg-white">
      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={`Search across ${tableName} columns...`}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <button className="flex items-center px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Table */}
  <div className="flex-1 overflow-auto min-w-0">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={`${column.width || 'w-auto'} border-b-2 border-gray-200`}
                >
                  <div className="flex flex-col space-y-2">
                    {/* Column Header */}
                    <div className="flex items-center space-x-2">
                      {column.sortable !== false ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="flex items-center space-x-1 hover:text-gray-900 transition-colors"
                        >
                          <span className="font-medium">{column.label}</span>
                          {getSortIcon(column.key)}
                        </button>
                      ) : (
                        <span className="font-medium">{column.label}</span>
                      )}
                      {column.type === 'id' && (
                        <Badge variant="outline" className="text-xs">PK</Badge>
                      )}
                      {column.type === 'foreign_key' && (
                        <Badge variant="outline" className="text-xs">FK</Badge>
                      )}
                    </div>
                    
                    {/* Column Filter */}
                    {column.filterable !== false && (
                      <Input
                        placeholder={`Filter ${(column.label || column.key || '').toString().toLowerCase()}...`}
                        value={columnFilters[column.key || ''] || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColumnFilters(prev => ({
                          ...prev,
                          [column.key || '']: e.target.value
                        }))}
                        className="h-7 text-xs"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((row, index) => (
              <motion.tr
                key={row.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className="py-3">
                    {renderCellContent(row[column.key], column)}
                  </TableCell>
                ))}
                <TableCell className="py-3">
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => onView(row)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEdit(row)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Edit Row"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(row)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors text-red-600"
                      title="Delete Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <select 
              value={String(pageSize)} 
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-20 h-8 border border-gray-300 bg-white rounded px-2 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {/* Status Text */}
          <div className="text-sm text-gray-700">
            Showing {startRow.toLocaleString()} - {endRow.toLocaleString()} of {totalRows.toLocaleString()} rows
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              &lt;&lt; First
            </button>
            <button
              className="px-3 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt; Prev
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage > 3 ? currentPage - 2 + i : i + 1;
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    className={`w-8 h-8 rounded ${
                      page === currentPage 
                        ? 'bg-blue-600 text-white' 
                        : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              className="px-3 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next &gt;
            </button>
            <button
              className="px-3 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
