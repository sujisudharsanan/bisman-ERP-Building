'use client';

import React from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';

interface TaskCardProps {
  title: string;
  subItems: { id: string, text: string }[];
  progress?: number;
  comments: number;
  attachments: number;
  color: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ title, subItems, progress, comments, attachments, color }) => {
  // Fixed: Pre-defined Tailwind classes instead of dynamic interpolation
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600/70',
    pink: 'from-pink-500 to-pink-600/70',
    purple: 'from-purple-500 to-purple-600/70',
    yellow: 'from-yellow-500 to-yellow-600/70',
    green: 'from-green-500 to-green-600/70',
    cyan: 'from-cyan-500 to-cyan-600/70',
    teal: 'from-teal-500 to-teal-600/70',
    indigo: 'from-indigo-500 to-indigo-600/70',
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 shadow-lg shadow-indigo-500/10 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 border border-gray-700/50">
      <h3 className="font-bold mb-3 text-white">{title}</h3>
      <div className="space-y-2">
        {subItems.map(item => (
          <div 
            key={item.id} 
            className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} text-white text-sm font-medium shadow-sm`}
          >
            {item.text}
          </div>
        ))}
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 text-gray-400 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <MessageSquare size={14} />
            <span>{comments}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Paperclip size={14} />
            <span>{attachments}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
