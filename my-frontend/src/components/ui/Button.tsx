"use client"
import React from 'react'
import MuiButton from '@mui/material/Button'

type Props = React.ComponentProps<typeof MuiButton> & { children: React.ReactNode }

export default function PrimaryButton({ children, ...rest }: Props) {
  return (
    <MuiButton {...rest} className={(rest.className ?? '') + ' rounded-md'}>
      {children}
    </MuiButton>
  )
}
