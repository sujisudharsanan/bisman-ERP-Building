"use client"
import React from 'react'
import MuiSnackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

export default function GlobalSnackbar({ toasts, onClose }: { toasts: any[]; onClose: (id: string) => void }) {
  const first = toasts[0]
  return (
    <div>
      {first && (
        <MuiSnackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} autoHideDuration={4000} onClose={() => onClose(first.id)}>
          <Alert onClose={() => onClose(first.id)} severity={first.severity ?? 'info'} sx={{ width: '100%' }}>
            {first.message}
          </Alert>
        </MuiSnackbar>
      )}
    </div>
  )
}
