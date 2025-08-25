import React, { useEffect, useRef, useState } from "react";

type MiniUser = {
  username: string;
  fullName: string;
  avatar?: string | null;
  verified?: boolean;
  bio?: string | null;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
};

type BiohoverProps = {
  /** The username to fetch/show (without @) */
  username: string;
  /** Rendered trigger. If omitted, we render @username */
  children?: React.ReactNode;
  /** Optional override API base */
  apiBase?: string;
  /** Called when user clicks the card to navigate */
  onNavigate?: (username: string) => void;
  /** Preferred placement */
  placement?: "top" | "bottom";
};

/**
 * Biohover
 * Wrap any inline element. On hover, shows a small profile card with avatar,
 * follow/unfollow button, bio, and follower/following counts.
 * Clicking anywhere on the card navigates to the user's profile.
 */
const Biohover: React.FC<BiohoverProps> = ({
  username,
  children,
  apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000/api",
  onNavigate,
  placement = "bottom",
}) => {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<MiniUser | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Show/hide timers to prevent flicker when moving from trigger → card
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  function clearTimers() {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }

  function computePosition() {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const margin = 8;
    const cardWidth = 360;
    const left = Math.min(Math.max(r.left, 12), Math.max(12, window.innerWidth - cardWidth - 12));
    const top = placement === "top" ? r.top - margin : r.bottom + margin;
    setCoords({ top: Math.max(12, top), left });
  }

  async function fetchMini(u: string) {
    setLoading(true);
    setErr(null);
    try {
      // Try a compact endpoint first, then fall back to full user endpoint.
      const opts: RequestInit = { credentials: "include" };
      const res1 = await fetch(`${apiBase}/users/${encodeURIComponent(u)}/mini`, opts);
      let data: any;
      if (res1.ok) {
        data = await res1.json();
      } else {
        const res2 = await fetch(`${apiBase}/users/${encodeURIComponent(u)}`, opts);
        if (!res2.ok) throw new Error("user_fetch_failed");
        data = await res2.json();
      }

      // Normalize various shapes
      const makeAbsolute = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        try {
          const base = new URL(apiBase);
          return base.origin + url;
        } catch {
          return url;
        }
      };

      const normalized: MiniUser = {
        username:
          data?.username ||
          data?.user?.username ||
          data?.handle ||
          u,
        fullName:
          data?.fullName ||
          data?.user?.fullName ||
          data?.name ||
          data?.full_name ||
          u,
        avatar: makeAbsolute(
          data?.avatar ??
          data?.user?.avatar ??
          data?.avatarUrl ??
          data?.photo ??
          data?.image ??
          data?.profileImage ??
          null
        ),
        verified: !!(data?.verified ?? data?.user?.verified),
        bio:
          data?.bio ??
          data?.user?.bio ??
          data?.description ??
          null,
        followers:
          typeof data?.followers === "number"
            ? data.followers
            : Array.isArray(data?.followers)
            ? data.followers.length
            : typeof data?.followersCount === "number"
            ? data.followersCount
            : typeof data?.user?.followersCount === "number"
            ? data.user.followersCount
            : typeof data?.stats?.followers === "number"
            ? data.stats.followers
            : 0,
        following:
          typeof data?.following === "number"
            ? data.following
            : Array.isArray(data?.following)
            ? data.following.length
            : typeof data?.followingCount === "number"
            ? data.followingCount
            : typeof data?.user?.followingCount === "number"
            ? data.user.followingCount
            : typeof data?.stats?.following === "number"
            ? data.stats.following
            : 0,
        isFollowing: !!(data?.isFollowing),
      };
      setUser(normalized);
    } catch (e) {
      setErr("Failed to load");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function openCard() {
    clearTimers();
    computePosition();
    showTimer.current = window.setTimeout(() => {
      setOpen(true);
      if (!user && !loading) fetchMini(username);
    }, 120);
  }

  function closeCard() {
    clearTimers();
    hideTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  useEffect(() => {
    function onScroll() {
      if (open) computePosition();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimers();
    };
  }, [open]);

  async function toggleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) return;
    const target = `${apiBase}/users/${encodeURIComponent(user.username)}/follow`;
    const opts: RequestInit = {
      method: user.isFollowing ? "DELETE" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    };
    // optimistic
    setUser({ ...user, isFollowing: !user.isFollowing });
    try {
      const res = await fetch(target, opts);
      if (!res.ok) throw new Error("follow_failed"); // revert on failure
    } catch {
      setUser({ ...user, isFollowing: !user.isFollowing });
    }
  }

  function handleNavigate() {
    if (onNavigate) return onNavigate(username);
    // fallback: navigate to SPA route if present, else hard link
    if ((window as any).appNavigate) {
      (window as any).appNavigate({ type: "profile", username });
    } else {
      window.location.href = `/profile/${encodeURIComponent(username)}`;
    }
  }

  const Trigger = (
    <span
      ref={triggerRef}
      onMouseEnter={openCard}
      onMouseLeave={closeCard}
      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
    >
      {children ?? <span style={{ color: "var(--primary)" }}>@{username}</span>}
    </span>
  );

  const Card = open ? (
    <div
      ref={cardRef}
      onMouseEnter={openCard}
      onMouseLeave={closeCard}
      onClick={handleNavigate}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: 360,
        background: "var(--panel, #fff)",
        color: "var(--text, #111)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,.16), 0 1px 0 rgba(0,0,0,.06) inset",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: 14,
        zIndex: 1000,
        backdropFilter: "saturate(120%) blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      role="dialog"
      aria-label={`Profile preview of ${username}`}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={user?.avatar || "/icons/user.svg"}
          alt={user?.fullName || username}
          width={56}
          height={56}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            objectFit: "cover",
            background: "#e9e9e9",
            flex: "0 0 auto",
          }}
        />
        <div style={{ marginLeft: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.fullName || username}
            </span>
            {user?.verified ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)">
                <path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z" />
              </svg>
            ) : null}
          </div>
          <div style={{ color: "var(--muted,#666)" }}>@{user?.username || username}</div>
        </div>
        {(user?.username !== (import.meta.env.VITE_CURRENT_USER || (window as any).currentUser?.username)) && (
          <button 
            onClick={toggleFollow}
            style={{
              gap: "8px",
              padding: "8px 14px",
              height: 44,
              marginLeft: "auto",
              border: 0,
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              background: user?.isFollowing ? "var(--bg)" : "var(--bold-text,#7a2fd0)",
              color: user?.isFollowing ? "var(--bold-text)" : "var(--bg)",
            }}
          >
            {user?.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Bio */}
      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
        {loading ? "Loading…" : err ? <span style={{ color: "#c00" }}>{err}</span> : (user?.bio || "")}
      </div>

      {/* Counts */}
      <div style={{ display: "flex", gap: 18, marginTop: 12, color: "var(--muted,#666)", fontSize: 14 }}>
        <div><b style={{ color: "var(--text,#111)" }}>{user?.following ?? 0}</b> Following</div>
        <div><b style={{ color: "var(--text,#111)" }}>{user?.followers ?? 0}</b> Followers</div>
      </div>

      {/* Foot */}
      <div style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 600, color: "var(--muted,#666)", fontSize: 14 }}>Profile Summary</span>
      </div>
    </div>
  ) : null;

  return (
    <>
      {Trigger}
      {Card}
    </>
  );
};

export default Biohover;
