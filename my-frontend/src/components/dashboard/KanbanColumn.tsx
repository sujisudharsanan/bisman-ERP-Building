'use client';

import React from 'react';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  title: string;
  tasks: any[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks }) => {
  const getTitleColor = (title: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'text-gray-400',
      'IN PROGRESS': 'text-blue-400',
      'EDITING': 'text-cyan-400',
      'DONE': 'text-green-400',
    };
    return colors[title] || 'text-gray-400';
  };

  return (
    <div className="flex-1 min-w-[280px] p-4 bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-gray-700/30">
      <h2 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getTitleColor(title)}`}>
        {title}
      </h2>
      <div className="space-y-4 overflow-y-auto h-[calc(100vh-240px)] pr-2 custom-scrollbar">
        {tasks.map(task => (
          <TaskCard 
            key={task.id}
            title={task.title}
            subItems={task.subItems}
            progress={task.progress}
            comments={task.comments}
            attachments={task.attachments}
            color={task.color}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
