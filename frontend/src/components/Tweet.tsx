import { FaRegHeart, FaRegComment, FaRetweet, FaRegBookmark, FaCheckCircle } from "react-icons/fa";
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

  const [showReply, setShowReply] = useState(false); // reply modal
  const [showThread, setShowThread] = useState(false); // thread modal (shows comments list)
  const [replyCount, setReplyCount] = useState<number>(replies ?? 0);
  const [liked, setLiked] = useState(false);
  const [likeHovered, setLikeHovered] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [retweetHovered, setRetweetHovered] = useState(false);
  const [retweetCount, setRetweetCount] = useState<number>(retweets ?? 0);
  const [likeCount, setLikeCount] = useState<number>(likes ?? 0);
  const hasId = Boolean(id);

  // Lock body scroll when thread modal is open
  useEffect(() => {
    if (!showThread) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showThread]);

  // Close thread modal on Escape
  useEffect(() => {
    if (!showThread) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowThread(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showThread]);

  const displayName = fullName ?? 'Unknown'
  const displayHandle = username ?? 'unknown'
  const content = text ?? ''
  const when = created_at ?? ''

  return (
    <article
      className="panel"
      style={{ padding: 16, marginTop: 12, cursor: 'pointer' }}
      onClick={() => hasId && setShowThread(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && hasId) {
          e.preventDefault();
          setShowThread(true);
        }
      }}
    >
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
          <div
            style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8, color: "var(--muted)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left side icons */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "80%" }}>
            <div
              className="action-group"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => { if (!hasId) return; setShowReply(true); onReply?.(); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!hasId) return;
                  setShowReply(true);
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
              <div
                className="action-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color:
                    retweeted || retweetHovered
                      ? "green"
                      : "var(--muted)",
                  fontWeight: retweeted ? 700 : undefined,
                }}
                onMouseEnter={() => setRetweetHovered(true)}
                onMouseLeave={() => setRetweetHovered(false)}
                onClick={() => {
                  setRetweeted((prev) => {
                    if (prev) {
                      setRetweetCount((c) => c - 1);
                      return false;
                    } else {
                      setRetweetCount((c) => c + 1);
                      return true;
                    }
                  });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setRetweeted((prev) => {
                      if (prev) {
                        setRetweetCount((c) => c - 1);
                        return false;
                      } else {
                        setRetweetCount((c) => c + 1);
                        return true;
                      }
                    });
                  }
                }}
                aria-label="Retweet"
                title="Retweet"
              >
                <div className="icon-wrap">
                  <span className="action-icon"><FaRetweet /></span>
                  <span className="icon-label">Retweet</span>
                </div>
                <span className="action-count">
                  {retweetCount >= 1000
                    ? `${(retweetCount / 1000).toFixed(retweetCount % 1000 === 0 ? 0 : 1)}K`
                    : retweetCount}
                </span>
              </div>
              <div
                className="action-group like-action"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color:
                    liked || likeHovered
                      ? "pink"
                      : "var(--muted)",
                  fontWeight: liked ? 700 : undefined,
                }}
                onMouseEnter={() => setLikeHovered(true)}
                onMouseLeave={() => setLikeHovered(false)}
                onClick={() => {
                  setLiked((prev) => {
                    if (prev) {
                      setLikeCount((c) => c - 1);
                      return false;
                    } else {
                      setLikeCount((c) => c + 1);
                      return true;
                    }
                  });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLiked((prev) => {
                      if (prev) {
                        setLikeCount((c) => c - 1);
                        return false;
                      } else {
                        setLikeCount((c) => c + 1);
                        return true;
                      }
                    });
                  }
                }}
                aria-label="Like"
                title="Like"
              >
                <div className="icon-wrap">
                  <span className="action-icon"><FaRegHeart /></span>
                  <span className="icon-label">Like</span>
                </div>
                <span className="action-count">
                  {likeCount >= 1000
                    ? `${(likeCount / 1000).toFixed(likeCount % 1000 === 0 ? 0 : 1)}K`
                    : likeCount}
                </span>
              </div>
              <div className="action-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                <span className="icon-label">Share</span>
              </div>
            </div>
          </div>
          {/* Thread modal: shows the list of comments for this tweet */}
          {showThread && hasId ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Thread"
              onMouseDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) setShowThread(false); }}
              onClick={(e) => { e.stopPropagation(); }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
    
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: 650,
                  width: '92%',
                  margin: '6vh auto',
                  background: '#fff',
                  borderRadius: '2em',
                  boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
                  overflow: 'hidden',
                  maxHeight: '80vh',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: "transparent",
                    backdropFilter: "blur(1.5px)",
                    WebkitBackdropFilter: "blur(1.5px)",
                    borderBottom: "1px solid rgba(199, 157, 200, 0.1)",
                    filter: "drop-shadow(-8px -10px 46px #0000005f)",
                    boxShadow: `
                      inset 6px 6px 0px -6px rgba(255, 255, 255, 0.7),
                      inset 0 0 8px 1px rgba(255, 255, 255, 0.7),
                      0 6px 12px rgba(88, 87, 87, 0.12),
                      0 8px 32px rgba(0, 0, 0, 0.15)
                    `,
                    zIndex: 1000,
                  }}
                >
                  <strong style={{ fontSize: 16 }}>Post</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowReply(true); }}
                      style={{ border: 'none', background: '#333', color: '#fff', borderRadius: '9999px', padding: '6px 14px', cursor: 'pointer' }}
                    >
                      Reply
                    </button>
                    <button onClick={() => setShowThread(false)} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <img src="/images/avatar.png" width={48} height={48} style={{ borderRadius: 999 }} alt="avatar" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--bold-text)' }}>{displayName}</span>
                        {verified && <FaCheckCircle size={16} color="var(--primary)" />}
                        <span style={{ color: 'var(--muted)', fontSize: 16 }}>@{displayHandle}</span>
                        {when ? <span style={{ color: 'var(--muted)' }}>·</span> : null}
                        {when ? <span style={{ color: 'var(--muted)', fontSize: 16 }}>{when}</span> : null}
                      </div>
                      <p style={{ margin: '8px 0 12px', fontSize: 16, lineHeight: 1.4, color: 'var(--text)', textAlign: 'left' }}>{content}</p>
                      {media && (
                        <img src={media} style={{ width: "100%", borderRadius: 12, display: "block", marginTop: 8 }} />
                      )}
                      <div
                        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8, color: "var(--muted)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Left side icons */}
                        <div style={{ display: "flex", justifyContent: "space-between", width: "80%" }}>
                          <div
                            className="action-group"
                            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                            onClick={() => { if (!hasId) return; setShowReply(true); onReply?.(); }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (!hasId) return;
                                setShowReply(true);
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
                          <div
                            className="action-group"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              color:
                                retweeted || retweetHovered
                                  ? "#0fff03ff"
                                  : "var(--muted)",
                              fontWeight: retweeted ? 700 : undefined,
                            }}
                            onMouseEnter={() => setRetweetHovered(true)}
                            onMouseLeave={() => setRetweetHovered(false)}
                            onClick={() => {
                              setRetweeted((prev) => {
                                if (prev) {
                                  setRetweetCount((c) => c - 1);
                                  return false;
                                } else {
                                  setRetweetCount((c) => c + 1);
                                  return true;
                                }
                              });
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setRetweeted((prev) => {
                                  if (prev) {
                                    setRetweetCount((c) => c - 1);
                                    return false;
                                  } else {
                                    setRetweetCount((c) => c + 1);
                                    return true;
                                  }
                                });
                              }
                            }}
                            aria-label="Retweet"
                            title="Retweet"
                          >
                            <div className="icon-wrap">
                              <span className="action-icon"><FaRetweet /></span>
                              <span className="icon-label">Retweet</span>
                            </div>
                            <span className="action-count">
                              {retweetCount >= 1000
                                ? `${(retweetCount / 1000).toFixed(retweetCount % 1000 === 0 ? 0 : 1)}K`
                                : retweetCount}
                            </span>
                          </div>
                          <div
                            className="action-group like-action"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              color:
                                liked || likeHovered
                                  ? "#ef1bd3ff"
                                  : "var(--muted)",
                              fontWeight: liked ? 700 : undefined,
                            }}
                            onMouseEnter={() => setLikeHovered(true)}
                            onMouseLeave={() => setLikeHovered(false)}
                            onClick={() => {
                              setLiked((prev) => {
                                if (prev) {
                                  setLikeCount((c) => c - 1);
                                  return false;
                                } else {
                                  setLikeCount((c) => c + 1);
                                  return true;
                                }
                              });
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setLiked((prev) => {
                                  if (prev) {
                                    setLikeCount((c) => c - 1);
                                    return false;
                                  } else {
                                    setLikeCount((c) => c + 1);
                                    return true;
                                  }
                                });
                              }
                            }}
                            aria-label="Like"
                            title="Like"
                          >
                            <div className="icon-wrap">
                              <span className="action-icon"><FaRegHeart /></span>
                              <span className="icon-label">Like</span>
                            </div>
                            <span className="action-count">
                              {likeCount >= 1000
                                ? `${(likeCount / 1000).toFixed(likeCount % 1000 === 0 ? 0 : 1)}K`
                                : likeCount}
                            </span>
                          </div>
                          <div className="action-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="icon-wrap">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                  </svg>
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                            <span className="icon-label">Share</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Comments postId={id} showList={true} />
                </div>
              </div>
            </div>
          ) : null}

          {/* Reply modal, opened via the Reply action */}
          {showReply && hasId ? (
            <Comments postId={id} visible={true} onPosted={setReplyCount} onClose={() => setShowReply(false)} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default Tweet;