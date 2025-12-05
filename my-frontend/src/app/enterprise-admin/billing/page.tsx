"use client";
import { useEffect, useState, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';

export default function Page() {
  const [overview,setOverview]=useState<any>(null);
  const [trends,setTrends]=useState<any[]>([]);
  const [analytics,setAnalytics]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [isDataRefreshing,setIsDataRefreshing]=useState(false);
  const [err,setErr]=useState<string|null>(null);

  const fetchBilling = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsDataRefreshing(true);
      } else {
        setLoading(true);
      }
      const [o,t,a] = await Promise.all([
        fetch('/api/enterprise-admin/billing/overview',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/billing/revenue-trends?months=6',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/billing/subscription-analytics',{credentials:'include'}).then(r=>r.json()),
      ]);
      setOverview(o.overview);
      setTrends(t.trends||[]);
      setAnalytics(a.analytics);
    } catch(e:any) { 
      setErr(e.message||'Failed to load billing'); 
    } finally { 
      setLoading(false);
      setIsDataRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Register with global refresh context
  usePageRefresh('billing', () => fetchBilling(true));
  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      {err && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Total Clients" value={overview?.totalClients} />
            <Stat label="Active Subscriptions" value={overview?.activeSubscriptions} />
            <Stat label="MRR (₹)" value={overview?.mrr} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="font-semibold mb-2">Revenue Trends (last 6 months)</div>
            <ul className="text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
              {trends.map((t:any,idx:number)=> (
                <li key={idx} className="flex justify-between"><span>{t.month}</span><span>₹{t.revenue}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="font-semibold mb-2">Subscription Analytics</div>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(analytics,null,2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({label,value}:{label:string; value:any}){
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value ?? '-'}</div>
    </div>
  );
}
