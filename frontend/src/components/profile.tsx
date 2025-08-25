import { FaCheckCircle } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Tweet from "./Tweet";

interface ProfileProps {
  fullName: string;
  username: string;
  bio: string;
  link?: string;
  following: number;
  followers: number;
  coverImage?: string;
  avatar?: string;
  verified?: boolean;
}

const Profile: React.FC<ProfileProps> = ({
  fullName,
  username,
  bio,
  link,
  following,
  verified = true,
  followers,
  coverImage,
  avatar,
}) => {
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [posts, setPosts] = useState<any[]>([]);

  // Local display state derived from props
  const [displayName, setDisplayName] = useState(fullName);
  const [displayBio, setDisplayBio] = useState(bio);
  const [displayLink, setDisplayLink] = useState(link || "");

  // Edit modal visibility and form fields
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editBio, setEditBio] = useState(displayBio);
  const [editWebsite, setEditWebsite] = useState(displayLink);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media state (cover + avatar)
  const [displayCover, setDisplayCover] = useState<string | undefined>(coverImage);
  const [displayAvatar, setDisplayAvatar] = useState<string | undefined>(avatar);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [displayFollowing, setDisplayFollowing] = useState<number>(following);
  const [displayFollowers, setDisplayFollowers] = useState<number>(followers);
  const [meUsername, setMeUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDisplayName(fullName);
    setDisplayBio(bio);
    setDisplayLink(link || "");
    setDisplayCover(coverImage);
    setDisplayAvatar(avatar);
    setDisplayFollowing(following);
    setDisplayFollowers(followers);
  }, [fullName, bio, link, coverImage, avatar, following, followers]);

  // Fetch live profile data from backend
  useEffect(() => {
    (async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
        const { data } = await axios.get(`${base}/users/me`, { withCredentials: true });
        if (!data) return;
        if (typeof data.fullName === "string") setDisplayName(data.fullName);
        if (typeof data.bio === "string") setDisplayBio(data.bio);
        if (typeof data.link === "string") setDisplayLink(data.link);
        if (typeof data.coverImage === "string") setDisplayCover(data.coverImage);
        if (typeof data.avatar === "string") setDisplayAvatar(data.avatar);
        if (typeof data.following === "number") setDisplayFollowing(data.following);
        if (typeof data.followers === "number") setDisplayFollowers(data.followers);
        if (typeof data.username === "string") setMeUsername(data.username);
      } catch (e) {
        console.error("fetch /users/me failed", e);
      }
    })();
  }, []);

  // Live update follow/followers without refresh
  useEffect(() => {
    const onFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { target?: string; isFollowing?: boolean; delta?: number } | undefined;
      if (!detail) return;
      const delta = typeof detail.delta === 'number' ? detail.delta : (detail.isFollowing ? 1 : -1);

      // If viewing my own profile, update Following count
      if (meUsername && meUsername === username) {
        setDisplayFollowing((n) => Math.max(0, n + delta));
      }

      // If viewing the target user's profile, update their Followers count
      if (detail.target && detail.target === username) {
        setDisplayFollowers((n) => Math.max(0, n + delta));
      }
    };

    window.addEventListener('follow:changed', onFollowChanged as EventListener);
    return () => window.removeEventListener('follow:changed', onFollowChanged as EventListener);
  }, [meUsername, username]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
        const { data } = await axios.get(`${base}/posts/user/${username}`);
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        setPosts(list);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      }
    };
    fetchPosts();
  }, [username]);

  useEffect(() => {
    if (!showEdit) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showEdit]);

  const linkText = (() => {
    if (!displayLink) return null;
    try { return new URL(displayLink).hostname.replace(/^www\./, ""); } catch { return displayLink; }
  })();

  return (<>
    <div className="panel" style={{ fontFamily: "Inter, sans-serif", color: "white", }}>
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          height: "200px",
          backgroundColor: "#333",
          backgroundImage: displayCover ? `url(${displayCover})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "2em",
        }}
      />

      {/* Profile Avatar */}
      <div style={{ position: "relative", padding: "0 16px" }}>
        <img
          src={displayAvatar || "/images/avatar.png"}
          alt="avatar"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: "4px solid black",
            position: "relative",
            top: "-60px",
            pointerEvents: "none",
            zIndex: 1,
            objectFit: "cover"
          }}
        />
      </div>

      {/* Header actions */}
     <div style={{ display:'flex', justifyContent:'flex-end', padding:'0 16px', marginTop:-40, position:'relative', zIndex:5 }}>
        <button
          type="button"
          onClick={() => {
            console.log("✅ Edit profile button fired");
            setEditName(displayName);
            setEditBio(displayBio);
            setEditWebsite(displayLink);
            setShowEdit(true);
          }}
          style={{
            background: '#e6e7e9',
            color: '#111',
            padding: '8px 14px',
            borderRadius: "2em",
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          Edit profile
        </button>
      </div>

      {/* Profile Info */}
      <div style={{ padding: "0 16px", marginTop: "-40px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--bold-text)" }}>
          {displayName}
          {verified && <FaCheckCircle size={16} color="var(--primary)" />}
        </h2>
        <p style={{ color: "var(--muted)", margin: "4px 0" }}>@{username}</p>
        {displayBio && <p style={{ color: "var(--muted)", margin: "8px 0" }}>{displayBio}</p>}

        {/* Extra Info */}
        <div style={{ color: "var(--muted)", fontSize: "14px" }}>
          {displayLink && (
            <p>
              🔗{" "}
              <a href={displayLink} target="_blank" rel="noopener noreferrer">
                {linkText}
              </a>
            </p>
          )}
        </div>

        {/* Following / Followers */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "48px",
            fontSize: "18px",
            marginTop: "16px",
          }}
        >
          <span>
            <button
              className="btn"
              style={{ fontSize: "18px" }}
              onClick={async () => {
                try {
                  const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
                  const { data } = await axios.get(`${base}/users/${username}/relationship`, { withCredentials: true });
                  console.log("Following list clicked. Relationship data:", data);
                  // TODO: show modal with list of following users
                  alert("Following list modal placeholder");
                } catch (e) {
                  console.error("Error loading following list", e);
                }
              }}
            >
              {displayFollowing} Following
            </button>
          </span>
          <span>
            <button
              className="btn"
              style={{ fontSize: "18px" }}
              onClick={async () => {
                try {
                  const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
                  const { data } = await axios.get(`${base}/users/${username}/relationship`, { withCredentials: true });
                  console.log("Followers list clicked. Relationship data:", data);
                  // TODO: show modal with list of followers
                  alert("Followers list modal placeholder");
                } catch (e) {
                  console.error("Error loading followers list", e);
                }
              }}
            >
              {displayFollowers} Followers
            </button>
          </span>
        </div>
      </div>

      {/* Tabs (Posts, Likes) */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <button
            type="button"
            onClick={() => setTab('posts')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: tab === 'posts' ? 'var(--primary)' : 'gray',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              borderBottom: tab === 'posts' ? '2px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setTab('likes')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              color: tab === 'likes' ? 'var(--primary)' : 'gray',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              borderBottom: tab === 'likes' ? '2px solid var(--primary)' : '3px solid transparent'
            }}
          >
            Likes
          </button>
        </div>

        {/* Tab content placeholder */}
        <div style={{ padding: '12px 16px', color: 'gray' }}>
          {tab === 'posts' ? (
            posts.length === 0 ? (
              <div>No posts yet.</div>
            ) : (
              posts.map((p: any) => (
                <Tweet
                  key={p.id || p._id}
                  id={p.id || p._id}
                  fullName={p?.userFullName || p?.user?.fullName || fullName}
                  username={p?.username || p?.user?.username || username}
                  avatar={p?.avatar || p?.user?.avatar || undefined}
                  text={p?.text}
                  created_at={p?.relative_time || p?.createdAt}
                  likes={
                    typeof p?.likes === 'number'
                      ? p.likes
                      : typeof p?.like_count === 'number'
                      ? p.like_count
                      : Array.isArray(p?.likedBy)
                      ? p.likedBy.length
                      : 0
                  }
                  liked={!!p?.liked}
                  retweets={typeof p?.retweets === 'number' ? p.retweets : (typeof p?.repost_count === 'number' ? p.repost_count : 0)}
                  replies={typeof p?.replies === 'number' ? p.replies : (typeof p?.reply_count === 'number' ? p.reply_count : 0)}
                  views={typeof p?.views === 'number' ? p.views : (typeof p?.view_count === 'number' ? p.view_count : 0)}
                />
              ))
            )
          ) : (
            <div>No likes yet.</div>
          )}
        </div>
      </div>

      {showEdit &&
  createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowEdit(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 650,
          width: "92%",
          margin: "6vh auto",
          background: "#fff",
          borderRadius: "2em",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "84vh",
        }}
      >
        {/* Header with Save button */}
        <div
          style={{
            position: "sticky",
            top: 0,
            display: "flex",
            alignItems: "center",
            fontSize: 16,
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(199,157,200,0.1)",
          }}
        >
          <strong style={{ fontSize: 16, color: "#111" }}>Edit profile</strong>
          <button
            className="btn"
            type="button"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                const base = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";
                const form = new FormData();
                if (editName?.trim()) form.append("fullName", editName.trim());
                if (typeof editBio === "string") form.append("bio", editBio);
                if (typeof editWebsite === "string") form.append("link", editWebsite);
                if (editCoverFile) form.append("cover", editCoverFile);
                if (editAvatarFile) form.append("avatar", editAvatarFile);

                const { data } = await axios.put(`${base}/users/me`, form, {
                  withCredentials: true,
                  headers: { "Content-Type": "multipart/form-data" },
                });

                // Hydrate UI from server response
                setDisplayName(data?.fullName ?? editName ?? displayName);
                setDisplayBio(data?.bio ?? editBio ?? "");
                setDisplayLink(data?.link ?? editWebsite ?? "");
                setDisplayCover(data?.coverImage ?? displayCover ?? undefined);
                setDisplayAvatar(data?.avatar ?? displayAvatar ?? undefined);

                // Clear temp previews and close
                setEditCoverPreview(null);
                setEditAvatarPreview(null);
                setShowEdit(false);
              } catch (e) {
                console.error("profile update failed", e);
                setError("Update failed. Please try again.");
              } finally {
                setSaving(false);
              }
            }}
            style={{
              background: saving ? "#bbb" : "var(--bold-text)",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Body with media editors + form */}
        <div style={{ padding: 16, overflowY: "auto" }}>
          {/* Cover editor */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 180,
              borderRadius: 16,
              background: "#111",
              backgroundImage:
                editCoverPreview || displayCover
                  ? `url(${editCoverPreview || displayCover})`
                  : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              marginBottom: 48,
            }}
          >
            {/* Upload cover button */}
            <label
              htmlFor="edit-cover-input"
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
              title="Change cover photo"
            >
              +
            </label>
            <input
              id="edit-cover-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setEditCoverFile(f);
                if (f) setEditCoverPreview(URL.createObjectURL(f));
              }}
            />

            {/* Avatar editor overlay */}
            <div
              style={{
                position: "absolute",
                left: 16,
                bottom: -40,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={editAvatarPreview || displayAvatar || "/images/avatar.png"}
                  alt="avatar-preview"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: "4px solid #fff",
                    objectFit: "cover"
                  }}
                />
                <label
                  htmlFor="edit-avatar-input"
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    objectFit: "cover",
                    fontSize: 18,
                  }}
                  title="Change profile photo"
                >
                  +
                </label>
                <input
                  id="edit-avatar-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none", objectFit: "cover" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setEditAvatarFile(f);
                    if (f) setEditAvatarPreview(URL.createObjectURL(f));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Text fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 16, color: "var(--bold-text)" }}>
                Full Name
              </span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  border: "1px solid #e6e8eb",
                  outline: "none",
                  fontSize: 16,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = "1px solid var(--primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = "1px solid #e6e8eb")
                }
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 16, color: "var(--bold-text)" }}>Bio</span>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={displayBio || "Tell people about yourself"}
                rows={4}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  border: "1px solid #e6e8eb",
                  resize: "vertical",
                  outline: "none",
                  fontSize: 16,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = "1px solid var(--primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = "1px solid #e6e8eb")
                }
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 16, color: "var(--bold-text)" }}>
                Website
              </span>
              <input
                type="url"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder={displayLink || "https://example.com"}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  border: "1px solid #e6e8eb",
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontSize: 16
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = "1px solid var(--primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = "1px solid #e6e8eb")
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
</div>
      {error &&
        createPortal(
          <div
            onClick={() => setError(null)}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              zIndex: 10000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                color: "#111",
                minWidth: 300,
                maxWidth: 420,
                borderRadius: 12,
                padding: "18px 20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Update failed</div>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 18 }}>
                {typeof error === 'string' ? error : 'Please try again.'}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9999,
                  padding: "8px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
</> );
}

export default Profile;