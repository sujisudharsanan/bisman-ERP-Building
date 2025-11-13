'use client';

import DarkModeToggle from './DarkModeToggle';

export default function GlobalDarkModeToggle() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <DarkModeToggle />
    </div>
  );
}
