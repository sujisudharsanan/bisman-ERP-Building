'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { 
  Search,
  Download,
  Plus,
  Filter,
  RefreshCw,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
    CheckCircle,
  } from 'lucide-react';
  import { redirect } from 'next/navigation';
  
export default function ServerLogsPage() {
  redirect('/pump-management/server-logs');
}
