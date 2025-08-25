import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
  fullName: string;
  avatar?: string;
  isFollowing?: boolean;
}

const CAP = 20;

export function WhoToFollow() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";

        // 1) Get current user to exclude
        const meResp = await axios.get(`${base}/users/me`, { withCredentials: true });
        const me = meResp?.data;
        const meUsername: string | undefined = me?.username;

        // 2) Fetch full user list
        const allResp = await axios.get(`${base}/users`, { withCredentials: true });
        const list: User[] = Array.isArray(allResp.data) ? allResp.data : [];

        // 3) Filter out the logged-in user
        const filtered = meUsername ? list.filter(u => u.username !== meUsername) : list;

        const initial = filtered.map(u => ({ ...u, isFollowing: false }));

        // enrich with relationship for each user so state persists across refresh
        const enriched = await Promise.all(
          initial.map(async (u) => {
            try {
              const rel = await axios.get(`${base}/users/${u.username}/relationship`, { withCredentials: true });
              return { ...u, isFollowing: !!rel?.data?.isFollowing };
            } catch {
              return u; // leave default false on failure
            }
          })
        );

        setAllUsers(enriched);

        // 4) Compute initial visible items to fill viewport (row ≈ 72px, header ≈ 80px)
        const rowH = 72;
        const headerH = 80;
        const avail = Math.max(0, (window.innerHeight || 640) - headerH);
        const needed = Math.max(3, Math.min(CAP, Math.ceil(avail / rowH)));
        setVisibleCount(needed);
      } catch (e: any) {
        console.error("Error fetching suggested users:", e);
        setError("Unable to load suggestions");
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleUsers = useMemo(() => allUsers.slice(0, visibleCount), [allUsers, visibleCount]);
  const hasMore = visibleCount < allUsers.length;

  const toggleFollow = async (u: User) => {
    try {
      const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
      const url = `${base}/users/${u.username}/follow`;
      if (!u.isFollowing) {
        await axios.post(url, {}, { withCredentials: true });
        u.isFollowing = true;
      } else {
        await axios.delete(url, { withCredentials: true });
        u.isFollowing = false;
      }
      setAllUsers([...allUsers]);
    } catch (e) {
      console.error("toggleFollow error", e);
    }
  };

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        height: "90vh",
        overflowY: "scroll",
        display: "flex",
        flexDirection: "column",
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none" // IE/Edge
      }}
    >
      <div style={{ fontWeight: 700,
          color: "var(--bold-text)", 
          textAlign: "left", 
          position: "sticky",
          top: 0,
          marginTop: 0,
          background: "var(--panel, #fff)",
          zIndex: 2,
          paddingBottom: 8,
           }}>Who to follow</div>
      <div className="separator" />

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: 14, padding: "8px 0" }}>Loading…</div>
      )}

      {error && (
        <div style={{ color: "var(--danger)", fontSize: 14, padding: "8px 0" }}>{error}</div>
      )}

      {!loading && !error && visibleUsers.map((user: User) => (
        <div
          key={user.username}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 120px",
            alignItems: "center",
            width: "100%",
            margin: "16px 0",
            columnGap: "16px",
          }}
       >
          <div style={{ display: "flex", gap: 10, alignItems: "center",  minWidth: 0 }}>
            <img
              src={user.avatar || "/images/avatar.png"}
              width={40}
              height={40}
              alt="User avatar"
              style={{ borderRadius: "50%" }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "140px", overflow: "hidden" }}>
              <span style={{ fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.fullName}</span>
              <span style={{ color: "var(--muted)", marginLeft: "0px", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{user.username}</span>
            </div>
          </div>
          <button
            onClick={() => toggleFollow(user)}
            onMouseEnter={(e) => {
              if (user.isFollowing) {
                e.currentTarget.textContent = "Unfollow";
                e.currentTarget.style.background = "var(--danger)";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (user.isFollowing) {
                e.currentTarget.textContent = "Following";
                e.currentTarget.style.background = "#f2f2f2";
                e.currentTarget.style.color = "#111";
              }
            }}
            style={{
              width: "100%",
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              textAlign: "center",
              border: "none",
              borderRadius: 20,
              fontWeight: 600,
              cursor: "pointer",
              background: user.isFollowing ? "#f2f2f2" : "var(--bold-text)",
              color: user.isFollowing ? "#111" : "#fff",
              transition: "background 0.3s, color 0.3s",
              fontSize: 16,
            }}
          >
            {user.isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      ))}

      {/* See more pagination */}
      {!loading && !error && hasMore && (
        <div
          onClick={() => setVisibleCount(c => Math.min(CAP, c + 5))}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            color: "var(--primary)",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          See more
        </div>
      )}

      {/* Fallback link to a full page if you keep it */}
      {!loading && !error && !hasMore && (
        <Link
          to="/suggested"
          style={{
            display: "block",
            marginTop: "12px",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--primary)",
            cursor: "pointer",
            textAlign: "left",
            textDecoration: "none",
          }}
        >
          See all
        </Link>
      )}
      <style>
        {`
          .panel::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}