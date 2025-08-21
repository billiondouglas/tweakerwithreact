import { FaCheckCircle } from "react-icons/fa";
import { useEffect, useState, useCallback, useRef } from "react";

interface CommentItem {
  username: string;
  fullName: string;
  text: string;
  relative_time: string;
  created_at: string;
}

interface CommentsProps {
  postId: string;
  visible?: boolean;
  /** Optional: notify parent that reply_count changed */
  onPosted?: (newReplyCount: number) => void;
  /** Optional: called when modal is requested to close */
  onClose?: () => void;
  /** When true, render the inline list under the tweet */
  showList?: boolean;
}

interface PreviewPost {
  fullName?: string;
  username?: string;
  verified?: boolean;
  avatarUrl?: string;
  text?: string;
  created_at?: string;
}

function relTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000; // seconds
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}min ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  const days = Math.floor(diff/86400);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000";

export default function Comments({ postId, onPosted, visible = false, onClose, showList = false }: CommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewPost | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  if (!postId) {
    console.error("[Comments] missing postId");
    return null;
  }

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    const url = `${API_BASE}/comments/${postId}`;
    console.debug("[Comments] GET", url);
    try {
      setError(null);
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(`Load failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setComments(Array.isArray(data.items) ? data.items : []);
      if (typeof data.reply_count === "number" && onPosted) {
        onPosted(data.reply_count);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
      setError("Network error");
    }
  }, [postId, onPosted]);

  const fetchPreview = useCallback(async () => {
    if (!postId) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, { credentials: "include" });
      if (!res.ok) { setLoadingPreview(false); return; }
      const data = await res.json();
      // try common shapes
      const p = data.post || data || {};
      const user = p.user || {};
      setPreview({
        fullName: user.fullName ?? p.fullName ?? user.name,
        username: user.username ?? p.username,
        verified: !!(user.verified ?? p.verified),
        avatarUrl: user.avatarUrl ?? p.avatarUrl,
        text: p.text ?? p.content ?? "",
        created_at: p.createdAt ?? p.created_at,
      });
    } catch (_) {
      // ignore
    } finally {
      setLoadingPreview(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible, postId, fetchComments]);

  useEffect(() => {
    if (showList) fetchComments();
  }, [showList, postId, fetchComments]);

  useEffect(() => {
    if (visible) fetchPreview();
  }, [visible, fetchPreview]);

  // Modal: close on Escape
  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  const modalContentRef = useRef<HTMLDivElement>(null);

  // Handle new comment submission (POST /comments/:postId)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;

    try {
      setLoading(true);
      setError(null);
      const at = localStorage.getItem("accessToken") || "";
      if (!postId) {
        setError("Missing post id");
        setLoading(false);
        return;
      }
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (at) headers.Authorization = `Bearer ${at}`; // optional; cookies still work
      const res = await fetch(`${API_BASE}/comments/${postId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text }),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("Reply failed", res.status, body);
        setError(res.status === 401 ? "Session expired" : `Reply failed (${res.status})`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const added: CommentItem = data.comment || data; // backend returns { ok, reply_count, comment }

      // optimistic prepend
      setComments((prev) => [added, ...prev]);
      setNewComment("");

      // refresh from server to ensure consistency
      try { await fetchComments(); } catch {}

      if (onPosted) {
        const nextCount = typeof data.reply_count === "number" ? data.reply_count : comments.length + 1;
        onPosted(nextCount);
      }
    } catch (err) {
      console.error("Failed to post comment", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only close if click is on the backdrop itself, not inside modal box
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  }

  return (
    <>
      {visible && (
        <div
          className="comments-modal-backdrop"
          style={{
            position: "fixed",
            zIndex: 1000,
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.2s",
          }}
          onClick={handleBackdropClick}
        >
          <div
            ref={modalContentRef}
            className="comments-modal-box"
            style={{
              background: "#fff",
              borderRadius: "2em",
              padding: "32px 24px 20px 24px",
              minWidth: 350,
              maxWidth: 650,
              width: "100%",
              boxShadow: "0 6px 32px 0 rgba(0,0,0,0.18)",
              position: "relative",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={onClose}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                fontSize: 22,
                color: "#888",
                cursor: "pointer",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
              className="close-btn"
            >
              ×
            </button>
            {/* keep the existing modal inner content exactly as before: loader, preview + reply form */}
            <div className="comments-section" style={{ marginTop: 8 }}>
              {/* Loading + Preview + Reply form blocks remain unchanged here */}
              {loadingPreview && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--muted)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true">
                    <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm7.07 3.93a1 1 0 0 1 1.41 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.41l1.42-1.42zM21 11a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2zM6.34 6.34a1 1 0 0 1 0 1.41L4.93 9.17A1 1 0 1 1 3.51 7.76l1.41-1.42a1 1 0 0 1 1.42 0zM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2zm13.66 6.66a1 1 0 0 1-1.41 0l-1.42-1.41a1 1 0 0 1 1.41-1.42l1.42 1.42a1 1 0 0 1 0 1.41zM13 19a1 1 0 1 1-2 0v-2a1 1 0 0 1 2 0v2zM7.76 14.83a1 1 0 0 1-1.41 1.41L4.93 14.83a1 1 0 1 1 1.41-1.41l1.42 1.41z" fill="currentColor"></path>
                  </svg>
                  <span style={{ fontSize: 14 }}>Loading preview…</span>
                  <style>
                    {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
                  </style>
                </div>
              )}
              {/* Combined preview + reply layout with continuous vertical line */}
              {/* Keep the existing preview + reply block unchanged here */}
              {preview ? (
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  {/* Left rail: original avatar → vertical line → replying avatar */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
                    {/* Original post avatar */}
                    <img
                      src={preview.avatarUrl || "/images/avatar.png"}
                      alt="avatar"
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                    {/* Connector line – stretches only between the avatars */}
                    <div style={{ flex: 1, width: 2, background: "var(--muted)", marginTop: 4, marginBottom: 4 }} />
                    {/* Replying user avatar */}
                    <img
                      src={"/images/avatar.png"}
                      alt="me"
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginBottom: 52 }}
                    />
                  </div>

                  {/* Right column: preview meta/text + reply input and button */}
                  <div style={{ flex: 1 }}>
                    {/* Preview meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontWeight: 800, fontSize: 18, color: 'var(--bold-text)' }}>{preview.fullName || "Unknown"}</strong>
                      {preview.verified && <FaCheckCircle size={16} color="var(--primary)" />}
                      {preview.username && (
                        <span style={{ color: 'var(--muted)', fontSize: 16 }}>@{preview.username}</span>
                      )}
                      <span style={{ color: "var(--muted)" }}>·</span>
                      <span style={{ color: "var(--muted)", fontSize: 16 }}>{relTime(preview.created_at)}</span>
                    </div>
                    {preview.text && (
                      <div style={{ margin: '8px 0 12px', fontSize: 16, lineHeight: 1.4, color: 'var(--text)', textAlign: 'left' }}>
                        {preview.text}
                      </div>
                    )}
                    {preview.username && (
                      <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 15, textAlign: 'left' }}>
                        Replying to <span style={{ color: "var(--accent, #1d9bf0)" }}>@{preview.username}</span>
                      </div>
                    )}

                    {/* Reply form (no avatar here, avatar is in left rail) */}
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", margin: "12px 0" }}>
                      <input
                        type="text"
                        placeholder="Reply to this post…"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          textAlign: "left",
                          boxShadow: "none",
                          width: "100%",
                          display: "block",
                          resize: "none",
                          overflow: "hidden",
                          fontSize: 18,
                          minHeight: 40,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={loading || !newComment.trim()}
                        style={{
                          padding: "10px 14px",
                          border: "none",
                          borderRadius: "2em",
                          background: "var(--bold-text)",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: loading || !newComment.trim() ? "default" : "pointer",
                          opacity: loading || !newComment.trim() ? 0.7 : 1,
                          alignSelf: "flex-end",
                        }}
                      >
                        {loading ? "Posting…" : "Reply"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                // Fallback if preview is missing: keep existing simple form row with single avatar
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <img
                        src={"/images/avatar.png"}
                        alt="avatar"
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <input
                        type="text"
                        placeholder="Reply to this post…"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          textAlign: "left",
                          boxShadow: "none",
                          width: "100%",
                          display: "block",
                          resize: "none",
                          overflow: "hidden",
                          fontSize: 18,
                          minHeight: 40,
                        }}
                      />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !newComment.trim()}
                    style={{
                      padding: "10px 14px",
                      border: "none",
                      borderRadius: "2em",
                      background: "var(--bold-text)",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: loading || !newComment.trim() ? "default" : "pointer",
                      opacity: loading || !newComment.trim() ? 0.7 : 1,
                      alignSelf: "flex-end",
                    }}
                  >
                    {loading ? "Posting…" : "Reply"}
                  </button>
                </form>
              )}
              {error && (
                <div style={{ color: "#f00", fontSize: 13, marginBottom: 8 }}>{error}</div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {comments.map((c, idx) => (
                  <li key={idx} style={{ marginBottom: 10, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <strong style={{ color: "var(--text)" }}>{c.fullName}</strong>
                      <span style={{ color: "var(--muted)" }}>@{c.username}</span>
                      <span style={{ color: "var(--muted)", marginLeft: 6 }}>{c.relative_time}</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: 15, color: "var(--text)" }}>{c.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Inline comments list under the tweet (outside modal) */}
      {showList && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0" }}>
          {comments.map((c, idx) => (
            <li key={idx} style={{ marginBottom: 10, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <strong style={{ color: "var(--text)" }}>{c.fullName}</strong>
                <span style={{ color: "var(--muted)" }}>@{c.username}</span>
                <span style={{ color: "var(--muted)", marginLeft: 6 }}>{c.relative_time}</span>
              </div>
              <p style={{ margin: "4px 0", fontSize: 15, color: "var(--text)" }}>{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      <style>
        {`
          .close-btn:hover { background: #f3f3f3; }
        `}
      </style>
    </>
  );
}