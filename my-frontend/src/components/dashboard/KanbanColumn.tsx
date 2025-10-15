'use client';

import React from 'react';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  title: string;
  tasks: any[];
  showCreate?: boolean;
  onCreate?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, showCreate = false, onCreate }) => {
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
    <div className="relative flex flex-col flex-1 min-w-[13rem] max-w-[17rem] p-2 bg-panel/60 backdrop-blur-sm rounded-2xl border border-theme">
      {/* top-right count badge */}
      <span
        className="absolute right-3 top-3 text-white text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#f59e0b' }}
      >
        {tasks.length}
      </span>
    <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
      <h2 className={`font-bold text-xs uppercase tracking-wider ${getTitleColor(title)}`}>{title}</h2>
        </div>
        {showCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center justify-center text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md mr-12"
          >
            Create
          </button>
        )}
      </div>
      <div className="space-y-2.5 pr-2 pb-0 mb-0">
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
