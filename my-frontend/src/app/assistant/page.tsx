"use client";
import { useState } from 'react';

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Array<{role:'user'|'ai'; text:string}>>([]);

  const callAI = async (action: string, payload: any) => {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    const j = await r.json();
    return j.data;
  };

  const onSend = async () => {
    const q = input.trim();
    if (!q) return;
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setInput("");
    const a = await callAI('askAI', { userId: 'me', query: q });
    setMsgs(m => [...m, { role: 'ai', text: String(a) }]);
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">AI Assistant</h1>
      <div className="border rounded p-2 h-[60vh] overflow-auto bg-white/50 dark:bg-gray-900/30">
        {msgs.map((m, i) => (
          <div key={i} className={`my-1 ${m.role==='user'?'text-right':''}`}>
            <span className={`inline-block px-2 py-1 rounded ${m.role==='user'?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-800'}`}>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Ask anything about ERP…" />
        <button onClick={onSend} className="px-3 py-1 rounded bg-blue-600 text-white">Send</button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button onClick={()=>callAI('explainPage', { userId: 'me', page: { path: location.pathname, title: document.title } }).then(a=>setMsgs(m=>[...m,{role:'ai',text:String(a)}]))} className="border rounded px-2 py-1">Explain current page</button>
        <button onClick={()=>callAI('runSmartSearch', { userId: 'me', keywords: 'cashflow last month' }).then(a=>setMsgs(m=>[...m,{role:'ai',text:JSON.stringify(a)}]))} className="border rounded px-2 py-1">Smart search example</button>
      </div>
    </div>
  );
}
