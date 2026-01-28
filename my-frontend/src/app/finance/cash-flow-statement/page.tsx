'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';

interface CashFlowLineItem {
  id: string;
  category: string;
  lineItem: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: number;
}

interface CashFlowSection {
  title: string;
  items: CashFlowLineItem[];
  subtotal: number;
  previousSubtotal: number;
}

const operatingActivities: CashFlowLineItem[] = [
  { id: '1', category: 'Operating', lineItem: 'Net Income', currentPeriod: 15000000, previousPeriod: 12500000, variance: 2500000, variancePercent: 20 },
  { id: '2', category: 'Operating', lineItem: 'Depreciation & Amortization', currentPeriod: 3500000, previousPeriod: 3200000, variance: 300000, variancePercent: 9.4 },
  { id: '3', category: 'Operating', lineItem: 'Changes in Accounts Receivable', currentPeriod: -2000000, previousPeriod: -1500000, variance: -500000, variancePercent: -33.3 },
  { id: '4', category: 'Operating', lineItem: 'Changes in Inventory', currentPeriod: -1500000, previousPeriod: -800000, variance: -700000, variancePercent: -87.5 },
  { id: '5', category: 'Operating', lineItem: 'Changes in Accounts Payable', currentPeriod: 1200000, previousPeriod: 900000, variance: 300000, variancePercent: 33.3 },
  { id: '6', category: 'Operating', lineItem: 'Other Operating Activities', currentPeriod: 500000, previousPeriod: 400000, variance: 100000, variancePercent: 25 },
];

const investingActivities: CashFlowLineItem[] = [
  { id: '7', category: 'Investing', lineItem: 'Purchase of Property & Equipment', currentPeriod: -5000000, previousPeriod: -3000000, variance: -2000000, variancePercent: -66.7 },
  { id: '8', category: 'Investing', lineItem: 'Sale of Investments', currentPeriod: 1500000, previousPeriod: 500000, variance: 1000000, variancePercent: 200 },
  { id: '9', category: 'Investing', lineItem: 'Purchase of Investments', currentPeriod: -2000000, previousPeriod: -1500000, variance: -500000, variancePercent: -33.3 },
];

const financingActivities: CashFlowLineItem[] = [
  { id: '10', category: 'Financing', lineItem: 'Proceeds from Borrowings', currentPeriod: 5000000, previousPeriod: 0, variance: 5000000, variancePercent: 100 },
  { id: '11', category: 'Financing', lineItem: 'Repayment of Borrowings', currentPeriod: -2000000, previousPeriod: -1500000, variance: -500000, variancePercent: -33.3 },
  { id: '12', category: 'Financing', lineItem: 'Dividends Paid', currentPeriod: -3000000, previousPeriod: -2500000, variance: -500000, variancePercent: -20 },
  { id: '13', category: 'Financing', lineItem: 'Interest Paid', currentPeriod: -800000, previousPeriod: -600000, variance: -200000, variancePercent: -33.3 },
];

export default function CashFlowStatementPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q4-2025');
  const [comparisonPeriod, setComparisonPeriod] = useState('Q3-2025');

  const sections: CashFlowSection[] = useMemo(() => {
    const calcSubtotal = (items: CashFlowLineItem[]) => items.reduce((sum, i) => sum + i.currentPeriod, 0);
    const calcPrevSubtotal = (items: CashFlowLineItem[]) => items.reduce((sum, i) => sum + i.previousPeriod, 0);
    
    return [
      { title: 'Cash Flows from Operating Activities', items: operatingActivities, subtotal: calcSubtotal(operatingActivities), previousSubtotal: calcPrevSubtotal(operatingActivities) },
      { title: 'Cash Flows from Investing Activities', items: investingActivities, subtotal: calcSubtotal(investingActivities), previousSubtotal: calcPrevSubtotal(investingActivities) },
      { title: 'Cash Flows from Financing Activities', items: financingActivities, subtotal: calcSubtotal(financingActivities), previousSubtotal: calcPrevSubtotal(financingActivities) },
    ];
  }, []);

  const totals = useMemo(() => {
    const netChange = sections.reduce((sum, s) => sum + s.subtotal, 0);
    const prevNetChange = sections.reduce((sum, s) => sum + s.previousSubtotal, 0);
    const beginningCash = 25000000;
    const endingCash = beginningCash + netChange;
    return { netChange, prevNetChange, beginningCash, endingCash };
  }, [sections]);

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(absAmount);
    return amount < 0 ? `(${formatted})` : formatted;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              Cash Flow Statement
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Statement of Cash Flows - Indirect Method
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="Q4-2025">Q4 2025</option>
                <option value="Q3-2025">Q3 2025</option>
                <option value="Q2-2025">Q2 2025</option>
                <option value="Q1-2025">Q1 2025</option>
                <option value="FY-2025">Full Year 2025</option>
              </select>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {sections.map((section, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{section.title.replace('Cash Flows from ', '')}</p>
            <p className={`text-2xl font-bold mt-2 ${section.subtotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(section.subtotal)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {section.subtotal > section.previousSubtotal ? (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className="text-xs text-gray-500">vs {comparisonPeriod}</span>
            </div>
          </div>
        ))}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-xs text-blue-100 uppercase tracking-wider">Net Change in Cash</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(totals.netChange)}</p>
          <p className="text-xs text-blue-100 mt-1">Ending: {formatCurrency(totals.endingCash)}</p>
        </div>
      </div>

      {/* Statement */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
            <div className="col-span-6">Line Item</div>
            <div className="col-span-2 text-right">{selectedPeriod}</div>
            <div className="col-span-2 text-right">{comparisonPeriod}</div>
            <div className="col-span-2 text-right">Change</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30">
                <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
              </div>
              {section.items.map((item) => (
                <div key={item.id} className="px-6 py-3 grid grid-cols-12 gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <div className="col-span-6 text-sm text-gray-700 dark:text-gray-300 pl-4">{item.lineItem}</div>
                  <div className={`col-span-2 text-sm text-right font-medium ${item.currentPeriod >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                    {formatCurrency(item.currentPeriod)}
                  </div>
                  <div className={`col-span-2 text-sm text-right ${item.previousPeriod >= 0 ? 'text-gray-600 dark:text-gray-400' : 'text-red-500'}`}>
                    {formatCurrency(item.previousPeriod)}
                  </div>
                  <div className={`col-span-2 text-sm text-right ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.variance >= 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                  </div>
                </div>
              ))}
              <div className="px-6 py-3 bg-gray-100 dark:bg-gray-700/50 grid grid-cols-12 gap-4 border-t border-gray-200 dark:border-gray-600">
                <div className="col-span-6 text-sm font-semibold text-gray-900 dark:text-white pl-4">
                  Net Cash from {section.title.replace('Cash Flows from ', '')}
                </div>
                <div className={`col-span-2 text-sm text-right font-bold ${section.subtotal >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                  {formatCurrency(section.subtotal)}
                </div>
                <div className={`col-span-2 text-sm text-right font-medium ${section.previousSubtotal >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-500'}`}>
                  {formatCurrency(section.previousSubtotal)}
                </div>
                <div className="col-span-2 text-sm text-right font-medium text-gray-600 dark:text-gray-400">
                  {((section.subtotal - section.previousSubtotal) / Math.abs(section.previousSubtotal) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}

          {/* Final Totals */}
          <div className="bg-blue-50 dark:bg-blue-900/20">
            <div className="px-6 py-3 grid grid-cols-12 gap-4">
              <div className="col-span-6 text-sm font-semibold text-gray-900 dark:text-white">Net Change in Cash</div>
              <div className={`col-span-2 text-sm text-right font-bold ${totals.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.netChange)}
              </div>
              <div className="col-span-2 text-sm text-right font-medium text-gray-600 dark:text-gray-400">
                {formatCurrency(totals.prevNetChange)}
              </div>
              <div className="col-span-2"></div>
            </div>
            <div className="px-6 py-3 grid grid-cols-12 gap-4">
              <div className="col-span-6 text-sm text-gray-700 dark:text-gray-300">Beginning Cash Balance</div>
              <div className="col-span-2 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(totals.beginningCash)}</div>
              <div className="col-span-4"></div>
            </div>
            <div className="px-6 py-4 grid grid-cols-12 gap-4 border-t-2 border-blue-200 dark:border-blue-800">
              <div className="col-span-6 text-base font-bold text-gray-900 dark:text-white">Ending Cash Balance</div>
              <div className="col-span-2 text-base text-right font-bold text-blue-600">{formatCurrency(totals.endingCash)}</div>
              <div className="col-span-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
