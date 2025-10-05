'use client'

import { useState } from 'react'
// Simple local Card component to avoid missing module import
const Card = ({ children, className = '', ...props }: any) => {
  return (
    <div className={`rounded-lg border bg-card ${className}`} {...props}>
      {children}
    </div>
  )
}
// Local fallback Button to avoid missing module import
const Button = ({ children, variant = 'default', className = '', ...props }: any) => {
  const base = 'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition';
  const variants: Record<string, string> = {
    default: 'bg-primary text-white hover:opacity-90',
    outlined: 'border bg-transparent text-muted-foreground hover:bg-muted/50'
  };
  const cls = `${base} ${variants[variant] ?? variants.default} ${className}`.trim();
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
const Badge = ({ children, className = '', ...props }: any) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`} {...props}>
      {children}
    </span>
  )
}
const Input = ({ className = '', ...props }: any) => {
  return (
    <input
      className={`w-full rounded-md border px-3 py-2 text-sm ${className}`}
      {...props}
    />
  )
}
import { PermissionGate } from '@/components/common/PermissionGate'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Download, 
  Plus,
  CreditCard,
  Banknote,
  Receipt,
  FileText
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'cancelled'
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'income',
    category: 'Sales',
    description: 'Product sales - Week 2',
    amount: 15750.00,
    date: '2024-01-15',
    status: 'completed'
  },
  {
    id: '2',
    type: 'expense',
    category: 'Inventory',
    description: 'Stock purchase - Supplier ABC',
    amount: 8500.00,
    date: '2024-01-14',
    status: 'completed'
  },
  {
    id: '3',
    type: 'expense',
    category: 'Utilities',
    description: 'Monthly electricity bill',
    amount: 450.00,
    date: '2024-01-13',
    status: 'pending'
  },
  {
    id: '4',
    type: 'income',
    category: 'Services',
    description: 'Consultation fees',
    amount: 2500.00,
    date: '2024-01-12',
    status: 'completed'
  }
]

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function FinancePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions] = useState<Transaction[]>(mockTransactions)

  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpenses
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length

  return (
    <PermissionGate featureKey="finance" action="view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance & Accounting</h1>
            <p className="text-muted-foreground">
              Monitor financial performance and manage transactions
            </p>
          </div>
          <PermissionGate featureKey="finance" action="create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </PermissionGate>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Income</h3>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Expenses</h3>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +5% from last month
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Net Profit</h3>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netProfit.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {netProfit >= 0 ? '+' : ''}8% from last month
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Pending</h3>
                <Receipt className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold">{pendingTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Transactions pending
              </p>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PermissionGate featureKey="finance" action="view">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-medium">Reports</h3>
                <p className="text-sm text-muted-foreground">Financial reports</p>
              </div>
            </Card>
          </PermissionGate>
          <PermissionGate featureKey="finance" action="view">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="p-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium">Invoices</h3>
                <p className="text-sm text-muted-foreground">Manage invoices</p>
              </div>
            </Card>
          </PermissionGate>
          <PermissionGate featureKey="finance" action="view">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="p-6 text-center">
                <Banknote className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-medium">Payments</h3>
                <p className="text-sm text-muted-foreground">Payment tracking</p>
              </div>
            </Card>
          </PermissionGate>
          <PermissionGate featureKey="finance" action="view">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <div className="p-6 text-center">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-medium">Expenses</h3>
                <p className="text-sm text-muted-foreground">Expense tracking</p>
              </div>
            </Card>
          </PermissionGate>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Recent Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Track all financial transactions and their status
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outlined">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <PermissionGate featureKey="finance" action="export">
                  <Button variant="outlined">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </PermissionGate>
              </div>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="p-4 align-middle">
                            <Badge className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle font-medium">{transaction.description}</td>
                          <td className="p-4 align-middle">{transaction.category}</td>
                          <td className="p-4 align-middle">
                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-4 align-middle">{transaction.date}</td>
                          <td className="p-4 align-middle">
                            <Badge className={statusColors[transaction.status]}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PermissionGate>
  )
}
