'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Rocket, CheckCircle } from 'lucide-react';

export default function LaunchingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'launching'>('loading');
  const [brandData, setBrandData] = useState<{
    displayName: string;
    logoUrl: string | null;
  }>({
    displayName: '',
    logoUrl: null,
  });

  useEffect(() => {
    // Get brand data from session storage (set during branding page)
    const storedName = sessionStorage.getItem('workspace_display_name');
    const storedLogo = sessionStorage.getItem('workspace_logo_url');

    if (storedName) {
      setBrandData({
        displayName: storedName,
        logoUrl: storedLogo,
      });
    } else {
      // Fallback - try to fetch from API
      fetchBrandData();
    }

    // Phase transitions
    const timer1 = setTimeout(() => setPhase('ready'), 1500);
    const timer2 = setTimeout(() => setPhase('launching'), 3000);
    const timer3 = setTimeout(() => {
      // Navigate to admin dashboard
      router.push('/admin');
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [router]);

  const fetchBrandData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/tenant/branding', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBrandData({
          displayName: data.displayName || data.name || 'Your Workspace',
          logoUrl: data.logoUrl || data.logo_url,
        });
      }
    } catch (error) {
      console.error('Failed to fetch brand data:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        <AnimatePresence mode="wait">
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              {/* Logo Container */}
              <motion.div
                className="relative mb-8"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/30">
                  <div className="w-full h-full rounded-[22px] bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                    {brandData.logoUrl ? (
                      <img
                        src={brandData.logoUrl}
                        alt={brandData.displayName}
                        className="w-24 h-24 object-contain"
                      />
                    ) : (
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {getInitials(brandData.displayName || 'ERP')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Orbiting sparkles */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Setting up your workspace
                </h1>
                <p className="text-blue-200/70">Please wait a moment...</p>
              </motion.div>

              {/* Loading dots */}
              <div className="flex gap-2 mt-8">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-blue-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="flex flex-col items-center"
            >
              {/* Large Logo Display */}
              <motion.div
                className="relative mb-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              >
                <div className="w-40 h-40 rounded-[32px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1.5 shadow-2xl shadow-purple-500/40">
                  <div className="w-full h-full rounded-[26px] bg-white flex items-center justify-center overflow-hidden">
                    {brandData.logoUrl ? (
                      <img
                        src={brandData.logoUrl}
                        alt={brandData.displayName}
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {getInitials(brandData.displayName || 'ERP')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Success checkmark */}
                <motion.div
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <CheckCircle className="w-7 h-7 text-white" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl font-bold text-white mb-3">
                  {brandData.displayName || 'Your Workspace'}
                </h1>
                <p className="text-xl text-blue-200/80">is ready!</p>
              </motion.div>
            </motion.div>
          )}

          {phase === 'launching' && (
            <motion.div
              key="launching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* Launching animation */}
              <motion.div
                className="relative mb-8"
                animate={{ y: [-10, -100], scale: [1, 0.5], opacity: [1, 0] }}
                transition={{ duration: 1.5, ease: 'easeIn' }}
              >
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center overflow-hidden">
                    {brandData.logoUrl ? (
                      <img
                        src={brandData.logoUrl}
                        alt={brandData.displayName}
                        className="w-24 h-24 object-contain"
                      />
                    ) : (
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {getInitials(brandData.displayName || 'ERP')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rocket trail effect */}
                <motion.div
                  className="absolute top-full left-1/2 -translate-x-1/2"
                  animate={{ height: [0, 200], opacity: [1, 0] }}
                  transition={{ duration: 1.5 }}
                >
                  <div className="w-8 bg-gradient-to-b from-orange-500 via-yellow-400 to-transparent rounded-full blur-sm" 
                       style={{ height: '100%' }} />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <Rocket className="w-6 h-6 text-orange-400" />
                <span className="text-2xl font-semibold text-white">
                  Launching {brandData.displayName}...
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom branding - subtle */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
      >
        <p className="text-xs text-blue-300/50">Powered by BISMAN ERP</p>
      </motion.div>
    </div>
  );
}
