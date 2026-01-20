'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionContextValue {
  expandedItems: Set<string>;
  toggle: (value: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Accordion Root
 * ───────────────────────────────────────────────────────────────────────── */
interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  /** Allow multiple items to be expanded at once (default: false) */
  allowMultiple?: boolean;
  /** Default expanded item values */
  defaultExpanded?: string[];
  /** Controlled expanded state */
  expanded?: string[];
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: string[]) => void;
}

export function Accordion({
  children,
  className,
  allowMultiple = false,
  defaultExpanded = [],
  expanded: controlledExpanded,
  onExpandedChange
}: AccordionProps) {
  const [internalExpanded, setInternalExpanded] = React.useState<Set<string>>(
    new Set(defaultExpanded)
  );

  const isControlled = controlledExpanded !== undefined;
  const expandedItems = isControlled 
    ? new Set(controlledExpanded) 
    : internalExpanded;

  const toggle = React.useCallback((value: string) => {
    const updateExpanded = (prev: Set<string>) => {
      const next = new Set(prev);
      
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(value);
      }
      
      return next;
    };

    if (isControlled) {
      onExpandedChange?.(Array.from(updateExpanded(expandedItems)));
    } else {
      setInternalExpanded(updateExpanded);
    }
  }, [allowMultiple, isControlled, onExpandedChange, expandedItems]);

  return (
    <AccordionContext.Provider value={{ expandedItems, toggle, allowMultiple }}>
      <div className={cn('divide-y divide-border rounded-lg border', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Accordion Item
 * ───────────────────────────────────────────────────────────────────────── */
interface AccordionItemContextValue {
  value: string;
  isExpanded: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItem() {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionItem components must be used within an AccordionItem');
  }
  return context;
}

interface AccordionItemProps {
  children: React.ReactNode;
  className?: string;
  /** Unique value for this item */
  value: string;
  /** Disable this item */
  disabled?: boolean;
}

export function AccordionItem({ 
  children, 
  className, 
  value,
  disabled = false 
}: AccordionItemProps) {
  const { expandedItems } = useAccordion();
  const isExpanded = expandedItems.has(value);

  return (
    <AccordionItemContext.Provider value={{ value, isExpanded }}>
      <div 
        className={cn(
          'group',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        data-state={isExpanded ? 'open' : 'closed'}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Accordion Trigger
 * ───────────────────────────────────────────────────────────────────────── */
interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  /** Custom icon (default: ChevronDown) */
  icon?: React.ReactNode;
  /** Hide the icon */
  hideIcon?: boolean;
}

export function AccordionTrigger({ 
  children, 
  className,
  icon,
  hideIcon = false
}: AccordionTriggerProps) {
  const { toggle } = useAccordion();
  const { value, isExpanded } = useAccordionItem();

  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      className={cn(
        'flex w-full items-center justify-between px-4 py-3 text-left font-medium',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'transition-colors',
        className
      )}
      aria-expanded={isExpanded}
    >
      <span className="flex-1">{children}</span>
      
      {!hideIcon && (
        <span className={cn(
          'ml-2 shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}>
          {icon || <ChevronDown className="h-4 w-4" />}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Accordion Content
 * ───────────────────────────────────────────────────────────────────────── */
interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  /** Force mount content (useful for SEO) */
  forceMount?: boolean;
}

export function AccordionContent({ 
  children, 
  className,
  forceMount = false
}: AccordionContentProps) {
  const { isExpanded } = useAccordionItem();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(
    isExpanded ? undefined : 0
  );

  React.useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (isExpanded) {
          setHeight(entry.contentRect.height);
        }
      }
    });

    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, [isExpanded]);

  React.useEffect(() => {
    setHeight(isExpanded ? contentRef.current?.scrollHeight : 0);
  }, [isExpanded]);

  if (!forceMount && !isExpanded && height === 0) {
    return null;
  }

  return (
    <div
      className="overflow-hidden transition-all duration-200"
      style={{ height: isExpanded ? height : 0 }}
    >
      <div ref={contentRef} className={cn('px-4 pb-4 pt-0', className)}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Pre-styled Accordion Variants
 * ───────────────────────────────────────────────────────────────────────── */

interface SimpleAccordionItem {
  value: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface SimpleAccordionProps {
  items: SimpleAccordionItem[];
  className?: string;
  allowMultiple?: boolean;
  defaultExpanded?: string[];
}

/**
 * SimpleAccordion - Pre-configured accordion with simple item structure
 * 
 * Usage:
 * <SimpleAccordion
 *   items={[
 *     { value: 'item-1', title: 'Section 1', content: <p>Content 1</p> },
 *     { value: 'item-2', title: 'Section 2', content: <p>Content 2</p> }
 *   ]}
 * />
 */
export function SimpleAccordion({
  items,
  className,
  allowMultiple = false,
  defaultExpanded = []
}: SimpleAccordionProps) {
  return (
    <Accordion 
      allowMultiple={allowMultiple} 
      defaultExpanded={defaultExpanded}
      className={className}
    >
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value} disabled={item.disabled}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default Accordion;
