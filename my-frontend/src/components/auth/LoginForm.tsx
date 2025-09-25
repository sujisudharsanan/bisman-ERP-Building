"use client"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import api from '@/lib/api/axios'
import TextField from '@mui/material/TextField'
import PrimaryButton from '@/components/ui/Button'
import { useNotifications } from '@/providers/notifications/NotificationsProvider'
import { useRouter } from 'next/navigation'

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) })
type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const { push } = useNotifications()
  const router = useRouter()

  async function onSubmit(values: FormData) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      push({ message: 'Please fill required fields', severity: 'error' })
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/login', values)
      push({ message: 'Signed in', severity: 'success' })
      router.push('/')
    } catch (err: any) {
      push({ message: err?.response?.data?.message || 'Login failed', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-4">
      <div className="mb-4">
        <TextField label="Username" fullWidth {...register('username')} error={!!errors.username} helperText={errors.username ? 'Required' : ''} />
      </div>

      <div className="mb-4">
        <TextField label="Password" type="password" fullWidth {...register('password')} error={!!errors.password} helperText={errors.password ? 'Required' : ''} />
      </div>

      <PrimaryButton type="submit" variant="contained" color="primary" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </PrimaryButton>
    </form>
  )
}
