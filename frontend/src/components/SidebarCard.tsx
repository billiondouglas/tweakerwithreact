import { useEffect, useState } from 'react'
import axios from 'axios'
interface SidebarCardProps {
  fullName: string;
  username: string;
  onProfileClick?: () => void;
}

export function SidebarCard({ fullName, username, onProfileClick }: SidebarCardProps) {
  const [bio, setBio] = useState<string>('')
  const [link, setLink] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')
  const [cover, setCover] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'
        const { data } = await axios.get(`${base}/users/me`, { withCredentials: true })
        if (data) {
          if (typeof data.bio === 'string') setBio(data.bio)
          if (typeof data.link === 'string') setLink(data.link)
          if (typeof data.avatar === 'string') setAvatar(data.avatar)
          if (typeof data.coverImage === 'string') setCover(data.coverImage)
        }
      } catch (e) {
        console.error('fetch sidebar user failed', e)
      }
    }
    run()
  }, [])
  return (
    <div className="panel" style={{padding:16}}>
        <div
          style={{
            height:96,
            borderRadius:12,
            backgroundImage: cover ? `url(${cover})` : "url('/images/cover.svg')",
            backgroundSize:'cover',
            backgroundPosition:'center',
            backgroundColor:'var(--panel)'
          }}
        />
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginTop:-24, gap:8}}>
          <img
            src={avatar || "/images/avatar.png"}
            width={56}
            height={56}
            style={{borderRadius:999, border:"3px solid var(--panel)"}}
          />
          <div style={{textAlign:"center"}}>
            <div style={{ fontWeight: 700, color: "var(--bold-text)" }}>{fullName}</div>
            <div style={{ color: "var(--muted)", fontWeight: 300 }}>@{username}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ marginBottom: 4, color: "var(--bold-text)", fontSize: "14px" }}>
            {bio || 'No bio yet'}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "13px", color: "var(--muted)" }}>
            {link ? (
              <div>
                🔗 <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {(() => { try { return new URL(link).hostname.replace(/^www\./,'') } catch { return link } })()}
                </a>
              </div>
            ) : (
              <div style={{ color: 'var(--muted)' }}>🔗 Add your link</div>
            )}
          </div>
        </div>
      <div style={{ height: "1px", backgroundColor: "var(--panel-alt)", margin: "8px 0" }} />
      <div style={{ color:"var( --bold-text)",display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{ flex:1, textAlign:"center"}}>
          <b>6,664</b> <span style={{color:"var(--muted)"}}>Following</span>
        </div>
        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            backgroundColor: "rgba(0,0,0,0.15)",
            margin: "0 8px"
          }}
        />
        <div style={{flex:1, textAlign:"center"}}>
          <b>9,991</b> <span style={{color:"var(--muted)"}}>Followers</span>
        </div>
      </div>
      <div style={{ height: "1px", backgroundColor: "var(--panel-alt)", margin: "8px 0" }} />
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          type="button"
          onClick={onProfileClick}
          style={{
            color: "var(--bg)",
            padding: "10px 18px",
            borderRadius: "2em",
            fontWeight: 600,
            background: "var(--bold-text)",
            border: "none",
            cursor: "pointer"
          }}
        >
          My Profile
        </button>
      </div>
    </div>
  );
}