import { create } from 'zustand'
import api from '../lib/api/axios'

interface AuthState {
	user: { email: string } | null
	login: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	// Use the configured axios client which points to the backend on port 3001
	login: async (email, password) => {
		console.log('Auth store: attempting login for', email)
		const res = await api.post('/api/login', { email, password })
		console.log('Auth store: login response', res.data)
		// axios automatically throws on 4xx/5xx, so if we get here, login was successful
		// Prefer server-provided user info; fall back to email
		let user = { email }
		try {
			const data = res.data
			if (data && data.email) user = { email: data.email }
		} catch (e) { /* ignore */ }
		console.log('Auth store: setting user', user)
		set({ user })
	},
	logout: async () => {
		try {
			await api.post('/api/logout')
		} catch (e) { /* ignore */ }
		set({ user: null })
	},
}))
