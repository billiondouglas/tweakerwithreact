import { useState } from 'react'
import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [secretKey, setSecretKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inputFocus, setInputFocus] = useState<{ [key: string]: boolean }>({})
  const [buttonHover, setButtonHover] = useState(false)
  const [linkHover, setLinkHover] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSecretKey(null)

    if (password !== confirmPassword) {
      setError('⚠️ Passwords do not match')
      return
    }

    // Validate fullName 2–50 letters and spaces
    if (!/^[a-zA-Z\s]{2,50}$/.test(fullName.trim())) {
      setError('⚠️ Full name must be 2–50 letters and spaces only')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_BASE}/signup`,
        { username, password, fullName },
        { withCredentials: true }
      )

      setSuccess('Account created successfully!✅')
      setSecretKey(data.secretKey)

      // Persist tokens and user for App.tsx hydration
      if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken)
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user))

      setFullName('')
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        window.location.assign('/')
      }, 500)
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message
      console.error('Signup error:', err?.response?.data || err)
      setError(serverMsg ? `⚠️ ${serverMsg}` : '⚠️ Signup failed')
    } finally {
      setLoading(false)
    }
  }

  // Styles
  const containerStyle: React.CSSProperties = {
    background: '#000000',
    padding: '2.5rem',
    borderRadius: '2em',
    width: '100%',
    maxWidth: '400px',
    margin: '2rem auto',
    boxSizing: 'border-box',
  }
  const headingStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#ffffff',
}
  const labelStyle: React.CSSProperties = { 
    display: 'block',
    marginTop: '1rem',
    color: '#ffffff',
    textAlign: 'left',
}
  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem',
    marginTop: '0.5rem',
    border: '1px solid #555',
    borderRadius: '2em',
    background: '#000000ff',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.2s',
  }
  const buttonStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '2rem',
    padding: '0.7rem',
    backgroundColor: '#a305a6',
    border: 'none',
    borderRadius: '2em',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'box-shadow 0.2s',
    boxShadow: buttonHover ? '0 0 0 2px #a305a6, 0 2px 8px rgba(0,0,0,0.2)' : 'none',
    opacity: loading ? 0.7 : 1,
  }
  const flashBaseStyle: React.CSSProperties = {
    position: 'relative',
    padding: '0.2rem',
    borderRadius: '2em',
    fontSize: '1rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 16px 0 rgba(0,0,0,0.12)',
    color: '#fff',
    fontWeight: 'bold',
    width: '300px',
  }
  const flashErrorStyle: React.CSSProperties = {
    ...flashBaseStyle,
    backgroundColor: '#f70000',
  }
  const flashSuccessStyle: React.CSSProperties = {
    ...flashBaseStyle,
    backgroundColor: '#a305a6ff',
  }
  const messageStyle: React.CSSProperties = {
    marginTop: '2rem',
    backgroundColor: '#1c2128',
    padding: '1rem',
    borderRadius: '6px',
    border: '1px solid #30363d',
    textAlign: 'center' as const,
    color: '#fff',
  }
  const anchorStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: linkHover ? '#a305a6ff' : '#5495ffff',
    transition: 'color 0.2s',
    fontWeight: 500,
    cursor: 'pointer',
  }

  return (
    <div style={containerStyle}>
      {error && <div style={flashErrorStyle}>{error}</div>}
      {success && <div style={flashSuccessStyle}>{success}</div>}

      <h1 style={headingStyle}>Join Tweaker</h1>
      <form onSubmit={handleSubmit} id="signup-form" autoComplete="off">
        <label htmlFor="fullName" style={labelStyle}>Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          style={{
            ...inputBaseStyle,
            boxShadow: inputFocus['fullName'] ? '0 0 0 2px #a305a6' : 'none',
          }}
          onFocus={() => setInputFocus(f => ({ ...f, fullName: true }))}
          onBlur={() => setInputFocus(f => ({ ...f, fullName: false }))}
        />

        <label htmlFor="username" style={labelStyle}>Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{
            ...inputBaseStyle,
            boxShadow: inputFocus['username']
              ? '0 0 0 2px #a305a6'
              : 'none',
          }}
          onFocus={() => setInputFocus(f => ({ ...f, username: true }))}
          onBlur={() => setInputFocus(f => ({ ...f, username: false }))}
        />

        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            ...inputBaseStyle,
            boxShadow: inputFocus['password']
              ? '0 0 0 2px #a305a6'
              : 'none',
          }}
          onFocus={() => setInputFocus(f => ({ ...f, password: true }))}
          onBlur={() => setInputFocus(f => ({ ...f, password: false }))}
        />

        <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          style={{
            ...inputBaseStyle,
            boxShadow: inputFocus['confirm-password']
              ? '0 0 0 2px #a305a6'
              : 'none',
          }}
          onFocus={() => setInputFocus(f => ({ ...f, ['confirm-password']: true }))}
          onBlur={() => setInputFocus(f => ({ ...f, ['confirm-password']: false }))}
        />

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>
          Using API: {API_BASE}
        </p>
      </form>

      {secretKey && (
        <div id="message" style={messageStyle}>
          <h2 style={headingStyle}>Your Unique Secret Key</h2>
          <p style={{ fontWeight: 'bold', wordBreak: 'break-all' }}>{secretKey}</p>
          <small>
            Copy and store this key securely. It will be required to recover your account.
            Tweaker will never show it again.
          </small>
        </div>
      )}

      <p style={{ marginTop: '2rem', textAlign: 'center', color: '#fff' }}>
        Already have an account?{' '}
        <a
          href="/Login"
          style={anchorStyle}
          onMouseEnter={() => setLinkHover(true)}
          onMouseLeave={() => setLinkHover(false)}
        >
          Sign in
        </a>
      </p>
    </div>
  )
}