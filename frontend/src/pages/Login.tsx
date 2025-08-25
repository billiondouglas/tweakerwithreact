import { useState } from 'react'
import axios from 'axios'

export default function Login() {

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [usernameFocused, setUsernameFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [buttonHovered, setButtonHovered] = useState(false)
  const [linkHovered, setLinkHovered] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null); setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_BASE}/auth/login`,
        { username: username.trim().toLowerCase(), password },
        { withCredentials: true }
      )
      if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken)
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user))
      setSuccess('Logged in')
      window.location.assign('/')
    } catch (err: any) {
      if (err.response) {
        console.error('Login failed:', { status: err.response.status, data: err.response.data })
        setError(err.response.data?.error || `Login failed (${err.response.status})`)
      } else if (err.request) {
        console.error('Login no response:', err.request)
        setError('No response from server. Check CORS and that the server is running on port 4000.')
      } else {
        console.error('Login error:', err.message)
        setError(`Login error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '700px',
    margin: '2rem auto',
    padding: '2rem',
    borderRadius: '2em',
    backgroundColor: '#000000ff',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginTop: '1rem',
    color: '#ffffff',
    textAlign: 'left',
    marginLeft: '20%'
  }

  const inputBaseStyle: React.CSSProperties = {
    width: '60%',
    padding: '0.8rem',
    marginTop: '0.5rem',
    border: '1px solid #555',
    borderRadius: '2em',
    backgroundColor: '#000000ff',
    color: '#ffffffff',
    outline: 'none',
    transition: 'box-shadow 0.2s ease',
  }

  const usernameInputStyle: React.CSSProperties = {
    ...inputBaseStyle,
    boxShadow: usernameFocused ? '0 0 5px 2px #a305a6' : 'none',
  }

  const passwordInputStyle: React.CSSProperties = {
    ...inputBaseStyle,
    boxShadow: passwordFocused ? '0 0 5px 2px #a305a6' : 'none',
  }

  const buttonStyle: React.CSSProperties = {
    width: '60%',
    marginTop: '2rem',
    padding: '0.8rem',
    backgroundColor: '#a305a6',
    border: 'none',
    borderRadius: '2em',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
    boxShadow: buttonHovered ? '0 0 0 2px #a305a6, 0 2px 8px rgba(0,0,0,0.2)' : 'none',
    opacity: loading ? 0.7 : 1,
  }

  const flashMessageStyle = (isError: boolean): React.CSSProperties => ({
    padding: '0.1rem',
    marginBottom: '0.5rem',
    borderRadius: '1.5em',
    color: isError ? 'white' : 'black',
    backgroundColor: isError ? '#dc160fff' : '#d4edda',
    zIndex: '1',
  })

  const linkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: linkHovered ? '#a305a6' : '#5495ffff',
    transition: 'color 0.2s ease',
  }

  return (
    <div style={containerStyle}>
      {/* flash messages */}
      {error && <div style={flashMessageStyle(true)}><p>{error}</p></div>}
      {success && <div style={flashMessageStyle(false)}><p>{success}</p></div>}

      <h1 style={{ textAlign: 'center', color: '#ffffff' }}>Log In</h1>
      <form onSubmit={onSubmit} id="login-form">
        <label htmlFor="username" style={labelStyle}>Username</label>
        <input
          id="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={usernameInputStyle}
          onFocus={() => setUsernameFocused(true)}
          onBlur={() => setUsernameFocused(false)}
        />

        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={passwordInputStyle}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p style={{ color: '#ffffff' }}>Don't have an account?  {'  '}
        <a
          href="/Signup"
          style={linkStyle}
          onMouseEnter={() => setLinkHovered(true)}
          onMouseLeave={() => setLinkHovered(false)}
        >
          Sign up
        </a>
      </p>
    </div> 
  )
}