'use client';

import React from 'react';
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

const RightPanel: React.FC = () => {
  const completedTasksData = {
    labels: ['Author A', 'Author B', 'Author C', 'Author D'],
    datasets: [
      {
        label: 'Completed Tasks',
        data: [210, 110, 176, 145],
        backgroundColor: ['#3b82f6', '#a855f7', '#ec4899', '#f59e0b'],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
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
    { author: 'Author A', value: 75, color: '#3b82f6' },
    { author: 'Author B', value: 44, color: '#a855f7' },
    { author: 'Author C', value: 68, color: '#ec4899' },
    { author: 'Author D', value: 55, color: '#f59e0b' },
  ];

  const scheduleItems = [
    { time: '12:00 - 13:00', task: 'Incididunt ut labore et dolore', color: 'border-blue-500' },
    { time: '13:00 - 14:00', task: 'Et do enim veliam quis ex ea', color: 'border-cyan-500' },
    { time: '14:00 - 15:00', task: 'Aliquip qui facilisis adipiscin', color: 'border-purple-500' },
    { time: '15:00 - 16:00', task: 'Excepteur sint occaecat cupidatat', color: 'border-yellow-500' },
  ];

  return (
    <aside className="w-full lg:w-96 p-6 bg-gray-900/30 backdrop-blur-sm border-l border-gray-800/50 space-y-8 overflow-y-auto">
      {/* User Profile Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Name Surname</h3>
          <p className="text-sm text-gray-400">Adipiscing elit sed do eiusmod</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold">NS</span>
        </div>
      </div>

      {/* Completed Tasks Chart */}
      <div>
        <h2 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">Completed Tasks</h2>
        <div className="h-48 bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
          <Bar data={completedTasksData} options={barOptions} />
        </div>
      </div>

      {/* Efficiency Section */}
      <div>
        <h2 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">Efficiency</h2>
        <div className="grid grid-cols-4 gap-4">
          {efficiencyData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <Doughnut 
                  data={createDoughnutData(item.value, item.color)} 
                  options={doughnutOptions} 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{item.value}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">{item.author}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plan/Schedule Section */}
      <div>
        <h2 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">Plan</h2>
        <div className="space-y-3">
          {scheduleItems.map((item, index) => (
            <div 
              key={index} 
              className={`p-3 bg-gray-800/50 rounded-lg border-l-4 ${item.color} hover:bg-gray-800/70 transition-colors`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{item.time}</p>
                  <p className="text-gray-400 text-xs mt-1">{item.task}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;
