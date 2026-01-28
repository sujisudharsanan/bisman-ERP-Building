'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  Building2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  bank: string;
  accountNumber: string;
  period: string;
  status: 'processing' | 'completed' | 'error';
  transactions: number;
  uploadedAt: string;
}

const mockUploads: UploadedFile[] = [
  { id: '1', name: 'HDFC_Jan2026.csv', size: '245 KB', bank: 'HDFC Bank', accountNumber: 'XXXX1234', period: 'Jan 2026', status: 'completed', transactions: 156, uploadedAt: '2026-01-15 10:30' },
  { id: '2', name: 'ICICI_Jan2026.xlsx', size: '312 KB', bank: 'ICICI Bank', accountNumber: 'XXXX5678', period: 'Jan 2026', status: 'completed', transactions: 89, uploadedAt: '2026-01-15 10:25' },
  { id: '3', name: 'SBI_Jan2026.csv', size: '128 KB', bank: 'State Bank of India', accountNumber: 'XXXX9012', period: 'Jan 2026', status: 'processing', transactions: 0, uploadedAt: '2026-01-15 10:35' },
];

export default function BankStatementUploadPage() {
  const [uploads, setUploads] = useState<UploadedFile[]>(mockUploads);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const icons = {
      completed: <CheckCircle2 className="w-3 h-3" />,
      processing: <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />,
      error: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Upload className="w-8 h-8 text-blue-600" />
          Bank Statement Upload
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload bank statements for reconciliation. Supports CSV, XLSX, and OFX formats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bank Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Bank Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bank</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Account</option>
                  <option value="current">Current Account - XXXX1234</option>
                  <option value="savings">Savings Account - XXXX5678</option>
                </select>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <FileSpreadsheet className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {isDragging ? 'Drop files here' : 'Drag & drop bank statements'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                or click to browse from your computer
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls,.ofx"
                multiple
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                Browse Files
              </label>
              <p className="text-xs text-gray-400 mt-4">
                Supported formats: CSV, XLSX, XLS, OFX (Max 10MB per file)
              </p>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Uploads</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Period</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {uploads.map((upload) => (
                    <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{upload.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{upload.size} • {upload.uploadedAt}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{upload.bank}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{upload.accountNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{upload.period}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {upload.status === 'processing' ? '...' : upload.transactions}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(upload.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Format Guide */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Format Guide</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">CSV Format</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date, Description, Debit, Credit, Balance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Excel Format</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Standard bank export format</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">OFX Format</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Open Financial Exchange</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Download Sample Template
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Upload Tips
            </h2>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Ensure date format matches your regional settings
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Remove any password protection from files
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Include headers in the first row
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Use consistent currency formatting
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
