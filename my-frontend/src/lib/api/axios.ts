import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

let isRefreshing = false
let failedQueue: Array<{ resolve: (v?: any) => void; reject: (e: any) => void; config: any }> = []

const processQueue = (error: any, token: string | null = null) => {
	failedQueue.forEach((p) => {
		if (error) p.reject(error)
		else p.resolve(p.config)
	})
	failedQueue = []
}

// Ensure CSRF token is present for unsafe requests (double-submit cookie pattern)
api.interceptors.request.use(async (config) => {
	const method = (config.method || 'get').toLowerCase()
	if (['post', 'put', 'patch', 'delete'].includes(method)) {
		// if csrf cookie absent, fetch it from /auth/csrf
		const cookies = document?.cookie || ''
		if (!cookies.includes('csrf_token=')) {
			try {
				await axios.get('/api/auth/csrf', { withCredentials: true })
			} catch (e) {
				// ignore
			}
		}

		// read cookie and set header
		const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
		const token = match ? decodeURIComponent(match[1]) : null
		if (token) {
			config.headers = config.headers || {}
			config.headers['x-csrf-token'] = token
		}
	}

	return config
})

api.interceptors.response.use(
	(res) => res,
	async (err) => {
		const originalRequest = err.config
		if (err.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
						return new Promise(function (resolve, reject) {
							failedQueue.push({ resolve, reject, config: originalRequest })
						}).then((cfg) => api(cfg as import('axios').AxiosRequestConfig))
			}

			originalRequest._retry = true
			isRefreshing = true

			try {
				await api.post('/auth/refresh')
				processQueue(null, 'ok')
				return api(originalRequest)
			} catch (e) {
				processQueue(e, null)
				return Promise.reject(e)
			} finally {
				isRefreshing = false
			}
		}

		return Promise.reject(err)
	}
)

export default api
