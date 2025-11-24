'use client';

import dynamic from 'next/dynamic';
const ChatApp = dynamic(() => import('@/components/chat/ChatApp'), { ssr: false });

export default function ChatComparisonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Professional Chat Interface
          </h1>
          <p className="text-xl text-purple-200 mb-2">
            React + TypeScript + Tailwind CSS
          </p>
          <p className="text-lg text-purple-300">
            Modular Components • Responsive Design • Professional Styling
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          {/* Main Chat Interface */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                Chat Interface (367×500)
              </h2>
              <ChatApp />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-purple-200">
                ✨ Dark sidebar with contacts
              </p>
              <p className="text-sm text-purple-200">
                💬 Light chat window with messages
              </p>
              <p className="text-sm text-purple-200">
                🔍 Search, online status, unread badges
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 max-w-md">
            <h3 className="text-2xl font-bold text-white mb-6">Features</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Modular Components</h4>
                  <p className="text-purple-200 text-sm">ChatApp, ChatSidebar, ChatWindow, ChatMessage</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Professional Design</h4>
                  <p className="text-purple-200 text-sm">Gradients, shadows, rounded corners, icons</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Interactive Features</h4>
                  <p className="text-purple-200 text-sm">Search, click to chat, hover effects, auto-scroll</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Real-time Ready</h4>
                  <p className="text-purple-200 text-sm">Easy to integrate with WebSocket/API</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">TypeScript Support</h4>
                  <p className="text-purple-200 text-sm">Fully typed with interfaces</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">Dummy Data Included</h4>
                  <p className="text-purple-200 text-sm">6 contacts with full conversation history</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <h4 className="text-white font-semibold mb-3">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">React 18</span>
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">TypeScript</span>
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">Tailwind CSS</span>
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">Lucide Icons</span>
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">Next.js 14</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h3 className="text-2xl font-bold text-white mb-4">Quick Usage</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-2">Import Component</h4>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`import ChatApp from '@/components/chat/ChatApp';

export default function MyPage() {
  return <ChatApp />;
}`}
              </pre>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Customize Size</h4>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`// In ChatApp.tsx
<div className="flex 
  h-[500px] w-[367px]  // Default
  md:h-[600px] md:w-[450px]  // Tablet
  lg:h-[700px] lg:w-[500px]  // Desktop
">
  ...
</div>`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-purple-200 text-sm">
          <p>📚 Full documentation available in CHAT_INTERFACE_DOCUMENTATION.md</p>
          <p className="mt-2">🚀 Quick start guide in CHAT_QUICK_START.md</p>
        </div>
      </div>
    </div>
  );
}
