"use client";

// Prevent Next.js from attempting to prerender this page (uses dynamic imports and client-only runtime)
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import nextDynamic from 'next/dynamic';

// Load layout client-side only to avoid production prerender errors
const SuperAdminShell = nextDynamic(() => import('@/components/layouts/SuperAdminShell'), { ssr: false });

type RoleKey =
  | 'super-admin'
  | 'org-admin'
  | 'dept-manager'
  | 'team-lead'
  | 'agent-user'
  | 'auditor'
  | 'external-client';

type ViewKey = 'matrix' | 'workflows' | 'hierarchy' | 'scenarios';

interface RoleData {
  name: string;
  desc: string;
  permissions: string[];
  visibility: string[];
  chartData: [number, number, number]; // [Full, Partial, None]
}

const ROLES_DATA: Record<RoleKey, RoleData> = {
  'super-admin': {
    name: 'Super Admin',
    desc: 'Platform-level controller; can manage global configurations and all organizations.',
    permissions: [
      'Full CRUD on users, roles, modules',
      'Override approvals',
      'Impersonation (TBD)',
      'Force-end calls',
    ],
    visibility: [
      'Sees all data, all threads, all audit logs',
      'Must not participate as approver in formal compliance flows',
    ],
    chartData: [16, 0, 0],
  },
  'org-admin': {
    name: 'Org Admin',
    desc: 'Organization-wide administrator for a single tenant.',
    permissions: [
      'Manage departments, assign managers',
      'Configure modules',
      'Approve final onboarding',
    ],
    visibility: [
      'Sees all org users, clients, and threads',
      'Cannot view sealed legal audit trails (TBD)',
      'Should not modify financial notes (TBD)',
    ],
    chartData: [15, 1, 0],
  },
  'dept-manager': {
    name: 'Department Manager',
    desc: 'Oversees a functional department (e.g., Sales, Finance, Support).',
    permissions: [
      'Review submissions, re-route to Approver',
      'Request corrections',
      'Start departmental calls',
      'Create internal notes',
    ],
    visibility: [
      'Sees clients assigned to department, dept threads',
      "Cannot activate accounts",
      'Cannot access other departments’ restricted threads',
    ],
    chartData: [8, 5, 3],
  },
  'team-lead': {
    name: 'Team Lead',
    desc: 'Direct lead for a working team; supervises Agents.',
    permissions: [
      'Initiate client creation',
      'Perform first-level review',
      'Escalate to Manager',
      'Start team calls/chats',
    ],
    visibility: [
      'Sees team clients, team threads',
      'Cannot finalize approvals',
      'Limited visibility to financial/compliance fields (masked)',
    ],
    chartData: [4, 6, 6],
  },
  'agent-user': {
    name: 'Agent/User',
    desc: 'General operational user handling day-to-day tasks.',
    permissions: [
      'Initiate client creation (basic draft)',
      'Participate in chats/calls',
      'Submit corrections',
    ],
    visibility: [
      'Sees own assigned clients, threads they are members of',
      'Cannot approve',
      'Cannot see internal compliance notes',
    ],
    chartData: [3, 5, 8],
  },
  auditor: {
    name: 'Auditor (Read-only)',
    desc: 'Internal or external auditing persona; observation only.',
    permissions: ['View-only access', 'Export report (TBD)'],
    visibility: [
      'Sees audit logs (non-sealed), finalized client records',
      'No access to live chat or draft records',
    ],
    chartData: [2, 2, 12],
  },
  'external-client': {
    name: 'External Client',
    desc: 'External stakeholder with limited portal view.',
    permissions: ['Upload requested documents (TBD)', 'Comment in externally-shared thread'],
    visibility: [
      'Sees own profile, public client data, status',
      'No internal notes, no financial details, no approval actions',
    ],
    chartData: [0, 4, 12],
  },
};

const navBtnBase =
  'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100';
const navBtnActive = 'bg-blue-600 text-white shadow-sm hover:bg-blue-700';

export default function RoleAccessExplorerPage() {
  const [view, setView] = useState<ViewKey>('matrix');
  const [role, setRole] = useState<RoleKey>('super-admin');
  const [scenarioFilter, setScenarioFilter] = useState<'all' | 'access' | 'workflow' | 'call' | 'ui'>('all');

  // Chart.js handling
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  const labels = useMemo(
    () => ['Full Access (✔)', 'Partial / Restricted (▲)', 'No Access (✖)'],
    []
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!chartRef.current || chartInstanceRef.current) return;
      try {
        const mod = await import('chart.js/auto');
        const Chart: any = (mod as any).default || (mod as any);
        if (!isMounted || !chartRef.current) return;
        const data = ROLES_DATA[role].chartData;
        chartInstanceRef.current = new Chart(chartRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Permission Count',
                data,
                backgroundColor: [
                  'rgba(34,139,34,0.6)',
                  'rgba(255,165,0,0.6)',
                  'rgba(220,20,60,0.6)',
                ],
                borderColor: [
                  'rgba(34,139,34,1)',
                  'rgba(255,165,0,1)',
                  'rgba(220,20,60,1)',
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => ` ${ctx.raw} Capabilities`,
                },
              },
            },
          },
        });
      } catch (e) {
        // Chart failed to load; ignore to keep page functional
        console.warn('Chart.js failed to load', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [labels, role]);

  useEffect(() => {
    // Update chart on role change
    const chart = chartInstanceRef.current;
    if (chart) {
      chart.data.datasets[0].data = ROLES_DATA[role].chartData;
      chart.update();
    }
  }, [role]);

  const roleData = ROLES_DATA[role];

  const thClass = (match: RoleKey) =>
    'px-6 py-4 font-medium text-center transition-colors duration-150 ' +
    (role === match ? 'bg-indigo-50 dark:bg-indigo-900/30' : '');

  const scenarioBtn = (key: 'all' | 'access' | 'workflow' | 'call' | 'ui', label: string) => (
    <button
      key={key}
      onClick={() => setScenarioFilter(key)}
      className={`${navBtnBase} ${scenarioFilter === key ? navBtnActive : ''}`}
    >
      {label}
    </button>
  );

  const showScenario = (cat: 'access' | 'workflow' | 'call' | 'ui') =>
    scenarioFilter === 'all' || scenarioFilter === cat;

  return (
  <SuperAdminShell title="Interactive Role & Access Explorer">
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300">Interactive Role & Access Explorer</h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">
            An interactive dashboard for exploring the Role Hierarchy & Workflow Access Report (Draft v0.1).
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-8 dark:bg-slate-900 dark:border-slate-700">
          <button
            onClick={() => setView('matrix')}
            className={`${navBtnBase} ${view === 'matrix' ? navBtnActive : ''}`}
            id="nav-matrix"
          >
            Interactive Matrix
          </button>
          <button
            onClick={() => setView('workflows')}
            className={`${navBtnBase} ${view === 'workflows' ? navBtnActive : ''}`}
            id="nav-workflows"
          >
            Workflows
          </button>
          <button
            onClick={() => setView('hierarchy')}
            className={`${navBtnBase} ${view === 'hierarchy' ? navBtnActive : ''}`}
            id="nav-hierarchy"
          >
            Role Hierarchy
          </button>
          <button
            onClick={() => setView('scenarios')}
            className={`${navBtnBase} ${view === 'scenarios' ? navBtnActive : ''}`}
            id="nav-scenarios"
          >
            Test Scenarios
          </button>
        </nav>

        {/* 1. INTERACTIVE MATRIX */}
        {view === 'matrix' && (
          <section className="space-y-8" id="content-matrix">
            <div>
              <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Explore by Role</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-4">
                Select a role from the dropdown to see their specific details, a summary of their permissions, and their access highlighted in the full matrix below.
              </p>
              <select
                id="role-selector"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleKey)}
                className="w-full max-w-xs p-3 border border-slate-300 rounded-lg shadow-sm bg-white text-base font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
              >
                <option value="super-admin">Super Admin</option>
                <option value="org-admin">Org Admin</option>
                <option value="dept-manager">Department Manager</option>
                <option value="team-lead">Team Lead</option>
                <option value="agent-user">Agent/User</option>
                <option value="auditor">Auditor</option>
                <option value="external-client">External Client</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <h3 id="role-name" className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  {roleData.name}
                </h3>
                <p id="role-desc" className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  {roleData.desc}
                </p>

                <h4 className="font-semibold mb-2 dark:text-slate-100">Key Permissions:</h4>
                <ul id="role-perms" className="list-disc list-inside text-sm space-y-1 text-slate-700 dark:text-slate-200 mb-4">
                  {roleData.permissions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>

                <h4 className="font-semibold mb-2 dark:text-slate-100">Visibility & Restrictions:</h4>
                <ul id="role-visibility" className="list-disc list-inside text-sm space-y-1 text-slate-700 dark:text-slate-200">
                  {roleData.visibility.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-4 dark:text-slate-100">Permission Summary</h3>
                <div className="relative w-full max-w-2xl mx-auto h-80 sm:h-96 max-h-[400px]">
                  <canvas ref={chartRef} aria-label="Role permission summary chart" />
                </div>
              </div>
            </div>

            <div>
        <h3 className="text-xl font-semibold mb-4 dark:text-slate-100">Full Access Matrix (Report Section 3)</h3>
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <table className="w-full min-w-[1000px] text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-medium">
                        Action / Capability
                      </th>
                      <th id="col-super-admin" className={thClass('super-admin')}>Super Admin</th>
                      <th id="col-org-admin" className={thClass('org-admin')}>Org Admin</th>
                      <th id="col-dept-manager" className={thClass('dept-manager')}>Dept Manager</th>
                      <th id="col-team-lead" className={thClass('team-lead')}>Team Lead</th>
                      <th id="col-agent-user" className={thClass('agent-user')}>Agent/User</th>
                      <th id="col-auditor" className={thClass('auditor')}>Auditor</th>
                      <th id="col-external-client" className={thClass('external-client')}>External Client</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Create client</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔ <span className="text-xs">(basic)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">Edit client (full)</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(non-sensitive)</span></td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(assigned)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Approve client (final)</td>
                      <td className="px-6 py-4 text-center">✔ <span className="text-xs">(override)</span></td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(dept stage)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">View chats (member only)</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(external)</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Initiate chat thread</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(team scope)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">Start group call</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(team thread)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖ <span className="text-xs">(join only)</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Join call (if invited)</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(if permitted)</span></td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">End call</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(if starter)</span></td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(if starter)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Manage modules</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">Manage users</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(team)</span></td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(assign agents)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">View audit logs</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(dept scope)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">✔ <span className="text-xs">(read)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">View reports</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(team)</span></td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(personal)</span></td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(public)</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-6 py-4 font-medium">Access dashboard</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(audit view)</span></td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(limited)</span></td>
                    </tr>
                    <tr className="border-b bg-slate-50">
                      <td className="px-6 py-4 font-medium">See financial data</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(if finance)</span></td>
                      <td className="px-6 py-4 text-center">✖ <span className="text-xs">(masked)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(final only)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">See internal notes</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">✔</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(non-sensitive)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                      <td className="px-6 py-4 text-center">▲ <span className="text-xs">(final)</span></td>
                      <td className="px-6 py-4 text-center">✖</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="px-6 py-4 font-medium">External user visibility</td>
                      <td className="px-6 py-4 text-center">All (full)</td>
                      <td className="px-6 py-4 text-center">Full org</td>
                      <td className="px-6 py-4 text-center">Dept scope</td>
                      <td className="px-6 py-4 text-center">Team scope</td>
                      <td className="px-6 py-4 text-center">Own clients</td>
                      <td className="px-6 py-4 text-center">Final only</td>
                      <td className="px-6 py-4 text-center">Self only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. WORKFLOWS */}
        {view === 'workflows' && (
      <section id="content-workflows" className="space-y-12">
      <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Workflow Visualizations</h2>
      <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-8">
              This section provides a clear, visual breakdown of the key processes from the report (Section 7), built with HTML and Tailwind CSS for clarity.
            </p>

      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
              <h3 className="text-xl font-semibold mb-6">Client Creation Workflow</h3>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-wrap items-center">
          <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                    Agent/User (Draft)
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
          <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                    Team Lead Review
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
          <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                    Dept Manager Approval
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
          <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                    Org Admin Finalize
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
          <div className="bg-green-100 border-2 border-green-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                    Active Client
                  </div>
                </div>
                <div className="flex flex-wrap items-center pl-12">
          <span className="text-slate-400 -ml-8 -mt-2 dark:text-slate-500">↳</span>
          <div className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
                    Return for Correction
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 text-base dark:text-slate-500">→</span>
          <div className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
                    Status: Needs Correction
                  </div>
                </div>
                <div className="flex flex-wrap items-center pl-48">
          <span className="text-slate-400 -ml-8 -mt-2 dark:text-slate-500">↳</span>
          <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                    Reject
                  </div>
          <span className="text-slate-400 font-bold text-2xl mx-3 text-base dark:text-slate-500">→</span>
          <div className="bg-red-100 border border-red-400 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                    Status: Rejected (End)
                  </div>
                </div>
              </div>
            </div>

      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
              <h3 className="text-xl font-semibold mb-6">Call Workflow</h3>
              <div className="flex flex-wrap items-center">
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Team Lead+ (Start Call)
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Call Session (Active)
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Call Ended
                </div>
              </div>
              <div className="flex flex-wrap items-center mt-4 pl-32">
        <span className="text-slate-400 -ml-8 -mt-2 dark:text-slate-500">↳</span>
        <div className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
                  Thread Members Join
                </div>
              </div>
              <div className="flex flex-wrap items-center mt-4">
        <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  Unauthorized Join Attempt
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 text-base dark:text-slate-500">→</span>
        <div className="bg-red-100 border border-red-400 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  Access Denied + Audit Log
                </div>
              </div>
            </div>

      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
              <h3 className="text-xl font-semibold mb-6">Chat Thread Membership</h3>
              <div className="flex flex-wrap items-center">
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Create Thread
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Add Members (Explicit)
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 dark:text-slate-500">→</span>
        <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-center font-medium shadow-sm dark:bg-slate-900">
                  Thread Active
                </div>
              </div>
              <div className="flex flex-wrap items-center mt-4">
        <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  Non-Member Access Attempt
                </div>
        <span className="text-slate-400 font-bold text-2xl mx-3 text-base dark:text-slate-500">→</span>
        <div className="bg-red-100 border border-red-400 rounded-lg px-3 py-1 text-sm text-slate-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  Hidden / Not Listed
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. HIERARCHY */}
        {view === 'hierarchy' && (
          <section id="content-hierarchy">
            <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Role Hierarchy</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-8">
              This diagram from report Section 2 shows the descending order of roles, which primarily governs viewing rights and escalation paths.
            </p>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <div className="pl-5 border-l-2 border-slate-300">
                <div className="relative bg-white border-2 border-blue-500 rounded-lg px-4 py-3 shadow-sm font-semibold text-blue-700 dark:text-blue-300 dark:bg-slate-900">
                  Super Admin
                </div>
                <div className="mt-4 pl-5 border-l-2 border-slate-300">
                  <div className="relative bg-white border-2 border-blue-400 rounded-lg px-4 py-3 shadow-sm font-medium text-blue-600 dark:text-blue-300 dark:bg-slate-900">
                    Org Admin
                  </div>
                  <div className="mt-4 pl-5 border-l-2 border-slate-300">
                    <div className="relative bg-white border-2 border-slate-300 rounded-lg px-4 py-3 shadow-sm text-slate-800 dark:text-slate-100 dark:bg-slate-900">
                      Department Manager
                    </div>
                    <div className="mt-4 pl-5 border-l-2 border-slate-300">
                      <div className="relative bg-white border-2 border-slate-300 rounded-lg px-4 py-3 shadow-sm text-slate-700 dark:text-slate-200 dark:bg-slate-900">
                        Team Lead
                      </div>
                      <div className="mt-4 pl-5 border-l-2 border-slate-300">
                        <div className="relative bg-white border-2 border-slate-300 rounded-lg px-4 py-3 shadow-sm text-slate-600 dark:text-slate-300 dark:bg-slate-900">
                          Agent/User
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pl-5 border-l-2 border-slate-300">
                  <div className="relative bg-white border-2 border-slate-300 rounded-lg px-4 py-3 shadow-sm text-slate-600 italic dark:text-slate-300 dark:bg-slate-900">
                    Auditor (Read-only)
                  </div>
                </div>
                <div className="mt-4 pl-5 border-l-2 border-slate-300">
                  <div className="relative bg-white border-2 border-slate-300 rounded-lg px-4 py-3 shadow-sm text-slate-600 italic dark:text-slate-300 dark:bg-slate-900">
                    External Client
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. TEST SCENARIOS */}
        {view === 'scenarios' && (
          <section id="content-scenarios">
            <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Test Scenarios</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-4">
              A filterable list of key test scenarios from report Section 9. Use the buttons to quickly find scenarios related to a specific category.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {scenarioBtn('all', 'All Scenarios')}
              {scenarioBtn('access', 'Access-Based')}
              {scenarioBtn('workflow', 'Workflow')}
              {scenarioBtn('call', 'Call/Chat')}
              {scenarioBtn('ui', 'UI/UX')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Access */}
              {showScenario('access') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Access-Based</span>
                  <p className="font-medium mt-1">1. Agent views financial field</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Masked / “Restricted”
                  </p>
                </div>
              )}
              {showScenario('access') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Access-Based</span>
                  <p className="font-medium mt-1">2. Team Lead edits compliance note</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Permission Denied
                  </p>
                </div>
              )}
              {showScenario('access') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Access-Based</span>
                  <p className="font-medium mt-1">4. External Client views internal note</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Not visible
                  </p>
                </div>
              )}
              {showScenario('access') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Access-Based</span>
                  <p className="font-medium mt-1">6. Agent tries to approve client</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Denied; status unchanged
                  </p>
                </div>
              )}

              {/* Workflow */}
              {showScenario('workflow') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-300">Workflow</span>
                  <p className="font-medium mt-1">8. Agent submits draft</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Status → In Review; notification to Team Lead
                  </p>
                </div>
              )}
              {showScenario('workflow') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-300">Workflow</span>
                  <p className="font-medium mt-1">9. Team Lead rejects draft</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Status → Needs Correction; Agent notified
                  </p>
                </div>
              )}
              {showScenario('workflow') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-300">Workflow</span>
                  <p className="font-medium mt-1">11. Org Admin finalizes</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Status → Active; external visibility toggled
                  </p>
                </div>
              )}

              {/* Call/Chat */}
              {showScenario('call') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-green-600 dark:text-green-300">Call/Chat</span>
                  <p className="font-medium mt-1">12. Team Lead starts call; Agent joins</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Both show "In Call" presence
                  </p>
                </div>
              )}
              {showScenario('call') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-green-600 dark:text-green-300">Call/Chat</span>
                  <p className="font-medium mt-1">13. Agent tries to end call started by Manager</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Denied (unless delegated)
                  </p>
                </div>
              )}
              {showScenario('call') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-green-600 dark:text-green-300">Call/Chat</span>
                  <p className="font-medium mt-1">14. External Client tries to join internal call</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Denied + audit event
                  </p>
                </div>
              )}

              {/* UI/UX */}
              {showScenario('ui') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-pink-600 dark:text-pink-300">UI/UX</span>
                  <p className="font-medium mt-1">15. Masking label vs blank field</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Standardized “Restricted” placeholder
                  </p>
                </div>
              )}
              {showScenario('ui') && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                  <span className="text-xs font-semibold uppercase text-pink-600 dark:text-pink-300">UI/UX</span>
                  <p className="font-medium mt-1">18. Notification badge increments</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Expected:</span> Increments on new message for member only
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </SuperAdminShell>
  );
}
