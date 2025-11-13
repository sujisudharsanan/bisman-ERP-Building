"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-6">
        <h1 className="text-2xl font-semibold text-red-600 mb-2">Application Error</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error?.message || 'An unexpected error occurred'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
