'use client';
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

// GlobalSnackbar implemented with MUI Alerts stacked in the bottom-right corner.
function GlobalSnackbar({
  toasts,
  onClose,
}: {
  toasts: {
    id: string;
    message: string;
    severity?: 'info' | 'success' | 'warning' | 'error';
  }[];
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    // auto-dismiss toasts after 5s
    const timers = toasts.map(t =>
      setTimeout(() => {
        onClose(t.id);
      }, 5000)
    );
    return () => timers.forEach(id => clearTimeout(id));
  }, [toasts, onClose]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <Box
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {toasts.map(t => (
        <Alert
          key={t.id}
          severity={t.severity ?? 'info'}
          onClose={() => onClose(t.id)}
          variant="filled"
          sx={{ minWidth: 240 }}
        >
          {t.message}
        </Alert>
      ))}
    </Box>
  );
}

type Toast = {
  id: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
};

type Context = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
};

const NotificationsContext = createContext<Context | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(t: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    setToasts(s => [...s, { id, ...t }]);
  }

  function remove(id: string) {
    setToasts(s => s.filter(t => t.id !== id));
  }

  return (
    <NotificationsContext.Provider value={{ toasts, push, remove }}>
      {children}
      <GlobalSnackbar toasts={toasts} onClose={remove} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      'useNotifications must be used within NotificationsProvider'
    );
  return ctx;
}
