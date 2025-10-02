import React, { useState } from "react";
import {
  Home, User, CheckCircle, ShoppingCart,
  DollarSign, BarChart3, MessageCircle, Settings, ClipboardList, PlusCircle,
  Bell, LogOut
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

// --- API Hook for Hub Incharge Data ---
function useHubInchargeData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel using the correct backend URL
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const [
        profileRes,
        approvalsRes,
        purchasesRes,
        expensesRes,
        performanceRes,
        messagesRes,
        tasksRes
      ] = await Promise.all([
        fetch(`${baseURL}/api/hub-incharge/profile`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/approvals`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/purchases`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/expenses`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/performance`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/messages`, { credentials: 'include' }),
        fetch(`${baseURL}/api/hub-incharge/tasks`, { credentials: 'include' })
      ]);

      // Check for errors
      if (!profileRes.ok) {
        if (profileRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch profile');
      }
      if (!approvalsRes.ok) {
        if (approvalsRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch approvals');
      }
      if (!purchasesRes.ok) {
        if (purchasesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch purchases');
      }
      if (!expensesRes.ok) {
        if (expensesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch expenses');
      }
      if (!performanceRes.ok) {
        if (performanceRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch performance');
      }
      if (!messagesRes.ok) {
        if (messagesRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch messages');
      }
      if (!tasksRes.ok) {
        if (tasksRes.status === 401) {
          throw new Error('Authentication required. Please login again.');
        }
        throw new Error('Failed to fetch tasks');
      }

      // Parse responses
      const [profile, approvals, purchases, expenses, performance, messages, tasks] = await Promise.all([
        profileRes.json(),
        approvalsRes.json(),
        purchasesRes.json(),
        expensesRes.json(),
        performanceRes.json(),
        messagesRes.json(),
        tasksRes.json()
      ]);

      setData({
        profile,
        approvals,
        purchases,
        expenses,
        performance,
        messages,
        tasks
      });
    } catch (err) {
      console.error('Data fetch error:', err);
      
      // Check if this is an authentication error
      if (err.message.includes('Failed to fetch profile') || err.message.includes('401')) {
        setError('Authentication required. Please login again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  React.useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// --- Page Components ---
const DashboardPage = ({ data }) => {
  if (!data) return <div className="p-6">Loading dashboard...</div>;
  
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Profile Summary</h3>
          <p className="text-sm text-gray-600">{data?.profile?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600">{data?.profile?.role || 'N/A'}</p>
          <p className="text-sm text-gray-600">{data?.profile?.location || 'N/A'}</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Pending Approvals</h3>
          <p className="text-2xl font-bold text-orange-600">{data?.approvals?.filter(a => a.status === 'pending').length || 0}</p>
          <p className="text-sm text-gray-600">Items awaiting approval</p>
        </div>
        <div className="bg-white shadow rounded-2xl p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Expense Claims %</h3>
          <div className="flex gap-2 text-sm">
            <span className="text-green-600">Approved: {data?.performance?.claims?.approved || 0}%</span>
            <span className="text-orange-600">Pending: {data?.performance?.claims?.pending || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AboutMePage = ({ data }) => {
  if (!data?.profile) return <div className="p-6">Loading profile...</div>;
  
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">About Me</h2>
      <div className="bg-white shadow rounded-2xl p-4 space-y-3">
        <p><b>Name:</b> {data.profile.name}</p>
        <p><b>Role:</b> {data.profile.role}</p>
        <p><b>Client:</b> {data.profile.client}</p>
        <p><b>Location:</b> {data.profile.location}</p>
        <p><b>Recognition:</b> {data.profile.recognition?.join(", ") || 'None'}</p>
        <p><b>Contact:</b> {data.profile.contact}</p>
      </div>
    </div>
  );
};

const ApprovalsPage = ({ data, refetch }) => {
  const [processing, setProcessing] = useState(null);

  const handleApproval = async (id, status) => {
    setProcessing(id);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/hub-incharge/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to update approval');
      }
    } catch (err) {
      console.error('Approval error:', err);
      alert('Failed to update approval');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.approvals) return <div className="p-6">Loading approvals...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Approvals</h2>
      <div className="space-y-3">
        {data.approvals.map(approval => (
          <div key={approval.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <p className="font-semibold">{approval.requester}</p>
                <p className="text-sm text-gray-600">{approval.type} - ₹{approval.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Deadline: {approval.deadline}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApproval(approval.id, 'approved')}
                  disabled={processing === approval.id}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === approval.id ? 'Processing...' : 'Approve'}
                </button>
                <button 
                  onClick={() => handleApproval(approval.id, 'rejected')}
                  disabled={processing === approval.id}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === approval.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PurchasePage = ({ data }) => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl font-bold mb-4">Purchase</h2>
    <div className="space-y-3">
      {data.purchases.map(purchase => (
        <div key={purchase.id} className="bg-white shadow rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <p className="font-semibold">{purchase.vendor}</p>
              <p className="text-sm text-gray-600">₹{purchase.amount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{purchase.date}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              purchase.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {purchase.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ExpensesPage = ({ data, refetch }) => {
  const [newExpense, setNewExpense] = useState({ amount: '', category: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category) return;

    setSubmitting(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/hub-incharge/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          remarks: newExpense.remarks
        })
      });

      if (response.ok) {
        setNewExpense({ amount: '', category: '', remarks: '' });
        await refetch(); // Refresh data
        alert('Expense submitted successfully!');
      } else {
        throw new Error('Failed to submit expense');
      }
    } catch (err) {
      console.error('Expense submission error:', err);
      alert('Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data?.expenses) return <div className="p-6">Loading expenses...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4">Expense Claims</h2>
      
      {/* Expense Form */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-4">Submit New Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            placeholder="Amount"
            className="w-full border rounded p-2"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
            required
          />
          <select
            className="w-full border rounded p-2"
            value={newExpense.category}
            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            <option value="Travel">Travel</option>
            <option value="Meals">Meals</option>
            <option value="Accommodation">Accommodation</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>
          <textarea
            placeholder="Remarks"
            className="w-full border rounded p-2"
            rows="3"
            value={newExpense.remarks}
            onChange={(e) => setNewExpense({...newExpense, remarks: e.target.value})}
          ></textarea>
          <button 
            type="submit" 
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </form>
      </div>

      {/* Expense History */}
      <div className="bg-white shadow rounded-2xl p-4">
        <h3 className="font-semibold mb-4">Expense History</h3>
        <div className="space-y-2">
          {data.expenses.map(expense => (
            <div key={expense.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">₹{expense.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{expense.category}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${
                  expense.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {expense.status}
                </span>
                <p className="text-xs text-gray-500">{expense.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerformancePage = ({ data }) => (
  <div className="p-4 sm:p-6 space-y-4">
    <h2 className="text-xl font-bold mb-4">Performance Dashboard</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
        <h3 className="font-semibold mb-2">Expense Claims</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Approved:</span>
            <span className="text-green-600">{data.performance.claims.approved}%</span>
          </div>
          <div className="flex justify-between">
            <span>Pending:</span>
            <span className="text-orange-600">{data.performance.claims.pending}%</span>
          </div>
          <div className="flex justify-between">
            <span>Rejected:</span>
            <span className="text-red-600">{data.performance.claims.rejected}%</span>
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
        <h3 className="font-semibold mb-2">Monthly Trends</h3>
        <div className="space-y-1 text-sm">
          {data.performance.trends.map(trend => (
            <div key={trend.month} className="flex justify-between">
              <span>{trend.month}:</span>
              <span>{trend.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white shadow rounded-2xl p-4 h-40 flex flex-col justify-center">
        <h3 className="font-semibold mb-2">SLA Performance</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Avg Response:</span>
            <span>{data.performance.sla.avgResponseTime}</span>
          </div>
          <div className="flex justify-between">
            <span>On-time %:</span>
            <span className="text-green-600">{data.performance.sla.onTimePercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MessagesPage = ({ data, refetch }) => {
  const [processing, setProcessing] = useState(null);

  const handleAcknowledge = async (id) => {
    setProcessing(id);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/hub-incharge/messages/${id}/ack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to acknowledge message');
      }
    } catch (err) {
      console.error('Message ack error:', err);
      alert('Failed to acknowledge message');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.messages) return <div className="p-6">Loading messages...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      <div className="space-y-3">
        {data.messages.map(message => (
          <div key={message.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex-1">
                <p className={`${!message.read ? 'font-semibold' : ''}`}>{message.text}</p>
                <p className="text-xs text-gray-500">{message.date}</p>
              </div>
              {!message.read && (
                <button 
                  onClick={() => handleAcknowledge(message.id)}
                  disabled={processing === message.id}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {processing === message.id ? 'Processing...' : 'Acknowledge'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateTaskPage = ({ refetch }) => {
  const [task, setTask] = useState({ title: '', details: '', deadline: '', assignedTo: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.title || !task.details) return;

    setSubmitting(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/hub-incharge/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: task.title,
          details: task.details,
          deadline: task.deadline,
          assignedTo: task.assignedTo
        })
      });

      if (response.ok) {
        setTask({ title: '', details: '', deadline: '', assignedTo: '' });
        await refetch(); // Refresh data
        alert('Task created successfully!');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (err) {
      console.error('Task creation error:', err);
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">Create New Task / Request</h2>
      <div className="bg-white shadow rounded-2xl p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Task Title"
            className="w-full border rounded p-2"
            value={task.title}
            onChange={(e) => setTask({...task, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Task Details"
            className="w-full border rounded p-2"
            rows="4"
            value={task.details}
            onChange={(e) => setTask({...task, details: e.target.value})}
            required
          ></textarea>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={task.deadline}
            onChange={(e) => setTask({...task, deadline: e.target.value})}
          />
          <select
            className="w-full border rounded p-2"
            value={task.assignedTo}
            onChange={(e) => setTask({...task, assignedTo: e.target.value})}
          >
            <option value="">Assign to...</option>
            <option value="self">Assign to Me</option>
            <option value="alice">Assign to Alice Smith</option>
            <option value="bob">Assign to Bob Johnson</option>
          </select>
          <button 
            type="submit" 
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
};

const TasksPage = ({ data, refetch }) => {
  const [processing, setProcessing] = useState(null);

  const handleStatusUpdate = async (id, status) => {
    setProcessing(id);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/hub-incharge/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await refetch(); // Refresh data
      } else {
        throw new Error('Failed to update task');
      }
    } catch (err) {
      console.error('Task update error:', err);
      alert('Failed to update task');
    } finally {
      setProcessing(null);
    }
  };

  if (!data?.tasks) return <div className="p-6">Loading tasks...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">All Tasks & Requests</h2>
      <div className="space-y-3">
        {data.tasks.map(task => (
          <div key={task.id} className="bg-white shadow rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex-1">
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-gray-600">Assigned to: {task.assignee}</p>
                <p className="text-xs text-gray-500">Deadline: {task.deadline}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {task.status}
                </span>
                {task.status === 'pending' && (
                  <button 
                    onClick={() => handleStatusUpdate(task.id, 'completed')}
                    disabled={processing === task.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    {processing === task.id ? 'Updating...' : 'Mark Complete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl font-bold mb-4">Settings</h2>
    <div className="bg-white shadow rounded-2xl p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <select className="w-full border rounded p-2">
          <option>English</option>
          <option>Hindi</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Theme</label>
        <select className="w-full border rounded p-2">
          <option>Light</option>
          <option>Dark</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Notifications</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            Email notifications
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            SMS notifications
          </label>
        </div>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded">
        Save Settings
      </button>
    </div>
  </div>
);

// --- Main Hub Incharge App ---
export default function HubInchargeApp() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data, loading, error, refetch } = useHubInchargeData();

  // Security check - allow STAFF, ADMIN, and MANAGER
  if (!user?.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
    router.push('/');
    return <div>Access denied. Redirecting...</div>;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const pages = {
    Dashboard: <DashboardPage data={data} />,
    "About Me": <AboutMePage data={data} />,
    Approvals: <ApprovalsPage data={data} refetch={refetch} />,
    Purchase: <PurchasePage data={data} />,
    Expenses: <ExpensesPage data={data} refetch={refetch} />,
    Performance: <PerformancePage data={data} />,
    Messages: <MessagesPage data={data} refetch={refetch} />,
    "Create Task": <CreateTaskPage refetch={refetch} />,
    "Tasks & Requests": <TasksPage data={data} refetch={refetch} />,
    Settings: <SettingsPage />,
  };

  const navItems = [
    { name: "Dashboard", icon: <Home size={16} /> },
    { name: "About Me", icon: <User size={16} /> },
    { name: "Approvals", icon: <CheckCircle size={16} /> },
    { name: "Purchase", icon: <ShoppingCart size={16} /> },
    { name: "Expenses", icon: <DollarSign size={16} /> },
    { name: "Performance", icon: <BarChart3 size={16} /> },
    { name: "Messages", icon: <MessageCircle size={16} /> },
    { name: "Create Task", icon: <PlusCircle size={16} /> },
    { name: "Tasks & Requests", icon: <ClipboardList size={16} /> },
    { name: "Settings", icon: <Settings size={16} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Hub Incharge Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication required');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error loading dashboard: {error}</p>
          <div className="mt-4 space-x-2">
            {isAuthError ? (
              <button 
                onClick={() => router.push('/login')} 
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Go to Login
              </button>
            ) : (
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if data is still null
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Hub Incharge Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center bg-white shadow px-4 sm:px-6 py-3">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Hub Incharge Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <button className="relative p-2 hover:bg-gray-100 rounded">
            <Bell size={20} />
            {data?.messages?.filter(m => !m.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {data?.messages?.filter(m => !m.read).length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Active Page */}
      <main className="flex-1 overflow-y-auto">
        {pages[activeTab]}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white shadow-inner border-t">
        <div className="flex justify-around py-2 overflow-x-auto">
          {navItems.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex flex-col items-center text-xs px-2 py-1 min-w-max ${
                activeTab === tab.name 
                  ? "text-blue-600 font-semibold" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              <span className="mt-1 text-[10px] sm:text-xs">{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
