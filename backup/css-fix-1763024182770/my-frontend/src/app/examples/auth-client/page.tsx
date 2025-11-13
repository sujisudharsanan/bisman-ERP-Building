'use client'

export default function Page() {
  const onCheck = async () => {
    const r = await fetch('/api/me', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await r.json().catch(() => null);
    alert(JSON.stringify(data));
  };
  return (
    <div className="p-4 space-y-2">
      <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onCheck}>
        Check /api/me (CSR with cookies)
      </button>
    </div>
  );
}
