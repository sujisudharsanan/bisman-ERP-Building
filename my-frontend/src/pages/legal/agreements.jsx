import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';

// i18n placeholder
const t = (k) => {
  const dict = {
    'agreements.title': 'Agreements & Contracts',
    'agreements.search.placeholder': 'Search by ID, party, reference...',
    'agreements.filters.type': 'Contract Type',
    'agreements.filters.status': 'Status',
    'agreements.filters.party': 'Party',
    'agreements.filters.dateRange': 'Date Range',
    'agreements.filters.hasAttachment': 'Has Attachment',
    'agreements.table.agreementId': 'Agreement ID',
    'agreements.table.contractType': 'Type',
    'agreements.table.reference': 'Reference / Title',
    'agreements.table.party': 'Party',
    'agreements.table.startDate': 'Start Date',
    'agreements.table.endDate': 'End Date',
    'agreements.table.validity': 'Term',
    'agreements.table.status': 'Status',
    'agreements.table.baseAmount': 'Base Amount',
    'agreements.table.advanceAmount': 'Advance',
    'agreements.table.totalPaid': 'Total Paid',
    'agreements.table.totalInvoiced': 'Total Invoiced',
    'agreements.table.totalDeductions': 'Deductions',
    'agreements.table.balance': 'Balance',
    'agreements.table.notificationsDue': 'Next Reminder',
    'agreements.table.attachments': 'Attachments',
    'agreements.table.actions': 'Actions',
    'agreements.table.view': 'View'
  };
  return dict[k] || k;
};

function StatusBadge({ status, endDate }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  const today = dayjs();
  const ed = dayjs(endDate);
  let cls = 'bg-gray-600 text-white';
  if (status === 'expired' || ed.isBefore(today, 'day')) cls = 'bg-red-600 text-white';
  else if (status === 'expiring_soon') cls = 'bg-amber-500 text-black';
  else if (status === 'active') cls = 'bg-green-600 text-white';
  else if (status === 'suspended') cls = 'bg-purple-600 text-white';
  return <span className={cls + ' ' + base} aria-label={`Status: ${status}`}>{status.replace('_',' ')}</span>;
}

function AgreementsLegalPage() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(20);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '', hasAttachment: '', dateFrom: '', dateTo: '' });
  const [darkMode, setDarkMode] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);
    params.append('page', page);
    params.append('per_page', perPage);
    try {
      const res = await fetch(`/api/agreements?${params.toString()}`);
      const json = await res.json();
      setAgreements(json.data || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, filters, page, perPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className={darkMode ? 'min-h-screen bg-gray-900 text-gray-100' : 'min-h-screen bg-gray-50 text-gray-900'}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold" aria-label={t('agreements.title')}>{t('agreements.title')}</h1>
          <div className="flex items-center gap-2">
            <input
              aria-label={t('agreements.search.placeholder')}
              type="text"
              placeholder={t('agreements.search.placeholder')}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-64 px-3 py-2 rounded border border-gray-600 bg-gray-800 text-sm focus:outline-none focus:ring"
            />
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-2 rounded border border-gray-600 bg-gray-800 text-xs"
            >{darkMode ? 'Light' : 'Dark'}</button>
            <button
              type="button"
              disabled
              className="px-3 py-2 rounded bg-gray-700 text-gray-400 cursor-not-allowed text-xs"
              aria-disabled="true"
            >Export CSV</button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" role="region" aria-label="Filters">
          <select
            aria-label={t('agreements.filters.type')}
            value={filters.type}
            onChange={(e)=>{ setFilters(f=>({...f, type:e.target.value})); setPage(1); }}
            className="px-2 py-2 rounded border border-gray-600 bg-gray-800 text-sm"
          >
            <option value="">{t('agreements.filters.type')}</option>
            <option value="rent">Rent</option>
            <option value="vendor">Vendor</option>
            <option value="client">Client</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
          <select
            aria-label={t('agreements.filters.status')}
            value={filters.status}
            onChange={(e)=>{ setFilters(f=>({...f, status:e.target.value})); setPage(1); }}
            className="px-2 py-2 rounded border border-gray-600 bg-gray-800 text-sm"
          >
            <option value="">{t('agreements.filters.status')}</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
          </select>
          <input
            type="date"
            aria-label="Start date from"
            value={filters.dateFrom}
            onChange={(e)=>{ setFilters(f=>({...f, dateFrom:e.target.value})); setPage(1); }}
            className="px-2 py-2 rounded border border-gray-600 bg-gray-800 text-sm"
          />
          <input
            type="date"
            aria-label="End date to"
            value={filters.dateTo}
            onChange={(e)=>{ setFilters(f=>({...f, dateTo:e.target.value})); setPage(1); }}
            className="px-2 py-2 rounded border border-gray-600 bg-gray-800 text-sm"
          />
          <select
            aria-label={t('agreements.filters.hasAttachment')}
            value={filters.hasAttachment}
            onChange={(e)=>{ setFilters(f=>({...f, hasAttachment:e.target.value})); setPage(1); }}
            className="px-2 py-2 rounded border border-gray-600 bg-gray-800 text-sm"
          >
            <option value="">{t('agreements.filters.hasAttachment')}</option>
            <option value="Y">Yes</option>
            <option value="N">No</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" role="table" aria-label="Agreements table">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-gray-200">
                <th className="text-left px-3 py-2">{t('agreements.table.agreementId')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.contractType')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.reference')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.party')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.startDate')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.endDate')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.validity')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.status')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.baseAmount')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.advanceAmount')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.totalPaid')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.totalInvoiced')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.totalDeductions')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.balance')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.notificationsDue')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.attachments')}</th>
                <th className="text-left px-3 py-2">{t('agreements.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={17} className="px-3 py-6 text-center">Loading...</td></tr>
              )}
              {!loading && agreements.length === 0 && (
                <tr><td colSpan={17} className="px-3 py-6 text-center">No results</td></tr>
              )}
              {agreements.map(a => {
                const start = dayjs(a.start_date);
                const end = dayjs(a.end_date);
                const validityDays = end.diff(start, 'day');
                return (
                  <tr key={a.id} className="border-t border-gray-700 hover:bg-gray-800 focus-within:bg-gray-800">
                    <td className="px-3 py-2 font-mono" aria-label={`Agreement ${a.reference}`}>{a.reference}</td>
                    <td className="px-3 py-2 capitalize" aria-label={`Type ${a.contract_type}`}>{a.contract_type}</td>
                    <td className="px-3 py-2" aria-label={`Title ${a.title}`}>{a.title}</td>
                    <td className="px-3 py-2 underline decoration-dotted cursor-pointer" role="link" tabIndex={0}>{a.party?.id}</td>
                    <td className="px-3 py-2" aria-label={`Start ${a.start_date}`}>{start.format('YYYY-MM-DD')}</td>
                    <td className="px-3 py-2" aria-label={`End ${a.end_date}`}>{end.format('YYYY-MM-DD')}</td>
                    <td className="px-3 py-2" aria-label={`Validity ${validityDays} days`}>{validityDays}d</td>
                    <td className="px-3 py-2"><StatusBadge status={a.status} endDate={a.end_date} /></td>
                    <td className="px-3 py-2" aria-label={`Base ${a.base_amount}`}>{a.base_amount}</td>
                    <td className="px-3 py-2" aria-label={`Advance ${a.advance_amount}`}>{a.advance_amount}</td>
                    <td className="px-3 py-2" aria-label={`Paid ${a.total_paid}`}>{a.total_paid}</td>
                    <td className="px-3 py-2" aria-label={`Invoiced ${a.total_invoiced}`}>{a.total_invoiced}</td>
                    <td className="px-3 py-2" aria-label={`Deductions ${a.total_deductions}`}>{a.total_deductions}</td>
                    <td className="px-3 py-2" aria-label={`Balance ${a.balance}`}>{a.balance}</td>
                    <td className="px-3 py-2" aria-label={`Next Reminder ${a.next_notification_date || '—'}`}>{a.next_notification_date || '—'}</td>
                    <td className="px-3 py-2" aria-label={`Attachments ${a.attachments_count}`}>{a.attachments_count}</td>
                    <td className="px-3 py-2">
                      <button disabled className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs cursor-not-allowed" aria-disabled="true">{t('agreements.table.view')}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4" aria-label="Pagination controls">
          <span className="text-xs">Page {page} of {totalPages || 1}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-gray-800 disabled:opacity-50 text-xs"
            >Prev</button>
            <button
              onClick={() => setPage(p => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded bg-gray-800 disabled:opacity-50 text-xs"
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgreementsLegalPage;