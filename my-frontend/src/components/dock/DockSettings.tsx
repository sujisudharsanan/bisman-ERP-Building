'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  AlignLeft,
  AlignRight,
  AlignHorizontalJustifyCenter,
  Maximize2,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import { useDock, DockPosition, DockSize, DOCK_MODULES } from './DockContext';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-700/50 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex bg-slate-800 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
            transition-colors
            ${value === option.value
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-300'
            }
          `}
        >
          {value === option.value && (
            <motion.div
              layoutId="segment-bg"
              className="absolute inset-0 bg-slate-600 rounded-md"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {option.icon}
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-11 h-6 rounded-full transition-colors
        ${checked ? 'bg-green-500' : 'bg-slate-600'}
      `}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-green-500
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
        "
      />
      <span className="text-sm text-gray-400 w-10">{value.toFixed(1)}x</span>
    </div>
  );
}

export default function DockSettings() {
  const { preferences, updatePreferences, resetPreferences } = useDock();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const positionOptions: { value: DockPosition; label: string; icon: React.ReactNode }[] = [
    { value: 'left', label: 'Left', icon: <AlignLeft size={14} /> },
    { value: 'bottom', label: 'Bottom', icon: <AlignHorizontalJustifyCenter size={14} /> },
    { value: 'right', label: 'Right', icon: <AlignRight size={14} /> },
  ];

  const sizeOptions: { value: DockSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  // Handle drag and drop for favorites reordering
  const handleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedItem(moduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      const newOrder = [...preferences.favoriteModules];
      const fromIndex = newOrder.indexOf(draggedItem);
      const toIndex = newOrder.indexOf(targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedItem);
        updatePreferences({ favoriteModules: newOrder });
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleFavorite = (moduleId: string) => {
    const currentFavorites = preferences.favoriteModules;
    if (currentFavorites.includes(moduleId)) {
      // Don't allow removing if less than 3 favorites
      if (currentFavorites.length <= 3) return;
      updatePreferences({
        favoriteModules: currentFavorites.filter(id => id !== moduleId),
      });
    } else {
      updatePreferences({
        favoriteModules: [...currentFavorites, moduleId],
      });
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 rounded-lg">
            <Monitor size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Dock & Navigation</h3>
            <p className="text-xs text-gray-400">Customize your dock appearance and behavior</p>
          </div>
        </div>
        <button
          onClick={resetPreferences}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white
            bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Settings */}
      <div className="px-6">
        {/* Position */}
        <SettingRow
          label="Dock Position"
          description="Place the dock on the left, right, or bottom of your screen"
        >
          <SegmentedControl
            options={positionOptions}
            value={preferences.dockPosition}
            onChange={(value) => updatePreferences({ dockPosition: value })}
          />
        </SettingRow>

        {/* Size */}
        <SettingRow
          label="Dock Size"
          description="Adjust the size of dock icons"
        >
          <SegmentedControl
            options={sizeOptions}
            value={preferences.dockSize}
            onChange={(value) => updatePreferences({ dockSize: value })}
          />
        </SettingRow>

        {/* Magnification */}
        <SettingRow
          label="Magnification on Hover"
          description="Enable macOS-style magnification effect"
        >
          <div className="flex items-center gap-4">
            <Toggle
              checked={preferences.magnifyOnHover}
              onChange={(checked) => updatePreferences({ magnifyOnHover: checked })}
            />
          </div>
        </SettingRow>

        {/* Magnification Intensity */}
        {preferences.magnifyOnHover && (
          <SettingRow
            label="Magnification Intensity"
            description="How much icons enlarge on hover"
          >
            <Slider
              value={preferences.magnifyIntensity}
              min={1.2}
              max={1.8}
              step={0.1}
              onChange={(value) => updatePreferences({ magnifyIntensity: value })}
            />
          </SettingRow>
        )}

        {/* Auto-hide */}
        <SettingRow
          label="Auto-hide Dock"
          description="Hide the dock when not in use"
        >
          <div className="flex items-center gap-2">
            {preferences.autoHide ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
            <Toggle
              checked={preferences.autoHide}
              onChange={(checked) => updatePreferences({ autoHide: checked })}
            />
          </div>
        </SettingRow>
      </div>

      {/* Favorite Modules */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-white">Favorite Modules</div>
            <div className="text-xs text-gray-400">Drag to reorder, click to toggle visibility</div>
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">{preferences.favoriteModules.length} modules</span>
          </div>
        </div>

        <div className="space-y-2">
          {DOCK_MODULES.map((module) => {
            const isFavorite = preferences.favoriteModules.includes(module.id);
            const order = preferences.favoriteModules.indexOf(module.id);
            
            return (
              <div
                key={module.id}
                draggable={isFavorite}
                onDragStart={(e) => handleDragStart(e, module.id)}
                onDragOver={(e) => handleDragOver(e, module.id)}
                onDragEnd={handleDragEnd}
                onClick={() => toggleFavorite(module.id)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                  transition-all
                  ${isFavorite
                    ? 'bg-slate-700/50 border border-slate-600'
                    : 'bg-transparent border border-transparent hover:bg-slate-700/30'
                  }
                  ${draggedItem === module.id ? 'opacity-50' : ''}
                `}
              >
                {isFavorite && (
                  <GripVertical size={16} className="text-gray-500 cursor-grab" />
                )}
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${isFavorite ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-gray-400'}
                `}>
                  {order >= 0 && isFavorite && (
                    <span className="text-xs font-bold">{order + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isFavorite ? 'text-white' : 'text-gray-400'}`}>
                    {module.label}
                  </div>
                  {module.shortcut && (
                    <div className="text-xs text-gray-500">{module.shortcut}</div>
                  )}
                </div>
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  transition-colors
                  ${isFavorite
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-500'
                  }
                `}>
                  {isFavorite && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
