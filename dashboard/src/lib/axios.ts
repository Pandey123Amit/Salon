import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unwrap { success, data } envelope + handle 401
api.interceptors.response.use(
  (response) => response.data.data ?? response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    const message =
      error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
