'use client';

import React, { useEffect, useState } from 'react';
import ConnectedCard from './ConnectedCard';
import { dashboardConnections } from '@/config/dashboardConnections';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type RightPanelProps = {
  mode?: 'sidebar' | 'inline' | 'dock';
};

const RightPanel: React.FC<RightPanelProps> = ({ mode = 'sidebar' }) => {
  const [chartColors, setChartColors] = useState<string[]>(['#3b82f6', '#a855f7', '#ec4899', '#f59e0b']);
  const [completedTasksData, setCompletedTasksData] = useState(() => ({
    labels: ['Author A', 'Author B', 'Author C', 'Author D'],
    datasets: [
      {
        label: 'Completed Tasks',
        data: [210, 110, 176, 145],
        backgroundColor: chartColors,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }));

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--panel') || '#1f2937',
        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff',
        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff',
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border') || '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#9ca3af',
        },
      },
      y: {
        grid: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--border') || '#374151',
        },
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#9ca3af',
        },
      },
    },
  };

  const createDoughnutData = (value: number, color: string) => ({
    datasets: [
      {
        data: [value, 100 - value],
        backgroundColor: [color, '#374151'],
        borderWidth: 0,
      },
    ],
  });

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  const efficiencyData = [
  { author: 'Author A', value: 75, color: chartColors[0] },
  { author: 'Author B', value: 44, color: chartColors[1] },
  { author: 'Author C', value: 68, color: chartColors[2] },
  { author: 'Author D', value: 55, color: chartColors[3] },
  ];

  const scheduleItems = [
    { time: '12:00 - 13:00', task: 'Incididunt ut labore et dolore', color: 'border-blue-500' },
    { time: '13:00 - 14:00', task: 'Et do enim veliam quis ex ea', color: 'border-cyan-500' },
    { time: '14:00 - 15:00', task: 'Aliquip qui facilisis adipiscin', color: 'border-purple-500' },
    { time: '15:00 - 16:00', task: 'Excepteur sint occaecat cupidatat', color: 'border-yellow-500' },
  ];

  const isInline = mode === 'inline';
  const isDock = mode === 'dock';
  const containerClass = isInline
    ? 'w-full bg-transparent border-0 backdrop-blur-0 overflow-visible h-auto min-h-0'
    : isDock
  ? 'w-44 sm:w-48 md:w-52 lg:w-52 xl:w-52 bg-transparent border-0 backdrop-blur-0 h-full overflow-y-auto -ml-2 min-h-0'
  : 'w-full lg:w-52 xl:w-56 2xl:w-64 bg-panel/60 backdrop-blur-sm border-l border-theme overflow-y-auto flex flex-col h-full min-h-0 px-0.5';
  const wrapperClass = isInline
    ? 'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-w-[960px] xl:max-w-[1000px]'
    : isDock
      ? 'flex flex-col gap-2 px-0.5 py-1'
      : 'flex flex-col';
  const cardGap = isInline || isDock ? '' : 'mb-5';

  return (
    <aside className={containerClass}>
  <div className={isInline ? 'w-full flex justify-end' : ''}>
       <div className={wrapperClass}>
    {/* User Profile Section */}
  <ConnectedCard type="profile" className={`p-1 sm:p-1 ${cardGap} order-1 xl:col-span-1 xl:col-start-1`}>
  <div className="flex items-center justify-between pr-0 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-theme truncate">Name Surname</h3>
          <p className="text-xs sm:text-sm text-muted truncate">Adipiscing elit sed do eiusmod</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 ml-2">
          <span className="text-white font-bold text-sm sm:text-base">NS</span>
        </div>
      </div>
    </ConnectedCard>

      {/* Completed Tasks Chart */}
  <ConnectedCard type="completedTasks" className={`p-1 sm:p-1 ${cardGap} order-3 xl:col-span-1 xl:col-start-2`}>
    <h2 className="font-bold text-theme mb-2 sm:mb-3 uppercase text-xs sm:text-sm tracking-wider">{dashboardConnections.completedTasks.description}</h2>
  <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 bg-panel/40 rounded-xl p-2 sm:p-2 border border-theme">
          <Bar data={completedTasksData} options={barOptions} />
        </div>
      </ConnectedCard>

      {/* Efficiency Section */}
  <ConnectedCard type="efficiency" className={`p-1 sm:p-1 ${cardGap} order-2 xl:col-span-1 xl:col-start-3`}>
  <h2 className="font-bold text-theme mb-2 sm:mb-3 uppercase text-xs sm:text-sm tracking-wider">{dashboardConnections.efficiency.description}</h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {efficiencyData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 mx-auto mb-1 sm:mb-2">
                <Doughnut 
                  data={createDoughnutData(item.value, item.color)} 
                  options={doughnutOptions} 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px] sm:text-xs">{item.value}</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted truncate">{item.author}</p>
            </div>
          ))}
        </div>
      </ConnectedCard>

      {/* Plan/Schedule Section (Daily Plan and Schedule) */}
  <ConnectedCard type="plan" className={`w-full p-1 sm:p-1 order-4 min-h-[120px] ${isInline ? 'lg:col-span-2 xl:col-span-2 xl:col-start-2' : ''}` }>
    <h2 className="font-bold text-theme mb-2 sm:mb-3 uppercase text-xs sm:text-sm tracking-wider">{dashboardConnections.plan.description}</h2>
  <div className="space-y-2.5 max-h-40 md:max-h-44 overflow-y-auto">
          {scheduleItems.map((item, index) => (
            <div 
              key={index} 
              className={`w-full p-1 sm:p-1 bg-panel/60 rounded-lg border-l-2 sm:border-l-3 ${item.color} hover:bg-panel/80 transition-colors`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-theme font-medium text-[10px] sm:text-xs truncate">{item.time}</p>
                  <p className="text-muted text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 line-clamp-2">{item.task}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
  </ConnectedCard>
  </div>
  </div>
  </aside>
  );
};

export default RightPanel;
