/**
 * App.tsx
 * Root client shell for Tweaker. Hosts top nav, left sidebar, center feed/profile/settings, and right trends.
 * Uses cookie-first session hydration, event-driven feed refresh, and responsive columns.
 */
import AppShell from "./components/AppShell";
import { SidebarCard } from "./components/SidebarCard";
import { WhoToFollow } from "./components/WhoToFollow";
import { Trends } from "./components/Trends";
import { Composer } from "./components/Composer";
import { Tweet } from "./components/Tweet";
import Profile from "./components/profile";
import { useEffect, useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import Settings from "./components/settings";

/**
 * Convert a Date or ISO string into a compact relative time.
 * Accepts precomputed compact strings like "5m" and returns them unchanged.
 */
function timeAgo(input: string | Date): string {
  // If caller already supplied a compact token like "5m" or "2h", return it as-is
  if (!input) return "";
  if (typeof input === "string" && /\b(s|m|h|d|w|yr)\b/.test(input)) return input;

  // Parse input into Date safely
  const dt = typeof input === "string" ? new Date(input) : input;
  if (!(dt instanceof Date) || isNaN(dt.getTime())) return String(input);

  // Compute diff in seconds, then scale up through minutes/hours/days/weeks/months/years
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

/**
 * Main application component.
 * - Reads session and current user profile from `/api/users/me` or access token fallback
 * - Loads global feed and exposes a global `window.loadFeed` for cross-component refresh
 * - Layout composed by <AppShell left/center/right>
 */
export default function App(){
  // Backend API origin. Prefer VITE_API_BASE; default to local dev server
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'

  // Minimal user shape for header, profile, and permissions
  const [currentUser, setCurrentUser] = useState<{
    fullName?: string;
    username?: string;
    bio?: string;
    link?: string;
    joinedDate?: string;
    following?: number;
    followers?: number;
    coverImage?: string;
    avatar?: string;
    verified?: boolean;
  } | null>(null)
  useEffect(() => {
    // Session/User hydration on initial load
    // 1) If cached in localStorage, use it immediately for snappy paint
    // 2) Otherwise try cookie-based session `/users/me` for full profile (avatar, verified)
    // 3) Fallback to Bearer token if present
    // credentials:'include' ensures cookies are sent for session auth
    (async () => {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          setCurrentUser(JSON.parse(raw));
          return;
        }

        // 1) Prefer cookie-based session to get full profile (includes verified, avatar, etc.)
        const r1 = await fetch(`${API_BASE}/users/me`, { credentials: 'include' });
        if (r1.ok) {
          const data = await r1.json();
          setCurrentUser(data);
          localStorage.setItem('user', JSON.stringify(data));
          return;
        }

        // 2) Fallback: Bearer access token
        const at = localStorage.getItem('accessToken');
        if (at) {
          const r2 = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${at}` },
            credentials: 'include',
          });
          if (r2.ok) {
            const { user } = await r2.json();
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      } catch {}
    })()
  }, [])

  // Normalized feed item used by <Tweet/>
  type FeedItem = {
    id: string;
    userFullName: string;
    username: string;
    avatar?: string;
    text: string;
    createdAt?: string;
    relative_time?: string;
    likes?: number;
    liked?: boolean;
    retweets?: number;
    replies?: number;
    views?: number | string;
  }
  const [posts, setPosts] = useState<FeedItem[]>([])

  // Feed ranking algorithms
  type Algo = 'most_comments'|'most_likes'|'followed_first'|'followers_first'|'longest_text';

  function pickAlgo(): Algo {
    const arr: Algo[] = ['most_comments','most_likes','followed_first','followers_first','longest_text'];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  async function fetchSocialSets(base: string){
    const opts: RequestInit = { credentials: 'include' };
    try {
      const [a,b] = await Promise.allSettled([
        fetch(`${base}/users/me/following`, opts),
        fetch(`${base}/users/me/followers`, opts),
      ]);
      const following = (a.status==='fulfilled' && a.value.ok ? await a.value.json() : []) as any[];
      const followers = (b.status==='fulfilled' && b.value.ok ? await b.value.json() : []) as any[];
      const toSet = (arr:any[]) => new Set(arr.map((u:any)=> u?.username || u?.user?.username || u));
      return { followingSet: toSet(following), followersSet: toSet(followers) };
    } catch {
      return { followingSet: new Set<string>(), followersSet: new Set<string>() };
    }
  }

  function orderByAlgo(items: FeedItem[], algo: Algo, followingSet: Set<string>, followersSet: Set<string>): FeedItem[] {
    const arr = [...items];
    switch(algo){
      // 1) Most comments first
      case 'most_comments':
        return arr.sort((a,b)=> (b.replies ?? 0) - (a.replies ?? 0));
      // 2) Most likes first
      case 'most_likes':
        return arr.sort((a,b)=> (b.likes ?? 0) - (a.likes ?? 0));
      // 3) People you follow first
      case 'followed_first':
        return arr.sort((a,b)=> {
          const af = followingSet.has(a.username) ? 1 : 0;
          const bf = followingSet.has(b.username) ? 1 : 0;
          if (bf !== af) return bf - af;
          return 0;
        });
      // 4) People who follow you first
      case 'followers_first':
        return arr.sort((a,b)=> {
          const af = followersSet.has(a.username) ? 1 : 0;
          const bf = followersSet.has(b.username) ? 1 : 0;
          if (bf !== af) return bf - af;
          return 0;
        });
      // 5) Longest text first
      case 'longest_text':
        return arr.sort((a,b)=> (b.text?.length || 0) - (a.text?.length || 0));
      default:
        return arr;
    }
  }

  /**
   * Fetch ALL posts by walking the cursor until exhausted and normalize to <Tweet/> props.
   */
  async function loadFeed() {
    try {
      const base = `${API_BASE}/posts/feed/global`;
      const all: any[] = [];
      let cursor: string | null = null;

      for (let i = 0; i < 50; i++) {
        const url = cursor ? `${base}?cursor=${encodeURIComponent(cursor)}` : base;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('feed_failed');
        const data = await res.json();
        const page = Array.isArray(data?.items) ? data.items : [];
        all.push(...page);
        cursor = data?.nextCursor || null;
        if (!cursor) break;
      }

      const mapped: FeedItem[] = all.map((it: any) => ({
        id: String(it?.id || ''),
        userFullName: it?.user?.fullName || it?.userFullName || it?.username || 'Unknown',
        username: it?.user?.username || it?.username || 'unknown',
        avatar: it?.user?.avatar ?? it?.avatar ?? '',
        text: it?.text || '',
        createdAt: it?.relative_time || it?.created_at || it?.createdAt || '',
        likes: typeof it?.like_count === 'number' ? it.like_count : (typeof it?.likes === 'number' ? it.likes : 0),
        liked: !!(it?.liked),
        retweets: typeof it?.repost_count === 'number' ? it.repost_count : (it?.retweets ?? 0),
        replies: typeof it?.reply_count === 'number' ? it.reply_count : (it?.replies ?? 0),
        views: typeof it?.view_count === 'number' ? it.view_count : (it?.views ?? 0),
      }));

      // Pick one of five algorithms at random each time we load
      const algo = pickAlgo();
      const { followingSet, followersSet } = await fetchSocialSets(API_BASE);
      const ordered = orderByAlgo(mapped, algo, followingSet, followersSet);
      setPosts(ordered);
    } catch (e) {
      console.error('loadFeed error', e);
      setPosts([]);
    }
  }

  // Initial feed load
  useEffect(() => { loadFeed() }, [])
  // Expose a global refresher used by Composer and other emitters
  useEffect(() => {
    (window as any).loadFeed = () => loadFeed();
    return () => {
      delete (window as any).loadFeed;
    };
  }, []);
  // Listen for CustomEvent('feed:refresh') and reload
  useEffect(() => {
    const h = () => loadFeed();
    window.addEventListener('feed:refresh', h as unknown as EventListener);
    return () => window.removeEventListener('feed:refresh', h as unknown as EventListener);
  }, []);

  // UI state: active page, settings page toggle, and theme
  const [active, setActive] = useState<"home"|"messages"|"notifications"|"moment"|"profile">("home");
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode] = useState(localStorage.getItem("theme") === "dark");

  // Apply theme to <html data-theme> and persist choice
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div>  
      {/* Sticky translucent header: logo, search, top nav tabs, profile pill, settings icon */}
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
          {/* Logo with circular background */}
          <img src="/logos/logo.svg" alt="Twitter" width={45} height={45} style={{ borderRadius: "50%", backgroundColor: "transparent",}}/>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--primary)", fontWeight: "bold" }}>Tweaker</h1>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {/* Search bar with absolute icon + padded input for icon space */}
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
              onClick={() => {
                setActive("home");
                setShowSettings(false);
              }} // set active tab and reset settings
            >
              <img src="/icons/home.svg" alt="Home" width={22} height={22} />
              {active === "home" && <span style={{ fontSize: "13px", color: "#333" }}>Home</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("moment")} // set active tab
            >
              <img src="/icons/moment.svg" alt="Moment" width={22} height={22} />
              {active === "moment" && <span style={{ fontSize: "13px", color: "#333" }}>Moment</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("messages")} // set active tab
            >
              <img src="/icons/message.svg" alt="Messages" width={22} height={22} />
              {active === "messages" && <span style={{ fontSize: "13px", color: "#333" }}>Messages</span>}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              onClick={() => setActive("notifications")} // set active tab
            >
              <img src="/icons/notification.svg" alt="Notifications" width={22} height={22} />
              {active === "notifications" && <span style={{ fontSize: "13px", color: "#333" }}>Notifications</span>}
            </div>
          </div>
          {/* Profile pill: avatar, verified badge, and username with nowrap */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Vertical separator */}
              <div style={{
                  width: "1.5px",
                  height: "30px",}}
              />
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "999px", background: "var(--panel-alt)", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                title="View profile"
                onClick={() => { setActive('profile'); setShowSettings(false); }}
              >
                  <img
                      src={currentUser?.avatar || "/images/avatar.png"}
                      alt="Profile"
                      width={28}
                      height={28}
                      style={{ borderRadius: "50%" }}
                  />
                  <span style={{ fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                      {currentUser?.fullName || currentUser?.username || 'Guest'}
                      {currentUser?.verified && <FaCheckCircle size={16} color="var(--primary)" />}
                  </span>
              </div>
              <img
                src="/icons/setting.png"
                alt="Settings"
                width={22}
                height={22}
                style={{ cursor: "pointer", marginRight: "2%", }}
                onClick={() => setShowSettings(true)} // open settings page with animation
              />
          </div>
        </div>
      </nav>
      <div style={{ height: "60px" }} />
      {/* Three-column layout. Left is fixed sidebar, center is route content, right is supplemental (Trends). */}
      <AppShell
        left={
        <div style={{ 
          // Fixed sidebar to remain visible on scroll
          position: "fixed",
          top: "10%",
          overflowY: "auto",
          width: "22%"
        }}>
          
          {/* WhoToFollow hidden when settings is open */}
          {!showSettings && <WhoToFollow />}
        </div>
      }
        center={
          <>
          {/* Conditional rendering: settings page supersedes others */}
          {showSettings ? (
              
                <Settings />
  
          ) : active === "home" ? (
            <>
              {/* Home: Compose new tweet + feed */}
              <Composer />
              {posts.map((p) => (
                <Tweet
                  id={p.id}
                  key={p.id || `${p.username}-${p.createdAt}`}
                  fullName={p.userFullName}
                  username={p.username}
                  avatar={p.avatar}
                  text={p.text}
                  created_at={p.createdAt}
                  likes={p.likes}
                  retweets={p.retweets}
                  replies={p.replies}
                  views={p.views}
                  liked={p.liked}
                />
              ))}
            </>
          ) : active === "profile" ? (
            // Profile page shows current user profile details
            <Profile
              fullName={currentUser?.fullName || currentUser?.username || "Guest"}
              verified={currentUser?.verified}
              username={currentUser?.username || "guest"}
              bio={currentUser?.bio || ""}
              link={currentUser?.link || undefined}
              following={currentUser?.following ?? 0}
              followers={currentUser?.followers ?? 0}
              coverImage={currentUser?.coverImage || undefined}
              avatar={currentUser?.avatar || undefined}
            />
          ) : null}
          </>
        }
        right={
          // Right column shows on Home and Profile. Hidden on Settings.
          !showSettings && (active === "home" || active === "profile") && (
            <div style={{
              position: "fixed",
              top: "12%",
              overflowY: "auto",
              width: "25%"
            }}>
              <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
                <Trends />
                <footer
                  style={{
                    marginTop: "20%",
                    fontSize: "12px",
                    color: "var(--muted)",
                    textAlign: "center",
                    lineHeight: "1.6",
                  }}
                >
                  {/* Static informational links about the app and policies */}
                  <span>About</span> | <span>Help</span> | <span>Privacy Policy</span> |{" "}
                  <span>Terms of Service</span> | <span>Cookie Policy</span> |{" "}
                  <span>IP Address Policy</span>
                  <div style={{ marginTop: "8px" }}>© 2025 Tweaker from Nyxel</div>
                </footer>
              </div>
            </div>
          )
        }
      />

    </div>
  );
}