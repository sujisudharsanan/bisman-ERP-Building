"use client";
import { useEffect, useState, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';

export default function Page() {
  const [system,setSystem]=useState<any>(null);
  const [growth,setGrowth]=useState<any[]>([]);
  const [clientActivity,setClientActivity]=useState<any[]>([]);
  const [adoption,setAdoption]=useState<any[]>([]);
  const [metrics,setMetrics]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [isDataRefreshing,setIsDataRefreshing]=useState(false);
  const [err,setErr]=useState<string|null>(null);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsDataRefreshing(true);
      } else {
        setLoading(true);
      }
      const [s,g,c,a,m] = await Promise.all([
        fetch('/api/enterprise-admin/reports/system-overview',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/reports/user-growth?months=12',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/reports/client-activity?days=30',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/reports/module-adoption',{credentials:'include'}).then(r=>r.json()),
        fetch('/api/enterprise-admin/reports/performance',{credentials:'include'}).then(r=>r.json()),
      ]);
      setSystem(s.report);
      setGrowth(g.growth||[]);
      setClientActivity(c.activity||[]);
      setAdoption(a.adoption||[]);
      setMetrics(m.metrics);
    } catch(e:any) { 
      setErr(e.message||'Failed to load reports'); 
    } finally { 
      setLoading(false);
      setIsDataRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Register with global refresh context
  usePageRefresh('reports', () => fetchReports(true));
  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      {err && <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <Card title="System Overview">
            <pre className="text-xs overflow-x-auto">{JSON.stringify(system,null,2)}</pre>
          </Card>
          <Card title="User Growth (12 months)">
            <ul className="text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
              {growth.map((g:any,idx:number)=> (
                <li key={idx} className="flex justify-between"><span>{g.month}</span><span>{g.count}</span></li>
              ))}
            </ul>
          </Card>
          <Card title="Client Activity (30 days)">
            <pre className="text-xs overflow-x-auto">{JSON.stringify(clientActivity,null,2)}</pre>
          </Card>
          <Card title="Module Adoption">
            <pre className="text-xs overflow-x-auto">{JSON.stringify(adoption,null,2)}</pre>
          </Card>
          <Card title="Performance Metrics">
            <pre className="text-xs overflow-x-auto">{JSON.stringify(metrics,null,2)}</pre>
          </Card>
        </>
      )}
    </div>
  );
}

function Card({title, children}:{title:string; children:React.ReactNode}){
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
