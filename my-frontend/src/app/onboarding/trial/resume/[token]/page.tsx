'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ResumeData {
  client_id: string;
  onboarding_status?: string;
  trial_end_date?: string;
}

export default function TrialResumeTokenPage({ params }: any) {
  const { token } = params as { token: string };
  const [data, setData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const resp = await fetch(`/api/public/onboarding/trial/resume/${token}`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'resume_failed');
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally { setLoading(false); }
    }
    fetchData();
  }, [token]);

  if (loading) return <div className="p-6">Resuming trial...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data?.client_id) return <div className="p-6">Invalid token.</div>;

  const endDate = data.trial_end_date ? new Date(data.trial_end_date).toLocaleDateString() : 'N/A';

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Trial Session Resumed</h1>
      <p className="text-sm text-gray-700">Status: <span className="font-mono">{data.onboarding_status || 'unknown'}</span></p>
      <p className="text-sm text-gray-700">Trial Ends: <span className="font-mono">{endDate}</span></p>
      <p className="text-sm">You can continue filling your onboarding form. Click below to return to the form with your draft loaded.</p>
      <Link href={`/onboarding/trial?client_id=${data.client_id}`} className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Continue Onboarding</Link>
      <p className="text-xs text-gray-500">If the link fails, copy this Client ID: <code>{data.client_id}</code></p>
    </div>
  );
}
