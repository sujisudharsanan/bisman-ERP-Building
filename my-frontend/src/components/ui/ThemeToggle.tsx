"use client"
import IconButton from '@mui/material/IconButton'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)
  return (
    <IconButton onClick={() => setDark(!dark)}>
      {dark ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  )
}
