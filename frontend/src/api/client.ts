import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
export const api = axios.create({
  baseURL: "http://localhost:4000", // your backend port
  withCredentials: true,            // if using sessions
})

// bootstrap anon token once
const storageKey = 'anon_token'
async function ensureToken() {
  let t = localStorage.getItem(storageKey)
  if (!t) {
    const r = await fetch(`${BASE}/auth/anon`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    })
    const d = await r.json()
    t = d.accessToken
    localStorage.setItem(storageKey, t ?? '')
  }
  return t
}

// attach token to every request
api.interceptors.request.use(async (cfg) => {
  const t = await ensureToken()
  cfg.headers = cfg.headers || {}
  cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})