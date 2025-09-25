import { create } from 'zustand'
import api from '@/lib/api'

type AuthState = {
	user: any
	setUser: (u: any) => void
	login: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	setUser: (u) => set({ user: u }),
	login: async (email: string, password: string) => {
		// Note: demo API expects { username, password }
		const res = await api.post('/auth/login', { username: email, password })
		set({ user: res.data.user })
	},
	logout: async () => {
		await api.post('/auth/logout')
		set({ user: null })
	}
}))
