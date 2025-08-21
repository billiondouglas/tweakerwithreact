import { useState, useRef, useEffect } from "react";
import { FaRegImage, FaRegSmile, FaMapMarkerAlt, /*FaRegCalendarAlt,*/ FaSlidersH } from "react-icons/fa";
import { TbGif } from "react-icons/tb"; // GIF wordmark icon

/**
 * Composer: "Say something..." input with action icons
 * Order: Media, GIF, Poll, Emoji, Schedule, Location
 * - Icons use var(--primary)
 * - Only hover effect: show label under icon
 * - Post button aligned to the right
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

type ComposerProps = { onPost?: (text: string) => void }
export function Composer({ onPost }: ComposerProps) {
  const [text, setText] = useState("");
  const maxChars = 280;
  const remaining = maxChars - text.length;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  async function refreshAccessToken() {
    try {
      const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!r.ok) return null
      const data = await r.json().catch(() => null)
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
        if (data?.user) localStorage.setItem('user', JSON.stringify(data.user))
        return data.accessToken as string
      }
      return null
    } catch { return null }
  }

  async function postTweet(textToPost: string) {
    const at0 = localStorage.getItem('accessToken') || ''
    const res1 = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(at0 ? { Authorization: `Bearer ${at0}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ text: textToPost }),
    })
    if (res1.status === 401) {
      const at1 = await refreshAccessToken()
      if (!at1) return { ok: false, status: 401 }
      const res2 = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${at1}`,
        },
        credentials: 'include',
        body: JSON.stringify({ text: textToPost }),
      })
      return { ok: res2.ok, status: res2.status, data: await res2.text().then(t => { try { return JSON.parse(t) } catch { return t } }) }
    }
    return { ok: res1.ok, status: res1.status, data: await res1.text().then(t => { try { return JSON.parse(t) } catch { return t } }) }
  }

  return (
    <div className="panel" style={{ padding: 16 }}>
      {/* Input */}
      <textarea
        ref={textareaRef}
        className="input"
        placeholder="Say something..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          fontSize: 18,
          background: "transparent",
          border: "none",
          outline: "none",
          textAlign: "left",
          boxShadow: "none",
          width: "100%",        // 👈 make it full width
          display: "block",     // 👈 ensure it spans horizontally
          resize: "none",
          overflow: "hidden",
          minHeight: 80,
        }}
      />

      {/* Character counter */}
      {remaining < 20 && (
        <div className={`char-counter${remaining <= 10 ? " danger" : ""}`} style={{ textAlign: "right", marginTop: 4, marginBottom: 8 }}>
          {remaining}
        </div>
      )}

      {/* Actions + Post */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        {/* Icon row */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <IconWithLabel label="Media"><FaRegImage size={22} color="var(--primary)" /></IconWithLabel>
          <IconWithLabel label="GIF"><TbGif size={22} color="var(--primary)" /></IconWithLabel>
          <IconWithLabel label="Poll"><FaSlidersH size={22} color="var(--primary)" /></IconWithLabel>
          <IconWithLabel label="Emoji"><FaRegSmile size={22} color="var(--primary)" /></IconWithLabel>
         {/*<IconWithLabel label="Schedule"><FaRegCalendarAlt size={22} color="var(--primary)" /></IconWithLabel>*/}
          <IconWithLabel label="Location"><FaMapMarkerAlt size={22} color="var(--primary)" /></IconWithLabel>
        </div>

        {/* Post button */}
        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn"
            style={{ cursor: (!text.trim() || remaining < 0) ? 'not-allowed' : 'pointer' }}
            onClick={async () => {
              const payload = text.trim()
              if (!payload) {
                console.warn('Post blocked: empty text')
                return
              }
              if (remaining < 0) {
                console.warn('Post blocked: over 280 characters')
                return
              }
              const at = localStorage.getItem('accessToken')
              if (!at) console.warn('No accessToken in localStorage; POST will likely 401')
              console.debug('POST /posts →', { API_BASE, len: payload.length })

              const result = await postTweet(payload)
              if (!result.ok) {
                console.error('Post failed', result.status, result.data || '')
                return
              }
              if (typeof onPost === 'function') onPost(payload)
              setText('')
            }}
            type="button"
            disabled={!text.trim() || remaining < 0}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Small helper component to render an icon with a tooltip-like label
 * appearing *below* the icon on hover. No other hover effects.
 */
function IconWithLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="icon-wrap">
      <button className="icon-btn" aria-label={label}>
        {children}
      </button>
      <span className="icon-label">{label}</span>
    </div>
  );
}