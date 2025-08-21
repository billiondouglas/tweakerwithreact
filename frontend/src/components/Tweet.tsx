import { FaRegHeart, FaRegComment, FaRetweet, FaRegBookmark, FaCheckCircle, FaChartBar, FaShareSquare } from "react-icons/fa";
import { useState, useEffect } from "react";
import Comments from "./comments"

type TweetProps = {
  id: string;
  // Preferred from /posts API
  fullName?: string;      // e.g., "Jane Doe"
  username?: string;          // e.g., "janed"
  text?: string;              // post text
  created_at?: string;        // relative time like "2m ago"

  // Visuals and counters
  media?: string;
  verified?: boolean;
  replies?: number;
  retweets?: number;
  likes?: number;
  views?: string | number;
  onReply?: () => void;
}

export function Tweet(props: TweetProps) {
  const {
    id,
    fullName,
    username,
    text,
    created_at,
    media,
    verified = true,
    replies,
    retweets,
    likes,
    views,
    onReply,
  } = props

  const [showComments, setShowComments] = useState(false);
  const [replyCount, setReplyCount] = useState<number>(replies ?? 0);
  const hasId = Boolean(id);

  useEffect(() => {
    if (!showComments) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showComments]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowComments(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayName = fullName ?? 'Unknown'
  const displayHandle = username ?? 'unknown'
  const content = text ?? ''
  const when = created_at ?? ''

  return (
    <article className="panel" style={{ padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {/* Avatar */}
        <img src="/images/avatar.png" width={48} height={48} style={{ borderRadius: 999 }} alt="avatar" />

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--bold-text)' }}>{displayName}</span>
            {verified && <FaCheckCircle size={16} color="var(--primary)" />}
            <span style={{ color: 'var(--muted)', fontSize: 16 }}>@{displayHandle}</span>
            {when ? <span style={{ color: 'var(--muted)' }}>·</span> : null}
            {when ? <span style={{ color: 'var(--muted)', fontSize: 16 }}>{when}</span> : null}
          </div>

          {/* Body */}
          <p style={{ margin: '8px 0 12px', fontSize: 16, lineHeight: 1.4, color: 'var(--text)', textAlign: 'left' }}>{content}</p>

          {/* Optional media */}
          {media && (
            <img src={media} style={{ width: "100%", borderRadius: 12, display: "block", marginTop: 8 }} />
          )}

          {/* Actions row */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8, color: "var(--muted)" }}>
            {/* Left side icons */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "80%" }}>
            <div
              className="action-group"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => {
                if (!hasId) return;
                setShowComments(v => !v);
                onReply?.();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!hasId) return;
                  setShowComments(v => !v);
                  onReply?.();
                }
              }}
              aria-label="Reply"
              title="Reply"
            >
                <div className="icon-wrap">
                  <span className="action-icon"><FaRegComment /></span>
                  <span className="icon-label">Reply</span>
                </div>
                <span className="action-count">{replyCount}</span>
              </div>
              <div className="action-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="icon-wrap">
                  <span className="action-icon"><FaRetweet /></span>
                  <span className="icon-label">Retweet</span>
                </div>
                <span className="action-count">{retweets ?? 0}</span>
              </div>
              <div className="action-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="icon-wrap">
                  <span className="action-icon"><FaRegHeart /></span>
                  <span className="icon-label">Like</span>
                </div>
                <span className="action-count">{
                  typeof likes === 'number'
                    ? (likes >= 1000 ? `${(likes/1000).toFixed(likes % 1000 === 0 ? 0 : 1)}K` : likes)
                    : 0
                }</span>
              </div>
              <div className="action-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="icon-wrap">
                  <span className="action-icon"><FaChartBar /></span>
                  <span className="icon-label">Views</span>
                </div>
                <span className="action-count">{views ?? 0}</span>
              </div>
            </div>
            {/* Right side icons */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div className="icon-wrap">
                <span className="action-icon"><FaRegBookmark /></span>
                <span className="icon-label">Bookmark</span>
              </div>
              <div className="icon-wrap">
                <span className="action-icon"><FaShareSquare /></span>
                <span className="icon-label">Share</span>
              </div>
            </div>
          </div>
          {showComments && hasId ? (
            <Comments postId={id} visible={true} onPosted={setReplyCount} onClose={() => setShowComments(false)} />
          ) : null}
        </div>
      </div>
    </article>
  );
}