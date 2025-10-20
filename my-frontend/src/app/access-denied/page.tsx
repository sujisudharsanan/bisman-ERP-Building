'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  const router = useRouter();

  const handleGoBack = () => {
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Content */}
        <div className="text-left space-y-6">
          {/* Error Code */}
          <div className="text-cyan-400 text-8xl font-bold tracking-wider mb-4" style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.5)' }}>
            403
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            You are not authorized.
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            You tried to access a page you did not have prior authorization for.
          </p>

          {/* Go Back Button */}
          <button
            onClick={handleGoBack}
            className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Right Side - Door Illustration */}
        <div className="flex justify-center items-center">
          <div className="relative">
            {/* Door */}
            <div className="w-64 h-96 bg-gradient-to-b from-slate-400 to-slate-500 rounded-2xl shadow-2xl relative">
              {/* Door Window */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-20 bg-slate-300 rounded-lg"></div>
              
              {/* Door Handle */}
              <div className="absolute top-1/2 right-8 -translate-y-1/2">
                <div className="w-3 h-12 bg-slate-200 rounded-full"></div>
                <div className="w-8 h-3 bg-slate-200 rounded-full -mt-1.5"></div>
              </div>

              {/* Door Shadow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/20 rounded-2xl"></div>
            </div>

            {/* Door Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent blur-xl -z-10"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <p className="text-gray-600 text-sm">
          BISMAN ERP © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
