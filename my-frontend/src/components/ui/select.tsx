'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Context for Select
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select provider');
  }
  return context;
}

// Main Select component
interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Select({ value, onValueChange, children, disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// SelectTrigger - the button that opens the dropdown
interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { open, setOpen } = useSelectContext();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(!open)}
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800 px-3 py-2 text-sm
        placeholder:text-gray-400 dark:placeholder:text-gray-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        disabled:cursor-not-allowed disabled:opacity-50
        text-gray-900 dark:text-gray-100
        ${className}
      `}
    >
      {children}
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

// SelectValue - displays the selected value
interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder = 'Select...' }: SelectValueProps) {
  const { value } = useSelectContext();
  
  // We'll let the parent handle rendering the display text
  // For now, show value or placeholder
  return (
    <span className={value ? '' : 'text-gray-400 dark:text-gray-500'}>
      {value || placeholder}
    </span>
  );
}

// SelectContent - the dropdown container
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { open, setOpen } = useSelectContext();
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        // Check if click was on the trigger
        const trigger = contentRef.current.previousElementSibling;
        if (trigger && !trigger.contains(event.target as Node)) {
          setOpen(false);
        }
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`
        absolute z-50 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 shadow-lg
        animate-in fade-in-0 zoom-in-95
        max-h-60 overflow-auto
        ${className}
      `}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

// SelectItem - individual option
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SelectItem({ value, children, className = '', disabled = false }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleSelect = () => {
    if (!disabled) {
      onValueChange(value);
      setOpen(false);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`
        relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${className}
      `}
    >
      <span className="flex-1">{children}</span>
      {isSelected && <Check className="h-4 w-4 ml-2" />}
    </div>
  );
}

// SelectGroup - group of items with a label
interface SelectGroupProps {
  children: React.ReactNode;
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <div className="py-1">{children}</div>;
}

// SelectLabel - label for a group
interface SelectLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectLabel({ children, className = '' }: SelectLabelProps) {
  return (
    <div className={`px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </div>
  );
}

// SelectSeparator - visual separator between groups
export function SelectSeparator() {
  return <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />;
}

export default Select;
