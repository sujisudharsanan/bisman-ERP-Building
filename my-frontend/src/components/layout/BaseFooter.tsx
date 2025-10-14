'use client';

import React from 'react';
import Link from 'next/link';

interface BaseFooterProps {
  user: any;
}

const BaseFooter: React.FC<BaseFooterProps> = ({ user }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 py-4 px-6"
      data-component="base-footer"
    >
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left: Copyright */}
          <div className="text-sm text-gray-400">
            © {currentYear} BISMAN ERP. All rights reserved.
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/support"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Support
            </Link>
          </nav>

          {/* Right: System Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BaseFooter;
