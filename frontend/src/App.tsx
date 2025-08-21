import AppShell from "./components/AppShell";
import { SidebarCard } from "./components/SidebarCard";
import { WhoToFollow } from "./components/WhoToFollow";
import { Trends } from "./components/Trends";
import { Composer } from "./components/Composer";
import { Tweet } from "./components/Tweet";
import { useEffect, useState } from "react";

function timeAgo(input: string | Date): string {
  if (!input) return "";
  if (typeof input === "string" && /\b(s|m|h|d|w|yr)\b/.test(input)) return input;

  const dt = typeof input === "string" ? new Date(input) : input;
  if (!(dt instanceof Date) || isNaN(dt.getTime())) return String(input);

  const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}m ago`;
  const y = Math.floor(d / 365);
  return `${y}yr ago`;
}

export default function App(){
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000'

  const [currentUser, setCurrentUser] = useState<{ fullName?: string; username?: string } | null>(null)
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('user')
        if (raw) {
          setCurrentUser(JSON.parse(raw))
        } else {
          const at = localStorage.getItem('accessToken')
          if (at) {
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${at}` },
              credentials: 'include',
            })
            if (res.ok) {
              const { user } = await res.json()
              setCurrentUser(user)
              localStorage.setItem('user', JSON.stringify(user))
            }
          }
        }
      } catch {}
    })()
  }, [])

  type FeedItem = {
    id: string;
    userFullName: string;
    username: string;
    text: string;
    createdAt?: string;
    relative_time?: string;
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number | string;
  }
  const [posts, setPosts] = useState<FeedItem[]>([])

  async function loadFeed() {
    try {
      const r = await fetch(`${API_BASE}/posts/feed/global`, { credentials: 'include' })
      if (!r.ok) return
      const data = await r.json()
      const mapped: FeedItem[] = (data?.items || []).map((it: any) => ({
        id: String(it?.id || ''),
        userFullName: it?.user?.fullName || it?.user?.username || 'Unknown',
        username: it?.user?.username || 'unknown',
        text: it?.text || '',
        createdAt: it?.relative_time || it?.createdAt || (it?.createdAt ? timeAgo(it.createdAt) : ''),
        likes: typeof it?.like_count === 'number' ? it.like_count : 0,
        retweets: typeof it?.repost_count === 'number' ? it.repost_count : 0,
        replies: typeof it?.reply_count === 'number' ? it.reply_count : 0,
        views: typeof it?.view_count === 'number' ? it.view_count : 0,
      }))
      setPosts(mapped)
    } catch {}
  }

  useEffect(() => { loadFeed() }, [])

  const [active, setActive] = useState<"home"|"messages"|"notifications"|"moment">("home");

  return (
    <div>  
      <nav
        className="top-nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          backgroundColor: "transparent",
          borderRadius: "2em",
          borderBottom: "1px solid rgba(199, 157, 200, 0.1)",
          filter: "drop-shadow(-8px -10px 46px #0000005f)",
          backdropFilter: " blur(1.5px)",
          boxShadow: `
      inset 6px 6px 0px -6px rgba(255, 255, 255, 0.7),
      inset 0 0 8px 1px rgba(255, 255, 255, 0.7),
      0 6px 12px rgba(88, 87, 87, 0.12),
      0 8px 32px rgba(0, 0, 0, 0.15)
    `,
          WebkitBackdropFilter: "blur(2px)",
          position: "fixed",
          top: "1px",
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logos/logo.svg" alt="Twitter" width={45} height={45} style={{ borderRadius: "50%", backgroundColor: "transparent",}}/>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--primary)", fontWeight: "bold" }}>Tweaker</h1>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <img
              src="/icons/search.svg"
              alt="Search"
              style={{
                position: "absolute",
                top: "50%",
                left: "12px",
                transform: "translateY(-40%)",
                width: "14px",
                height: "14px",
                pointerEvents: "none",
              }}
            />
            <input
              className="search-bar"
              type="text"
              placeholder="Search"
              style={{
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "999px",
                height: "36px",
                padding: "0 16px 0 36px",
                color: "#000000ff",
                outline: "none",
                fontSize: "14px",
                border: "1px solid #a305a6"
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("home")}
            >
              <img src="/icons/home.svg" alt="Home" width={22} height={22} />
              {active === "home" && <span style={{ fontSize: "13px", color: "#333" }}>Home</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("moment")}
            >
              <img src="/icons/moment.svg" alt="Moment" width={22} height={22} />
              {active === "moment" && <span style={{ fontSize: "13px", color: "#333" }}>Moment</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("messages")}
            >
              <img src="/icons/message.svg" alt="Messages" width={22} height={22} />
              {active === "messages" && <span style={{ fontSize: "13px", color: "#333" }}>Messages</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("notifications")}
            >
              <img src="/icons/notification.svg" alt="Notifications" width={22} height={22} />
              {active === "notifications" && <span style={{ fontSize: "13px", color: "#333" }}>Notifications</span>}
            </div>
          </div>
          {/* Profile pill + menu */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Vertical separator */}
              <div style={{
                  width: "1.5px",
                  height: "30px",}}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "999px", background: "var(--panel-alt)", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <img
                      src="/images/avatar.png"
                      alt="Profile"
                      width={28}
                      height={28}
                      style={{ borderRadius: "50%" }}
                  />
                  <span style={{ fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "4px" }}>
                      {currentUser?.fullName || currentUser?.username || 'Guest'}
                      <img src="/icons/verified.svg" alt="Verified" width={20} height={20} />
                  </span>
              </div>
              <img src="/icons/menu.svg" alt="Menu" width={22} height={22} />
          </div>
        </div>
      </nav>
      <div style={{ height: "60px" }} />
      <AppShell
        left={
        <div style={{ 
          position: "fixed",
          top: "10%",
          overflowY: "auto",
          width: "22%"
        }}>
          <SidebarCard/><div style={{height:16}}/><WhoToFollow/>
        </div>
      }
        center={<>
          <Composer
            onPost={async (t) => {
              try {
                const at = localStorage.getItem('accessToken') || ''
                await fetch(`${API_BASE}/posts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
                  credentials: 'include',
                  body: JSON.stringify({ text: t }),
                })
                await loadFeed()
              } catch {}
            }}
          />
          {posts.map((p) => (
            <Tweet
              id={p.id}
              key={p.id || `${p.username}-${p.createdAt}`}
              fullName={p.userFullName}
              username={p.username}
              text={p.text}
              created_at={p.createdAt}
              likes={p.likes}
              retweets={p.retweets}
              replies={p.replies}
              views={p.views}
            />
          ))}
        </>}
        right={
        <div style={{
          position: "fixed",
          top: "12%",
          overflowY: "auto",
          width: "25%"
        }}><Trends/></div>}
      />
      <style>{`
        .top-nav { transition: box-shadow 0.2s ease; }
      
        .search-bar:focus {
          border: 1px solid #a305a6;
          transform: scale(1.03);
          animation: popOut 0.6s ease forwards;
        }

        @keyframes popOut {
          0% { transform: scale(1); }
          100% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}