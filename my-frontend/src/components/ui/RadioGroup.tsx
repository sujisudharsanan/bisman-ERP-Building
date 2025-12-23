'use client';

import React, { createContext, useContext, useState } from 'react';

interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
  className = '',
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div role="radiogroup" className={`grid gap-2 ${className}`}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({ value, id, disabled = false, className = '' }: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');

  const isChecked = context.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      id={id}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={`
        aspect-square h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600
        text-blue-600 ring-offset-white
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${isChecked ? 'border-blue-600 bg-blue-600' : ''}
        ${className}
      `}
    >
      {isChecked && (
        <span className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}

export default RadioGroup;
