import dynamic from 'next/dynamic';
const ChatApp = dynamic(() => import('@/components/chat/ChatApp'), { ssr: false });

export default function ChatDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Professional Chat Interface</h1>
          <p className="text-slate-300 text-lg">React + Tailwind CSS • Responsive Design</p>
        </div>

        <ChatApp />

        <div className="text-slate-400 text-sm space-y-2">
          <p>✨ Features: Real-time messaging, Contact search, Online status</p>
          <p>📱 Responsive • 🎨 Professional Design • ⚡ Fast Performance</p>
        </div>
      </div>
    </div>
  );
}
