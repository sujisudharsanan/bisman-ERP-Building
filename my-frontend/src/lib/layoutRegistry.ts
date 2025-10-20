/**
 * Layout Registry System
 * Tracks element positions on pages and prevents overlaps
 */

export interface ElementBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  type?: string;
  locked?: boolean;
}

export interface PageLayout {
  elements: ElementBounds[];
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface LayoutRegistry {
  [pageId: string]: PageLayout;
}

// Default configuration
const DEFAULT_GRID_SIZE = 10;
const DEFAULT_SHIFT_INCREMENT = 20;
const MAX_SHIFT_ATTEMPTS = 100;

/**
 * Check if two bounding boxes overlap
 */
export function isOverlapping(a: ElementBounds, b: ElementBounds): boolean {
  // No overlap if one rectangle is completely to the left, right, above, or below the other
  return !(
    a.x + a.width <= b.x ||  // a is completely to the left of b
    a.x >= b.x + b.width ||  // a is completely to the right of b
    a.y + a.height <= b.y || // a is completely above b
    a.y >= b.y + b.height    // a is completely below b
  );
}

/**
 * Check if element overlaps with any existing elements
 */
export function hasOverlap(
  element: ElementBounds,
  existingElements: ElementBounds[],
  excludeId?: string
): boolean {
  return existingElements.some(
    (existing) =>
      existing.id !== excludeId &&
      existing.id !== element.id &&
      isOverlapping(element, existing)
  );
}

/**
 * Calculate overlap area between two elements
 */
export function getOverlapArea(a: ElementBounds, b: ElementBounds): number {
  if (!isOverlapping(a, b)) return 0;

  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  return overlapX * overlapY;
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Find the nearest free position for an element
 * Uses a spiral search pattern: down, right, down-right, up, left, etc.
 */
export function findFreeSpot(
  pageId: string,
  newElement: ElementBounds,
  registry: LayoutRegistry,
  options?: {
    preferredDirection?: 'down' | 'right' | 'diagonal';
    shiftIncrement?: number;
    maxAttempts?: number;
    snapToGrid?: boolean;
    gridSize?: number;
  }
): ElementBounds {
  const page = registry[pageId];
  if (!page || page.elements.length === 0) {
    return newElement;
  }

  const existingElements = page.elements;
  const shiftIncrement = options?.shiftIncrement || DEFAULT_SHIFT_INCREMENT;
  const maxAttempts = options?.maxAttempts || MAX_SHIFT_ATTEMPTS;
  const gridSize = options?.gridSize || page.gridSize || DEFAULT_GRID_SIZE;
  const shouldSnap = options?.snapToGrid ?? page.snapToGrid ?? false;

  let candidate = { ...newElement };
  let attempts = 0;

  // If no overlap, return original position
  if (!hasOverlap(candidate, existingElements)) {
    return shouldSnap
      ? {
          ...candidate,
          x: snapToGrid(candidate.x, gridSize),
          y: snapToGrid(candidate.y, gridSize),
        }
      : candidate;
  }

  // Spiral search pattern
  const directions = [
    { dx: 0, dy: 1, name: 'down' },      // down
    { dx: 1, dy: 0, name: 'right' },     // right
    { dx: 1, dy: 1, name: 'diagonal' },  // down-right
    { dx: 0, dy: -1, name: 'up' },       // up
    { dx: -1, dy: 0, name: 'left' },     // left
    { dx: -1, dy: -1, name: 'up-left' }, // up-left
    { dx: 1, dy: -1, name: 'up-right' }, // up-right
    { dx: -1, dy: 1, name: 'down-left' },// down-left
  ];

  // Prioritize preferred direction
  if (options?.preferredDirection) {
    const preferredIndex = directions.findIndex(
      (d) => d.name === options.preferredDirection
    );
    if (preferredIndex > 0) {
      const preferred = directions.splice(preferredIndex, 1)[0];
      directions.unshift(preferred);
    }
  }

  // Try each direction in increasing distances
  for (let distance = shiftIncrement; attempts < maxAttempts; distance += shiftIncrement) {
    for (const direction of directions) {
      attempts++;

      candidate = {
        ...newElement,
        x: newElement.x + direction.dx * distance,
        y: newElement.y + direction.dy * distance,
      };

      // Ensure position doesn't go negative
      if (candidate.x < 0 || candidate.y < 0) continue;

      // Apply grid snapping if enabled
      if (shouldSnap) {
        candidate.x = snapToGrid(candidate.x, gridSize);
        candidate.y = snapToGrid(candidate.y, gridSize);
      }

      // Check if this position is free
      if (!hasOverlap(candidate, existingElements)) {
        console.log(
          `✅ Found free spot after ${attempts} attempts at (${candidate.x}, ${candidate.y})`
        );
        return candidate;
      }

      if (attempts >= maxAttempts) break;
    }
  }

  // Fallback: place far to the right/bottom
  console.warn(
    `⚠️ Could not find free spot after ${maxAttempts} attempts, using fallback position`
  );
  const maxY = Math.max(...existingElements.map((e) => e.y + e.height), 0);
  return {
    ...newElement,
    x: shouldSnap ? snapToGrid(newElement.x, gridSize) : newElement.x,
    y: shouldSnap ? snapToGrid(maxY + shiftIncrement, gridSize) : maxY + shiftIncrement,
  };
}

/**
 * Register or update an element in the layout
 */
export function registerElement(
  pageId: string,
  element: ElementBounds,
  registry: LayoutRegistry
): LayoutRegistry {
  const newRegistry = { ...registry };

  if (!newRegistry[pageId]) {
    newRegistry[pageId] = {
      elements: [],
      gridSize: DEFAULT_GRID_SIZE,
      snapToGrid: false,
    };
  }

  const page = newRegistry[pageId];
  const existingIndex = page.elements.findIndex((e) => e.id === element.id);

  if (existingIndex >= 0) {
    // Update existing element
    page.elements[existingIndex] = element;
  } else {
    // Add new element
    page.elements.push(element);
  }

  return newRegistry;
}

/**
 * Remove an element from the layout
 */
export function removeElement(
  pageId: string,
  elementId: string,
  registry: LayoutRegistry
): LayoutRegistry {
  const newRegistry = { ...registry };

  if (!newRegistry[pageId]) return newRegistry;

  newRegistry[pageId].elements = newRegistry[pageId].elements.filter(
    (e) => e.id !== elementId
  );

  return newRegistry;
}

/**
 * Get all elements for a page
 */
export function getPageElements(
  pageId: string,
  registry: LayoutRegistry
): ElementBounds[] {
  return registry[pageId]?.elements || [];
}

/**
 * Clear all elements from a page
 */
export function clearPage(
  pageId: string,
  registry: LayoutRegistry
): LayoutRegistry {
  const newRegistry = { ...registry };
  if (newRegistry[pageId]) {
    newRegistry[pageId].elements = [];
  }
  return newRegistry;
}

/**
 * Get bounding box that contains all elements on a page
 */
export function getPageBounds(pageId: string, registry: LayoutRegistry): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  const elements = getPageElements(pageId, registry);
  if (elements.length === 0) return null;

  const minX = Math.min(...elements.map((e) => e.x));
  const minY = Math.min(...elements.map((e) => e.y));
  const maxX = Math.max(...elements.map((e) => e.x + e.width));
  const maxY = Math.max(...elements.map((e) => e.y + e.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Update page settings
 */
export function updatePageSettings(
  pageId: string,
  settings: Partial<PageLayout>,
  registry: LayoutRegistry
): LayoutRegistry {
  const newRegistry = { ...registry };

  if (!newRegistry[pageId]) {
    newRegistry[pageId] = {
      elements: [],
      gridSize: DEFAULT_GRID_SIZE,
      snapToGrid: false,
    };
  }

  newRegistry[pageId] = {
    ...newRegistry[pageId],
    ...settings,
  };

  return newRegistry;
}

/**
 * Validate element position (check for overlaps)
 */
export function validateElementPosition(
  pageId: string,
  element: ElementBounds,
  registry: LayoutRegistry,
  options?: {
    excludeId?: string;
    allowOverlap?: boolean;
  }
): {
  valid: boolean;
  overlaps: ElementBounds[];
  message?: string;
} {
  const page = registry[pageId];
  if (!page) {
    return { valid: true, overlaps: [] };
  }

  const overlappingElements = page.elements.filter(
    (existing) =>
      existing.id !== options?.excludeId &&
      existing.id !== element.id &&
      isOverlapping(element, existing)
  );

  if (overlappingElements.length > 0 && !options?.allowOverlap) {
    return {
      valid: false,
      overlaps: overlappingElements,
      message: `Element overlaps with ${overlappingElements.length} existing element(s)`,
    };
  }

  return { valid: true, overlaps: overlappingElements };
}

/**
 * Get suggested positions around an element (for smart placement)
 */
export function getSuggestedPositions(
  pageId: string,
  referenceElement: ElementBounds,
  newElementSize: { width: number; height: number },
  registry: LayoutRegistry,
  spacing: number = 20
): Array<{ x: number; y: number; direction: string; isFree: boolean }> {
  const suggestions = [
    {
      x: referenceElement.x,
      y: referenceElement.y + referenceElement.height + spacing,
      direction: 'below',
    },
    {
      x: referenceElement.x + referenceElement.width + spacing,
      y: referenceElement.y,
      direction: 'right',
    },
    {
      x: referenceElement.x,
      y: referenceElement.y - newElementSize.height - spacing,
      direction: 'above',
    },
    {
      x: referenceElement.x - newElementSize.width - spacing,
      y: referenceElement.y,
      direction: 'left',
    },
  ];

  const existingElements = getPageElements(pageId, registry);

  return suggestions.map((pos) => {
    const testElement: ElementBounds = {
      id: 'test',
      x: pos.x,
      y: pos.y,
      width: newElementSize.width,
      height: newElementSize.height,
    };

    return {
      ...pos,
      isFree: pos.x >= 0 && pos.y >= 0 && !hasOverlap(testElement, existingElements),
    };
  });
}
